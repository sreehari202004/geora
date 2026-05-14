import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useEmployeeNotifications } from '@/hooks/useManagerData';
import { AppNotification } from '@/types/domain';

export function EmployeeNotificationsScreen() {
  const { data, isLoading, refetch } = useEmployeeNotifications();

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Alerts</Text>
            <Text style={styles.subtitle}>Task assignments and proof decisions.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{isLoading ? 'Loading alerts...' : 'No alerts yet.'}</Text>}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => <NotificationCard notification={item} />}
      />
    </View>
  );
}

function NotificationCard({ notification }: { notification: AppNotification }) {
  const isRejected = notification.type.includes('REJECTED');

  return (
    <View style={styles.card}>
      <Text style={[styles.notificationTitle, isRejected && styles.rejected]}>{notification.title}</Text>
      <Text style={styles.message}>{notification.message}</Text>
      <Text style={styles.meta}>{new Date(notification.createdAt).toLocaleString()}</Text>
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
  empty: {
    color: colors.muted,
    textAlign: 'center'
  },
  header: {
    gap: spacing.xs
  },
  message: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.sm
  },
  notificationTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  rejected: {
    color: colors.danger
  },
  subtitle: {
    color: colors.muted
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800'
  }
});

