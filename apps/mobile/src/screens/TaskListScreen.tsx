import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { useAssignedTasks } from '@/hooks/useAssignedTasks';
import { apiClient } from '@/services/api/client';
import { logout } from '@/services/auth/authService';
import { Task } from '@/types/domain';

function TaskRow({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const [comment, setComment] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function getCurrentCoords() {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      throw new Error('Location permission is required.');
    }

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  }

  async function submitSession(action: 'check-in' | 'check-out') {
    setIsBusy(true);

    try {
      const coords = await getCurrentCoords();
      await apiClient.post(`/tasks/${task.id}/sessions/${action}`, coords);
      Alert.alert(action === 'check-in' ? 'Checked in' : 'Checked out', 'Work session updated.');
      onChanged();
    } catch (error) {
      Alert.alert('Session failed', error instanceof Error ? error.message : 'Could not update work session.');
    } finally {
      setIsBusy(false);
    }
  }

  async function submitComment() {
    if (!comment.trim()) {
      return;
    }

    setIsBusy(true);

    try {
      await apiClient.post(`/tasks/${task.id}/comments`, {
        message: comment.trim(),
        commentType: 'UPDATE'
      });
      setComment('');
      Alert.alert('Update posted', 'Your task comment was saved.');
    } catch {
      Alert.alert('Comment failed', 'Could not save the task update.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.taskRow}>
      <Pressable
        onPress={() =>
        router.push({
          pathname: '/proof/[taskId]',
          params: {
            taskId: task.id,
            taskVersion: String(task.versionNumber ?? 1),
            geofenceLatitude: task.geofenceLatitude != null ? String(task.geofenceLatitude) : '',
            geofenceLongitude: task.geofenceLongitude != null ? String(task.geofenceLongitude) : '',
            geofenceRadiusMeters: task.geofenceRadiusMeters != null ? String(task.geofenceRadiusMeters) : ''
          }
        })
        }
      >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.badge}>{task.priority}</Text>
      </View>
      <Text style={styles.description}>{task.description}</Text>
      <Text style={styles.status}>{task.status}</Text>
      </Pressable>

      <View style={styles.actions}>
        <Button label="Check In" disabled={isBusy} onPress={() => submitSession('check-in')} />
        <Button label="Check Out" disabled={isBusy} onPress={() => submitSession('check-out')} />
      </View>

      <TextInput
        multiline
        onChangeText={setComment}
        placeholder="Add task update, issue, or blocker"
        style={styles.commentInput}
        textAlignVertical="top"
        value={comment}
      />
      <Button label={isBusy ? 'Saving...' : 'Post Update'} disabled={isBusy || !comment.trim()} onPress={submitComment} />
    </View>
  );
}

export function TaskListScreen() {
  const { data, isLoading, refetch } = useAssignedTasks();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Assigned Tasks</Text>
          <Text style={styles.subtitle}>Capture proof from the task page.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            logout();
            router.replace('/login');
          }}
        >
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>
      <Pressable style={styles.syncCard} onPress={() => router.push('/sync')}>
        <Text style={styles.syncTitle}>Local Sync Queue</Text>
        <Text style={styles.syncText}>Review saved proofs and retry pending uploads.</Text>
      </Pressable>

      <FlatList
        contentContainerStyle={styles.list}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{isLoading ? 'Loading tasks...' : 'No assigned tasks yet.'}</Text>
            <Button label="Refresh" onPress={() => refetch()} />
          </View>
        }
        renderItem={({ item }) => <TaskRow task={item} onChanged={() => refetch()} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md
  },
  commentInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.md,
    minHeight: 72,
    padding: spacing.md
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 56
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  empty: {
    gap: spacing.md,
    paddingTop: 80
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center'
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  list: {
    gap: spacing.md,
    paddingVertical: spacing.lg
  },
  logout: {
    color: colors.danger,
    fontWeight: '700'
  },
  status: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.md
  },
  syncCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md
  },
  syncText: {
    color: colors.muted,
    marginTop: spacing.xs
  },
  syncTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  taskRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  taskTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800'
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800'
  }
});
