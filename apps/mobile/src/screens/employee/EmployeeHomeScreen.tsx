import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { getLocalProofs } from '@/database/proofRepository';
import { useAssignedTasks } from '@/hooks/useAssignedTasks';
import { useAuthStore } from '@/store/authStore';

export function EmployeeHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const tasksQuery = useAssignedTasks();
  const [localProofCount, setLocalProofCount] = useState(0);
  const tasks = tasksQuery.data ?? [];
  const pendingTasks = tasks.filter((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS').length;

  useEffect(() => {
    setLocalProofCount(getLocalProofs().length);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Hi, {user?.name ?? 'Employee'}</Text>
        <Text style={styles.subtitle}>Capture field proofs and keep work safe offline.</Text>
      </View>

      <View style={styles.metrics}>
        <Metric label="Assigned" value={tasks.length} />
        <Metric label="Open" value={pendingTasks} />
        <Metric label="Saved" value={localProofCount} />
      </View>

      <Pressable style={styles.card} onPress={() => router.push('/employee/tasks')}>
        <Text style={styles.cardTitle}>Assigned Tasks</Text>
        <Text style={styles.cardText}>Open a task to capture proof with photo, GPS, and timestamp.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/employee/sync')}>
        <Text style={styles.cardTitle}>Sync Queue</Text>
        <Text style={styles.cardText}>Review saved local proofs and retry uploads when online.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/employee/notifications')}>
        <Text style={styles.cardTitle}>Alerts</Text>
        <Text style={styles.cardText}>Task assignments and proof review decisions.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/employee/settings')}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.cardText}>Account details and logout.</Text>
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  cardText: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800'
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 96,
    paddingTop: 56
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  metricLabel: {
    color: colors.muted,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md
  },
  metricValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800'
  }
});
