import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { login } from '@/services/auth/authService';

type LoginForm = {
  email: string;
  password: string;
};

export function LoginScreen() {
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login(values.email.trim(), values.password);
      router.replace(session.user.role === 'EMPLOYEE' ? '/employee' : '/manager');
    } catch {
      Alert.alert('Login failed', 'Check your email and password.');
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Geora</Text>
      <Text style={styles.subtitle}>Field proof capture</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          rules={{ required: true }}
          render={({ field }) => (
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Email"
              style={styles.input}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: true }}
          render={({ field }) => (
            <TextInput
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={field.value}
            />
          )}
        />

        <Button label="Log in" onPress={onSubmit} disabled={formState.isSubmitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: spacing.md
  },
  subtitle: {
    color: colors.muted,
    fontSize: 18,
    marginTop: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800'
  }
});
