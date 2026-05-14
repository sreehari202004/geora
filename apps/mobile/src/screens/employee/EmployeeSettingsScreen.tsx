import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { logout } from '@/services/auth/authService';
import { useAuthStore } from '@/store/authStore';

export function EmployeeSettingsScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Account and offline capture settings.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{user?.name ?? 'Employee'}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>{user?.role}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Offline Storage</Text>
        <Text style={styles.meta}>Proof metadata is saved in SQLite. Photos are saved in app document storage.</Text>
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
    </ScrollView>
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
    gap: spacing.xs
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  meta: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs
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
