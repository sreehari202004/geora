import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useManagedTasks } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';
import { ManagedTask } from '@/types/domain';

export function ManagerTasksScreen() {
  const { data, isLoading, refetch } = useManagedTasks();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const tasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (data ?? []).filter((task) => {
      const matchesStatus = status === 'ALL' || task.status === status;
      const matchesQuery =
        !normalizedQuery ||
        [task.title, task.description, task.assignedTo.name, task.priority, task.status].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );

      return matchesStatus && matchesQuery;
    });
  }, [data, query, status]);

  return (
    <View style={managerStyles.container}>
      <FlatList
        contentContainerStyle={managerStyles.content}
        data={tasks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={managerStyles.header}>
            <Text style={managerStyles.title}>Team Tasks</Text>
            <Text style={managerStyles.subtitle}>Monitor assignments across employees and verification states.</Text>
            <Pressable style={styles.addButton} onPress={() => router.push('/manager/new-task')}>
              <Text style={styles.addButtonText}>+ Add Task</Text>
            </Pressable>
            <TextInput placeholder="Search tasks" style={managerStyles.input} value={query} onChangeText={setQuery} />
            <View style={styles.filterRow}>
              {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'REJECTED'].map((item) => (
                <Pressable key={item} style={[styles.filter, status === item && styles.filterActive]} onPress={() => setStatus(item)}>
                  <Text style={[styles.filterText, status === item && styles.filterTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={managerStyles.empty}>{isLoading ? 'Loading tasks...' : 'No matching team tasks.'}</Text>}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => <TaskCard task={item} />}
      />
    </View>
  );
}

function TaskCard({ task }: { task: ManagedTask }) {
  return (
    <View style={managerStyles.card}>
      <View style={managerStyles.rowHeader}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={managerStyles.badge}>{task.status}</Text>
      </View>
      <Text style={managerStyles.meta}>{task.assignedTo.name}</Text>
      <Text style={styles.description}>{task.description}</Text>
      <View style={styles.footer}>
        <Text style={styles.priority}>{task.priority}</Text>
        <Text style={managerStyles.meta}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  description: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md
  },
  filter: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  filterTextActive: {
    color: '#ffffff'
  },
  priority: {
    color: colors.text,
    fontWeight: '800'
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800'
  }
});
