import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/database/client';
import { persistProofImage } from '@/services/proofs/proofImageStorage';
import { LocalProof } from '@/types/domain';

export async function saveLocalProof(input: Omit<LocalProof, 'localUuid' | 'syncStatus' | 'verificationStatus'>) {
  const db = getDatabase();
  const localUuid = Crypto.randomUUID();
  const imageUri = await persistProofImage(input.imageUri, localUuid);
  const proof: LocalProof = {
    ...input,
    imageUri,
    localUuid,
    syncStatus: 'QUEUED',
    verificationStatus: 'PENDING'
  };

  db.runSync(
    `INSERT INTO local_proofs (
      local_uuid,
      task_id,
      image_uri,
      latitude,
      longitude,
      location_accuracy,
      captured_at,
      remarks,
      task_version,
      report_title,
      report_text,
      sync_status,
      verification_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proof.localUuid,
      proof.taskId,
      proof.imageUri,
      proof.latitude,
      proof.longitude,
      proof.locationAccuracy ?? null,
      proof.capturedAt,
      proof.remarks ?? null,
      proof.taskVersion ?? null,
      proof.reportTitle ?? null,
      proof.reportText ?? null,
      proof.syncStatus,
      proof.verificationStatus
    ]
  );

  db.runSync(
    `INSERT INTO sync_queue (local_record_id, operation_type, payload, status)
     VALUES (?, 'CREATE_WORK_PROOF', ?, 'QUEUED')`,
    [localUuid, JSON.stringify(proof)]
  );

  return proof;
}

export function getPendingSyncProofs(options: { force?: boolean } = {}) {
  const db = getDatabase();
  const retryWindowClause = options.force ? '' : `AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)`;
  const statuses = options.force ? "'QUEUED', 'FAILED', 'RETRYING', 'CONFLICT'" : "'QUEUED', 'FAILED', 'RETRYING'";

  return db.getAllSync<{
    id: number;
    local_record_id: string;
    payload: string;
    retry_count: number;
    last_error: string | null;
  }>(
    `SELECT id, local_record_id, payload, retry_count, last_error
     FROM sync_queue
     WHERE status IN (${statuses})
       ${retryWindowClause}
     ORDER BY created_at ASC`
  );
}

export function getLocalProofs() {
  const db = getDatabase();

  return db.getAllSync<{
    local_uuid: string;
    task_id: string;
    image_uri: string;
    latitude: number;
    longitude: number;
    captured_at: string;
    report_title: string | null;
    report_text: string | null;
    sync_status: string;
    verification_status: string;
    last_error: string | null;
    next_retry_at: string | null;
    updated_at: string;
  }>(
    `SELECT
       local_proofs.local_uuid,
       local_proofs.task_id,
       local_proofs.image_uri,
       local_proofs.latitude,
       local_proofs.longitude,
       local_proofs.captured_at,
       local_proofs.report_title,
       local_proofs.report_text,
       local_proofs.sync_status,
       local_proofs.verification_status,
       sync_queue.last_error,
       sync_queue.next_retry_at,
       local_proofs.updated_at
     FROM local_proofs
     LEFT JOIN sync_queue ON sync_queue.local_record_id = local_proofs.local_uuid
     ORDER BY captured_at DESC`
  );
}

export function markProofUploading(queueId: number, localUuid: string) {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(`UPDATE sync_queue SET status = 'UPLOADING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [queueId]);
    db.runSync(`UPDATE local_proofs SET sync_status = 'UPLOADING', updated_at = CURRENT_TIMESTAMP WHERE local_uuid = ?`, [localUuid]);
  });
}

export function markProofSynced(queueId: number, localUuid: string) {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE sync_queue
       SET status = 'SYNCED', last_error = NULL, next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [queueId]
    );
    db.runSync(`UPDATE local_proofs SET sync_status = 'SYNCED', updated_at = CURRENT_TIMESTAMP WHERE local_uuid = ?`, [localUuid]);
  });
}

export function markProofSyncFailed(queueId: number, localUuid: string, error: string) {
  const db = getDatabase();
  const current = db.getFirstSync<{ retry_count: number }>(`SELECT retry_count FROM sync_queue WHERE id = ?`, [queueId]);
  const retryCount = current?.retry_count ?? 0;
  const retryMinutes = [1, 5, 15, 30][Math.min(retryCount, 3)];
  const nextRetryAt = new Date(Date.now() + retryMinutes * 60 * 1000).toISOString();
  const status = retryCount >= 3 ? 'FAILED' : 'RETRYING';

  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE sync_queue
       SET status = ?, retry_count = retry_count + 1, next_retry_at = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, nextRetryAt, error, queueId]
    );
    db.runSync(`UPDATE local_proofs SET sync_status = ?, updated_at = CURRENT_TIMESTAMP WHERE local_uuid = ?`, [status, localUuid]);
  });
}

export function markProofSyncConflict(queueId: number, localUuid: string, error: string) {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE sync_queue
       SET status = 'CONFLICT', last_error = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [error, queueId]
    );
    db.runSync(`UPDATE local_proofs SET sync_status = 'CONFLICT', updated_at = CURRENT_TIMESTAMP WHERE local_uuid = ?`, [localUuid]);
  });
}
