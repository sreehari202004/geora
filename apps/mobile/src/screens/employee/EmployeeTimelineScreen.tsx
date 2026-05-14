import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useEmployeeTimeline } from '@/hooks/useManagerData';
import { TimelineEvent } from '@/types/domain';

export function EmployeeTimelineScreen() {
  const { data, isLoading, refetch } = useEmployeeTimeline();

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Timeline</Text>
            <Text style={styles.subtitle}>Your check-ins, proof submissions, reports, and updates.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{isLoading ? 'Loading timeline...' : 'No activity yet.'}</Text>}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => <TimelineCard event={item} />}
      />
    </View>
  );
}

function TimelineCard({ event }: { event: TimelineEvent }) {
  return (
    <View style={styles.card}>
      <View style={styles.dot} />
      <View style={styles.body}>
        <Text style={styles.eventType}>{event.type}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.meta}>{event.taskTitle}</Text>
        <Text style={styles.meta}>{new Date(event.occurredAt).toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
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
  dot: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 12,
    marginTop: 5,
    width: 12
  },
  empty: {
    color: colors.muted,
    textAlign: 'center'
  },
  eventTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.xs
  },
  eventType: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  header: {
    gap: spacing.xs
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 21
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800'
  }
});

