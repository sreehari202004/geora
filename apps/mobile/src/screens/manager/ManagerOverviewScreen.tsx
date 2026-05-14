import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useManagedTasks, usePendingProofs, useReviewedProofs } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';
import { logout } from '@/services/auth/authService';
import { useAuthStore } from '@/store/authStore';

export function ManagerOverviewScreen() {
  const user = useAuthStore((state) => state.user);
  const tasksQuery = useManagedTasks();
  const pendingProofsQuery = usePendingProofs();
  const reviewedProofsQuery = useReviewedProofs();

  const tasks = tasksQuery.data ?? [];
  const pendingProofs = pendingProofsQuery.data ?? [];
  const reviewedProofs = reviewedProofsQuery.data ?? [];
  const openTasks = tasks.filter((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS').length;
  const completedTasks = tasks.filter((task) => task.status === 'COMPLETED').length;
  const verifiedTasks = tasks.filter((task) => task.status === 'VERIFIED').length;

  return (
    <ScrollView style={managerStyles.container} contentContainerStyle={managerStyles.content}>
      <View style={managerStyles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={managerStyles.title}>Overview</Text>
            <Text style={managerStyles.subtitle}>Track field work, proof flow, and review pressure.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.profileButton}
            onPress={() => router.push('/manager/settings')}
          >
            <Text style={styles.profileInitial}>{user?.name?.charAt(0).toUpperCase() ?? 'M'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={managerStyles.card}>
        <View style={managerStyles.rowHeader}>
          <View style={styles.headerText}>
            <Text style={managerStyles.sectionTitle}>{user?.name ?? 'Manager'}</Text>
            <Text style={managerStyles.meta}>{user?.email}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.logoutButton}
            onPress={() => {
              logout();
              router.replace('/login');
            }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.addButton} onPress={() => router.push('/manager/new-task')}>
        <Text style={styles.addButtonText}>+ Add Task</Text>
      </Pressable>

      <View style={styles.metrics}>
        <Metric label="Open" value={openTasks} />
        <Metric label="Complete" value={completedTasks} />
        <Metric label="Review" value={pendingProofs.length} tone="warning" />
        <Metric label="Verified" value={verifiedTasks} tone="success" />
      </View>

      <Pressable style={managerStyles.card} onPress={() => router.push('/manager/new-task')}>
        <Text style={managerStyles.sectionTitle}>Create Task</Text>
        <Text style={managerStyles.meta}>Assign field work to an employee with priority and instructions.</Text>
      </Pressable>

      <Pressable style={managerStyles.card} onPress={() => router.push('/manager/reviews')}>
        <View style={managerStyles.rowHeader}>
          <Text style={managerStyles.sectionTitle}>Pending Reviews</Text>
          <Text style={managerStyles.badge}>{pendingProofs.length}</Text>
        </View>
        <Text style={managerStyles.meta}>
          {pendingProofs.length === 0 ? 'No proofs are waiting.' : `${pendingProofs.length} proof submissions need a decision.`}
        </Text>
      </Pressable>

      <View style={styles.quickLinks}>
        <Pressable style={styles.quickLink} onPress={() => router.push('/manager/reports')}>
          <Text style={styles.quickLinkTitle}>Reports</Text>
          <Text style={managerStyles.meta}>Daily work summaries</Text>
        </Pressable>
        <Pressable style={styles.quickLink} onPress={() => router.push('/manager/map')}>
          <Text style={styles.quickLinkTitle}>Map</Text>
          <Text style={managerStyles.meta}>Proof locations</Text>
        </Pressable>
        <Pressable style={styles.quickLink} onPress={() => router.push('/manager/analytics')}>
          <Text style={styles.quickLinkTitle}>Analytics</Text>
          <Text style={managerStyles.meta}>Team signals</Text>
        </Pressable>
        <Pressable style={styles.quickLink} onPress={() => router.push('/manager/settings')}>
          <Text style={styles.quickLinkTitle}>Settings</Text>
          <Text style={managerStyles.meta}>Profile and logout</Text>
        </Pressable>
      </View>

      <View style={managerStyles.card}>
        <Text style={managerStyles.sectionTitle}>Recent Decisions</Text>
        {reviewedProofs.slice(0, 3).map((proof) => (
          <View key={proof.id} style={styles.decision}>
            <Text style={styles.decisionTitle}>{proof.task.title}</Text>
            <Text style={managerStyles.meta}>
              {proof.user.name} | {proof.verificationStatus}
            </Text>
          </View>
        ))}
        {reviewedProofs.length === 0 ? <Text style={managerStyles.meta}>Approved and rejected proofs will appear here.</Text> : null}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'success' }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, tone === 'warning' && styles.warning, tone === 'success' && styles.success]}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  decision: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md
  },
  decisionTitle: {
    color: colors.text,
    fontWeight: '800'
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  headerText: {
    flex: 1
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '900'
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
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  quickLink: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: '45%',
    padding: spacing.md
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  quickLinkTitle: {
    color: colors.text,
    fontWeight: '900'
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  profileInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900'
  },
  success: {
    color: colors.success
  },
  warning: {
    color: colors.warning
  }
});
