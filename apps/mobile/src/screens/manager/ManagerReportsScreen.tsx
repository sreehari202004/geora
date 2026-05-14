import { useMemo, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { usePendingProofs, useReviewedProofs } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';
import { PendingProof } from '@/types/domain';

export function ManagerReportsScreen() {
  const pendingProofsQuery = usePendingProofs();
  const reviewedProofsQuery = useReviewedProofs();
  const [query, setQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<PendingProof | null>(null);
  const reports = useMemo(() => {
    const proofMap = new Map<string, PendingProof>();

    for (const proof of [...(pendingProofsQuery.data ?? []), ...(reviewedProofsQuery.data ?? [])]) {
      proofMap.set(proof.id, proof);
    }

    const proofs = Array.from(proofMap.values());
    const normalizedQuery = query.trim().toLowerCase();
    return proofs
      .filter((proof) => proof.dailyReport)
      .filter((proof) => {
        if (!normalizedQuery) {
          return true;
        }

        return [proof.task.title, proof.user.name, proof.dailyReport?.title, proof.dailyReport?.reportText]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      });
  }, [pendingProofsQuery.data, query, reviewedProofsQuery.data]);

  return (
    <View style={managerStyles.container}>
      <FlatList
        contentContainerStyle={managerStyles.content}
        data={reports}
        keyExtractor={(item) => `${item.id}-${item.dailyReport?.id ?? 'report'}`}
        ListHeaderComponent={
          <View style={managerStyles.header}>
            <Text style={managerStyles.title}>Reports</Text>
            <Text style={managerStyles.subtitle}>Search submitted daily work reports across the team.</Text>
            <TextInput placeholder="Search reports" style={managerStyles.input} value={query} onChangeText={setQuery} />
          </View>
        }
        ListEmptyComponent={<Text style={managerStyles.empty}>No matching reports found.</Text>}
        renderItem={({ item }) => <ReportCard proof={item} onPress={() => setSelectedProof(item)} />}
      />
      <ReportDetailModal proof={selectedProof} onClose={() => setSelectedProof(null)} />
    </View>
  );
}

function ReportCard({ proof, onPress }: { proof: PendingProof; onPress: () => void }) {
  if (!proof.dailyReport) {
    return null;
  }

  return (
    <Pressable style={managerStyles.card} onPress={onPress}>
      <View style={managerStyles.rowHeader}>
        <Text style={styles.title}>{proof.dailyReport.title}</Text>
        <Text style={managerStyles.badge}>{proof.verificationStatus}</Text>
      </View>
      <Text style={managerStyles.meta}>{proof.task.title}</Text>
      <Text style={managerStyles.meta}>{proof.user.name}</Text>
      <Text style={managerStyles.meta}>
        Attachments: {proof.dailyReport.attachments?.length ?? 0}
      </Text>
      <Text style={styles.reportText}>{proof.dailyReport.reportText}</Text>
      <Text style={styles.openText}>Open report</Text>
    </Pressable>
  );
}

function ReportDetailModal({ proof, onClose }: { proof: PendingProof | null; onClose: () => void }) {
  if (!proof?.dailyReport) {
    return null;
  }

  const attachments = proof.dailyReport.attachments ?? [];

  return (
    <Modal animationType="slide" visible transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={managerStyles.rowHeader}>
              <Text style={styles.modalTitle}>{proof.dailyReport.title}</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            {proof.imageUrl ? <Image source={{ uri: proof.imageUrl }} style={styles.proofImage} /> : null}
            <Text style={managerStyles.meta}>{proof.task.title}</Text>
            <Text style={managerStyles.meta}>{proof.user.name}</Text>
            <Text style={managerStyles.meta}>{new Date(proof.dailyReport.submittedAt).toLocaleString()}</Text>
            <Text style={styles.reportText}>{proof.dailyReport.reportText}</Text>

            <Text style={styles.sectionTitle}>Attachments</Text>
            {attachments.length === 0 ? <Text style={managerStyles.meta}>No attachments uploaded with this report.</Text> : null}
            {attachments.map((attachment) => (
              <Pressable key={attachment.id} style={styles.attachmentRow} onPress={() => Linking.openURL(attachment.fileUrl)}>
                <View style={styles.attachmentBody}>
                  <Text style={styles.attachmentName}>{attachment.fileName}</Text>
                  <Text style={managerStyles.meta}>
                    {attachment.fileType} | {formatFileSize(attachment.fileSize)}
                  </Text>
                </View>
                <Text style={styles.openText}>Open</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

const styles = StyleSheet.create({
  attachmentBody: {
    flex: 1
  },
  attachmentName: {
    color: colors.text,
    fontWeight: '800'
  },
  attachmentRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md
  },
  closeText: {
    color: colors.danger,
    fontWeight: '900'
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalContent: {
    gap: spacing.md,
    padding: spacing.md
  },
  modalPanel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: '88%'
  },
  modalTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '900'
  },
  openText: {
    color: colors.primary,
    fontWeight: '900',
    marginTop: spacing.md
  },
  proofImage: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 240,
    width: '100%'
  },
  reportText: {
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: spacing.sm
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800'
  }
});
