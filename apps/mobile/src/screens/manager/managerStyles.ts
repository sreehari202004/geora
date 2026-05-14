import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export const managerStyles = StyleSheet.create({
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
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
    fontSize: 15,
    lineHeight: 21
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  label: {
    color: colors.text,
    fontWeight: '800'
  },
  meta: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
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
