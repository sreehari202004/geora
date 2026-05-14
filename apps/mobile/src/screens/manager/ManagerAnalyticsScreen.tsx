import { DimensionValue, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useManagerDashboard, useManagedTasks, usePendingProofs, useReviewedProofs } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';

export function ManagerAnalyticsScreen() {
  const dashboardQuery = useManagerDashboard();
  const tasksQuery = useManagedTasks();
  const pendingProofsQuery = usePendingProofs();
  const reviewedProofsQuery = useReviewedProofs();

  const dashboard = dashboardQuery.data;
  const tasks = tasksQuery.data ?? [];
  const pendingProofs = pendingProofsQuery.data ?? [];
  const reviewedProofs = reviewedProofsQuery.data ?? [];
  const approved = reviewedProofs.filter((proof) => proof.verificationStatus === 'APPROVED').length;
  const rejected = reviewedProofs.filter((proof) => proof.verificationStatus === 'REJECTED').length;
  const outsideGeofence = [...pendingProofs, ...reviewedProofs].filter((proof) => proof.outsideGeofence).length;
  const lateTasks = tasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'VERIFIED').length;

  return (
    <ScrollView style={managerStyles.container} contentContainerStyle={managerStyles.content}>
      <View style={managerStyles.header}>
        <Text style={managerStyles.title}>Analytics</Text>
        <Text style={managerStyles.subtitle}>Operational signals for reviews, attendance, and task health.</Text>
      </View>

      <View style={styles.grid}>
        <Metric label="Pending Reviews" value={dashboard?.pendingReviews ?? pendingProofs.length} tone="warning" />
        <Metric label="Active Employees" value={dashboard?.activeSessions ?? 0} tone="success" />
        <Metric label="Reports Today" value={dashboard?.reportsToday ?? 0} />
        <Metric label="Rejected Proofs" value={dashboard?.rejectedProofs ?? rejected} tone="danger" />
        <Metric label="Late Tasks" value={lateTasks} tone="danger" />
        <Metric label="Geo-fence Flags" value={outsideGeofence} tone="warning" />
      </View>

      <View style={managerStyles.card}>
        <Text style={managerStyles.sectionTitle}>Task Pipeline</Text>
        {Object.entries(dashboard?.tasksByStatus ?? {}).map(([status, count]) => (
          <Bar key={status} label={status} value={count} total={Math.max(tasks.length, 1)} />
        ))}
        {!dashboard ? <Text style={managerStyles.meta}>Loading analytics...</Text> : null}
      </View>

      <View style={managerStyles.card}>
        <Text style={managerStyles.sectionTitle}>Verification Quality</Text>
        <Bar label="Approved" value={approved} total={Math.max(reviewedProofs.length, 1)} tone="success" />
        <Bar label="Rejected" value={rejected} total={Math.max(reviewedProofs.length, 1)} tone="danger" />
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'success' | 'danger' }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, tone === 'warning' && styles.warning, tone === 'success' && styles.success, tone === 'danger' && styles.danger]}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone?: 'success' | 'danger' }) {
  const width = `${Math.min(100, Math.round((value / total) * 100))}%` as DimensionValue;

  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width }, tone === 'success' && styles.barSuccess, tone === 'danger' && styles.barDanger]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barDanger: {
    backgroundColor: colors.danger
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  barLabel: {
    color: colors.text,
    fontWeight: '800'
  },
  barRow: {
    gap: spacing.sm,
    marginTop: spacing.md
  },
  barSuccess: {
    backgroundColor: colors.success
  },
  barTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden'
  },
  barValue: {
    color: colors.muted,
    fontWeight: '800'
  },
  danger: {
    color: colors.danger
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: '45%',
    padding: spacing.md
  },
  metricLabel: {
    color: colors.muted,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900'
  },
  success: {
    color: colors.success
  },
  warning: {
    color: colors.warning
  }
});
