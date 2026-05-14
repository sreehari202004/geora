import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { usePendingProofs, useReviewedProofs } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';
import { apiClient } from '@/services/api/client';
import { PendingProof } from '@/types/domain';

type ReviewTab = 'PENDING' | 'HISTORY';

export function ManagerReviewsScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ReviewTab>('PENDING');
  const [query, setQuery] = useState('');
  const pendingProofsQuery = usePendingProofs();
  const reviewedProofsQuery = useReviewedProofs();

  const verifyProofMutation = useMutation({
    mutationFn: async ({ proofId, status }: { proofId: string; status: 'APPROVED' | 'REJECTED' }) => {
      await apiClient.patch(`/work-proofs/${proofId}/verify`, { status });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-proofs'] }),
        queryClient.invalidateQueries({ queryKey: ['reviewed-proofs'] }),
        queryClient.invalidateQueries({ queryKey: ['managed-tasks'] })
      ]);
    },
    onError: () => {
      Alert.alert('Review failed', 'Could not update the proof review.');
    }
  });

  const pendingProofs = pendingProofsQuery.data ?? [];
  const reviewedProofs = reviewedProofsQuery.data ?? [];
  const visibleProofs = useMemo(() => {
    const source = tab === 'PENDING' ? pendingProofs : reviewedProofs;
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return source;
    }

    return source.filter((proof) =>
      [proof.task.title, proof.user.name, proof.verificationStatus, proof.dailyReport?.title, proof.dailyReport?.reportText]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  }, [pendingProofs, query, reviewedProofs, tab]);
  const isLoading = tab === 'PENDING' ? pendingProofsQuery.isLoading : reviewedProofsQuery.isLoading;

  return (
    <ScrollView style={managerStyles.container} contentContainerStyle={managerStyles.content}>
      <View style={managerStyles.header}>
        <Text style={managerStyles.title}>Reviews</Text>
        <Text style={managerStyles.subtitle}>Inspect proof photos, location metadata, and verification state.</Text>
      </View>

      <View style={styles.segment}>
        <SegmentButton label={`Pending ${pendingProofs.length}`} active={tab === 'PENDING'} onPress={() => setTab('PENDING')} />
        <SegmentButton label="History" active={tab === 'HISTORY'} onPress={() => setTab('HISTORY')} />
      </View>
      <TextInput placeholder="Search proofs, employees, reports" style={managerStyles.input} value={query} onChangeText={setQuery} />

      {visibleProofs.length === 0 ? (
        <Text style={managerStyles.empty}>{isLoading ? 'Loading proofs...' : 'No proofs in this view.'}</Text>
      ) : (
        visibleProofs.map((proof) => (
          <ProofCard
            key={proof.id}
            proof={proof}
            isPending={tab === 'PENDING'}
            isReviewing={verifyProofMutation.isPending}
            onApprove={() => verifyProofMutation.mutate({ proofId: proof.id, status: 'APPROVED' })}
            onReject={() => verifyProofMutation.mutate({ proofId: proof.id, status: 'REJECTED' })}
          />
        ))
      )}
    </ScrollView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ProofCard({
  proof,
  isPending,
  isReviewing,
  onApprove,
  onReject
}: {
  proof: PendingProof;
  isPending: boolean;
  isReviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={managerStyles.card}>
      {proof.imageUrl ? <Image source={{ uri: proof.imageUrl }} style={styles.image} /> : null}
      <View style={managerStyles.rowHeader}>
        <Text style={styles.title}>{proof.task.title}</Text>
        <Text style={managerStyles.badge}>{proof.verificationStatus}</Text>
      </View>
      <Text style={managerStyles.meta}>{proof.user.name}</Text>
      <Text style={managerStyles.meta}>
        {new Date(proof.capturedAt).toLocaleString()} | {proof.latitude.toFixed(5)}, {proof.longitude.toFixed(5)}
      </Text>
      <Text style={managerStyles.meta}>Accuracy: {proof.locationAccuracy ? `${Math.round(proof.locationAccuracy)}m` : 'Unknown'}</Text>
      {proof.outsideGeofence ? <Text style={styles.warning}>Outside task geo-fence</Text> : null}
      {proof.dailyReport ? (
        <View style={styles.reportBox}>
          <Text style={styles.reportTitle}>{proof.dailyReport.title}</Text>
          <Text style={styles.reportText}>{proof.dailyReport.reportText}</Text>
        </View>
      ) : null}
      {proof.attempts?.length ? (
        <Text style={managerStyles.meta}>
          Attempts: {proof.attempts.length} | Latest version: {proof.attempts[0]?.proofVersion ?? 1}
        </Text>
      ) : null}
      {isPending ? (
        <View style={styles.actions}>
          <Button label="Approve" disabled={isReviewing} onPress={onApprove} />
          <Button label="Reject" disabled={isReviewing} onPress={onReject} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md
  },
  image: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 220,
    marginBottom: spacing.md,
    width: '100%'
  },
  reportBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.md
  },
  reportText: {
    color: colors.muted,
    lineHeight: 20
  },
  reportTitle: {
    color: colors.text,
    fontWeight: '800'
  },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.xs
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center'
  },
  segmentButtonActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '800'
  },
  segmentTextActive: {
    color: '#ffffff'
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800'
  },
  warning: {
    color: colors.danger,
    fontWeight: '800',
    marginTop: spacing.sm
  }
});
