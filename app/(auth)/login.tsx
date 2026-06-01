import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthService } from '../../src/domain/auth';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';

export default function LoginScreen() {
  const router = useRouter();
  const auth = useAuthService();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    const result = await auth.signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      router.replace('/(tabs)');
      return;
    }
    setErrorMessage(result.error.message);
  };

  const disabled = !auth.isReady || submitting || !email || !password;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Sign in
        </Text>
        <Text style={styles.subtitle}>Unofficial — not affiliated with ServiceNow, Inc.</Text>

        <Text accessibilityRole="text" style={styles.label}>
          Email
        </Text>
        <TextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          inputMode="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />

        <Text accessibilityRole="text" style={styles.label}>
          Password
        </Text>
        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          style={styles.input}
          textContentType="password"
          value={password}
        />

        {errorMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.error}
          >
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityHint="Signs you in with your email and password"
          accessibilityLabel="Sign in"
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: submitting }}
          disabled={disabled}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            disabled && styles.primaryButtonDisabled,
            pressed && !disabled && styles.primaryButtonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator accessibilityLabel="Signing in" color={theme.onAccentStrong} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Link href="/(auth)/forgot-password" style={styles.link}>
            Forgot password?
          </Link>
          <Link href="/(auth)/register" style={styles.link}>
            Create account
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
    title: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    subtitle: { color: theme.textSecondary, fontSize: 12, marginBottom: 16 },
    label: { color: theme.textBody, fontSize: 14, marginTop: 12 },
    input: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.textPrimary,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    error: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      color: theme.onDangerSurface,
      marginTop: 16,
      padding: 12,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      justifyContent: 'center',
      marginTop: 24,
      paddingVertical: 14,
    },
    primaryButtonDisabled: { backgroundColor: theme.borderStrong },
    primaryButtonPressed: { backgroundColor: theme.accentStrongPressed },
    primaryButtonText: { color: theme.onAccentStrong, fontSize: 16, fontWeight: '600' },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    link: { color: theme.accent, fontSize: 14 },
  });
