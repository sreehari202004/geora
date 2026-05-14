import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { File } from 'expo-file-system';

import {
  getPendingSyncProofs,
  markProofSyncConflict,
  markProofSyncFailed,
  markProofSynced,
  markProofUploading
} from '@/database/proofRepository';
import { apiClient } from '@/services/api/client';
import { LocalProof } from '@/types/domain';

let isSyncing = false;
let lastSyncMessage = 'Sync has not run yet.';

export function startSyncListener() {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingProofs();
    }
  });

  syncPendingProofs();

  return unsubscribe;
}

export async function syncPendingProofs(options: { force?: boolean } = {}) {
  if (isSyncing) {
    lastSyncMessage = 'Sync already running.';
    return;
  }

  isSyncing = true;
  lastSyncMessage = 'Sync started.';

  try {
    const queueItems = getPendingSyncProofs({ force: options.force });
    lastSyncMessage = queueItems.length === 0 ? 'No pending records to sync.' : `Syncing ${queueItems.length} record(s).`;

    for (const item of queueItems) {
      const proof = JSON.parse(item.payload) as LocalProof;

      try {
        markProofUploading(item.id, item.local_record_id);

        const imageFile = new File(proof.imageUri);
        const imageBase64 = imageFile.base64Sync();

        const { data: syncedProof } = await apiClient.post<{ id: string }>('/work-proofs', {
          localUuid: proof.localUuid,
          taskId: proof.taskId,
          imageUri: proof.imageUri,
          imageBase64,
          imageMimeType: 'image/jpeg',
          latitude: proof.latitude,
          longitude: proof.longitude,
          locationAccuracy: proof.locationAccuracy,
          capturedAt: proof.capturedAt,
          remarks: proof.remarks,
          taskVersion: proof.taskVersion,
          reportTitle: proof.reportTitle,
          reportText: proof.reportText
        });

        for (const attachment of proof.reportAttachments ?? []) {
          const file = new File(attachment.uri);
          await apiClient.post(`/work-proofs/${syncedProof.id}/attachments`, {
            fileBase64: file.base64Sync(),
            fileName: attachment.name,
            fileType: attachment.mimeType,
            fileSize: attachment.size
          });
        }

        markProofSynced(item.id, item.local_record_id);
        lastSyncMessage = `Synced proof ${proof.localUuid}.`;
      } catch (error) {
        const message = getSyncErrorMessage(error);
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          markProofSyncConflict(item.id, item.local_record_id, message);
          lastSyncMessage = `Conflict syncing proof ${proof.localUuid}: ${message}`;
          continue;
        }

        markProofSyncFailed(item.id, item.local_record_id, message);
        lastSyncMessage = `Failed syncing proof ${proof.localUuid}: ${message}`;
      }
    }
  } finally {
    isSyncing = false;
  }
}

export function getLastSyncMessage() {
  return lastSyncMessage;
}

function getSyncErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const serverMessage =
        typeof error.response.data?.message === 'string' ? error.response.data.message : JSON.stringify(error.response.data);
      return `HTTP ${error.response.status}: ${serverMessage}`;
    }

    if (error.request) {
      return `Network Error: API did not respond`;
    }
  }

  return error instanceof Error ? error.message : 'Unknown sync error';
}
