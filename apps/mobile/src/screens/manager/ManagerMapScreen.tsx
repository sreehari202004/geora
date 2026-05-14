import * as Linking from 'expo-linking';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useManagerMapPoints } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';
import { ManagerMapPoint } from '@/types/domain';

export function ManagerMapScreen() {
  const { data, isLoading, refetch } = useManagerMapPoints();

  return (
    <View style={managerStyles.container}>
      <FlatList
        contentContainerStyle={managerStyles.content}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={managerStyles.header}>
            <Text style={managerStyles.title}>Map View</Text>
            <Text style={managerStyles.subtitle}>Open proof locations in maps and scan geo-fence warnings.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={managerStyles.empty}>{isLoading ? 'Loading proof locations...' : 'No proof locations yet.'}</Text>}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => <MapPointCard point={item} />}
      />
    </View>
  );
}

function MapPointCard({ point }: { point: ManagerMapPoint }) {
  const url = `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;

  return (
    <View style={managerStyles.card}>
      <View style={managerStyles.rowHeader}>
        <Text style={styles.title}>{point.taskTitle}</Text>
        <Text style={managerStyles.badge}>{point.verificationStatus}</Text>
      </View>
      <Text style={managerStyles.meta}>{point.employeeName}</Text>
      <Text style={managerStyles.meta}>{new Date(point.capturedAt).toLocaleString()}</Text>
      <Text style={managerStyles.meta}>
        {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
      </Text>
      {point.outsideGeofence ? <Text style={styles.warning}>Outside task geo-fence</Text> : null}
      <Pressable style={styles.mapButton} onPress={() => Linking.openURL(url)}>
        <Text style={styles.mapButtonText}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mapButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  mapButtonText: {
    color: '#ffffff',
    fontWeight: '900'
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

