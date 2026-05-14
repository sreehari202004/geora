import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { getLocalProofs } from '@/database/proofRepository';
import { apiBaseURL } from '@/services/api/client';
import { getLastSyncMessage, syncPendingProofs } from '@/services/sync/syncManager';

type LocalProofRow = ReturnType<typeof getLocalProofs>[number];

export function SyncStatusScreen({ showBack = true }: { showBack?: boolean }) {
  const [proofs, setProofs] = useState<LocalProofRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  function loadProofs() {
    setProofs(getLocalProofs());
  }

  useEffect(() => {
    loadProofs();
  }, []);

  async function runSync() {
    setIsSyncing(true);
    try {
      await syncPendingProofs({ force: true });
      loadProofs();
      Alert.alert('Sync status', getLastSyncMessage());
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sync Status</Text>
          <Text style={styles.subtitle}>Local proofs saved on this device.</Text>
          <Text style={styles.apiUrl}>{apiBaseURL}</Text>
        </View>
        {showBack ? (
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={proofs}
        keyExtractor={(item) => item.local_uuid}
        ListHeaderComponent={<Button label={isSyncing ? 'Syncing...' : 'Sync Now'} disabled={isSyncing} onPress={runSync} />}
        ListEmptyComponent={<Text style={styles.empty}>No proof records saved locally yet.</Text>}
        renderItem={({ item }) => <ProofRow proof={item} />}
      />
    </View>
  );
}

function ProofRow({ proof }: { proof: LocalProofRow }) {
  const statusCopy = getStatusCopy(proof.sync_status);

  return (
    <View style={styles.row}>
      <Image source={{ uri: proof.image_uri }} style={styles.thumbnail} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: statusCopy.color }]}>{statusCopy.label}</Text>
        <Text style={styles.meta}>{statusCopy.description}</Text>
        <Text style={styles.meta}>{new Date(proof.captured_at).toLocaleString()}</Text>
        {proof.report_title ? <Text style={styles.reportTitle}>{proof.report_title}</Text> : null}
        {proof.last_error && proof.sync_status !== 'SYNCED' ? <Text style={styles.errorText}>{proof.last_error}</Text> : null}
        {proof.next_retry_at && proof.sync_status === 'RETRYING' ? (
          <Text style={styles.meta}>Auto retry after {new Date(proof.next_retry_at).toLocaleTimeString()}</Text>
        ) : null}
        <Text style={styles.meta}>
          {proof.latitude.toFixed(5)}, {proof.longitude.toFixed(5)}
        </Text>
      </View>
    </View>
  );
}

function getStatusCopy(status: string) {
  switch (status) {
    case 'SYNCED':
      return { label: 'Synced', description: 'Proof and report are safely uploaded.', color: colors.success };
    case 'UPLOADING':
      return { label: 'Uploading', description: 'Image and metadata are being sent now.', color: colors.primary };
    case 'RETRYING':
      return { label: 'Retrying', description: 'Upload failed once and will retry automatically.', color: colors.warning };
    case 'FAILED':
      return { label: 'Failed', description: 'Upload needs attention. Try syncing again.', color: colors.danger };
    case 'CONFLICT':
      return { label: 'Conflict', description: 'Task changed while offline. Manager review is needed.', color: colors.danger };
    default:
      return { label: 'Queued', description: 'Saved offline and waiting for connection.', color: colors.muted };
  }
}

const styles = StyleSheet.create({
  back: {
    color: colors.primary,
    fontWeight: '800'
  },
  apiUrl: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 56
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    paddingTop: spacing.lg,
    textAlign: 'center'
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  rowBody: {
    flex: 1
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  reportTitle: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs
  },
  thumbnail: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 72,
    width: 72
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800'
  }
});
