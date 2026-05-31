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

export default function LoginScreen() {
  const router = useRouter();
  const auth = useAuthService();
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
            <ActivityIndicator accessibilityLabel="Signing in" color="#fff" />
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 12, marginBottom: 16 },
  label: { color: '#E2E8F0', fontSize: 14, marginTop: 12 },
  input: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    color: '#FECACA',
    marginTop: 16,
    padding: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
  },
  primaryButtonDisabled: { backgroundColor: '#475569' },
  primaryButtonPressed: { backgroundColor: '#1D4ED8' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  link: { color: '#60A5FA', fontSize: 14 },
});
