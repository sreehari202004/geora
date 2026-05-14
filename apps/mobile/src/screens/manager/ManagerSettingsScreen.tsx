import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { managerStyles } from '@/screens/manager/managerStyles';
import { logout } from '@/services/auth/authService';
import { useAuthStore } from '@/store/authStore';

export function ManagerSettingsScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <ScrollView style={managerStyles.container} contentContainerStyle={managerStyles.content}>
      <View style={managerStyles.header}>
        <Text style={managerStyles.title}>Settings</Text>
        <Text style={managerStyles.subtitle}>Account, session, and workspace details.</Text>
      </View>

      <View style={managerStyles.card}>
        <Text style={managerStyles.sectionTitle}>{user?.name ?? 'Manager'}</Text>
        <Text style={managerStyles.meta}>{user?.email}</Text>
        <Text style={managerStyles.meta}>{user?.role}</Text>
      </View>

      <View style={managerStyles.card}>
        <Text style={managerStyles.sectionTitle}>Offline Sync</Text>
        <Text style={managerStyles.meta}>
          Employees can save proof records locally. Pending records sync automatically when the device reconnects.
        </Text>
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
  }
});
