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
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  useAuthService,
  validatePassword,
} from '../../src/domain/auth';

/** Two-step flow: enter email → enter code + new password. */
type Phase = 'request' | 'confirm';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const auth = useAuthService();
  const [phase, setPhase] = useState<Phase>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onRequest = async () => {
    if (submitting) return;
    setErrorMessage(null);
    setSubmitting(true);
    const result = await auth.requestPasswordReset(email.trim());
    setSubmitting(false);
    if (result.ok) {
      setPhase('confirm');
      return;
    }
    setErrorMessage(result.error.message);
  };

  const onConfirm = async () => {
    if (submitting) return;
    setErrorMessage(null);
    if (!validatePassword(newPassword)) {
      setErrorMessage(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters long.`,
      );
      return;
    }
    setSubmitting(true);
    const result = await auth.confirmPasswordReset(code.trim(), newPassword);
    setSubmitting(false);
    if (result.ok) {
      router.replace('/(tabs)');
      return;
    }
    setErrorMessage(result.error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          {phase === 'request' ? 'Reset password' : 'Enter code'}
        </Text>
        <Text style={styles.subtitle}>
          Unofficial — not affiliated with ServiceNow, Inc.
        </Text>

        {phase === 'request' ? (
          <>
            <Text style={styles.body}>
              Enter the email you signed up with. We&apos;ll send a code so you can choose a new
              password.
            </Text>
            <Text style={styles.label}>Email</Text>
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
          </>
        ) : (
          <>
            <Text style={styles.body}>
              We sent a code to <Text style={styles.email}>{email}</Text>. Enter it below along
              with your new password.
            </Text>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              accessibilityLabel="Verification code"
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={setCode}
              placeholder="123456"
              style={styles.input}
              textContentType="oneTimeCode"
              value={code}
            />

            <Text style={styles.label}>New password</Text>
            <TextInput
              accessibilityLabel="New password"
              accessibilityHint={`Between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`}
              autoCapitalize="none"
              autoComplete="password-new"
              autoCorrect={false}
              onChangeText={setNewPassword}
              placeholder="Choose a new password"
              secureTextEntry
              style={styles.input}
              textContentType="newPassword"
              value={newPassword}
            />
          </>
        )}

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
          accessibilityLabel={phase === 'request' ? 'Send reset code' : 'Reset password'}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting || !auth.isReady, busy: submitting }}
          disabled={submitting || !auth.isReady}
          onPress={phase === 'request' ? onRequest : onConfirm}
          style={({ pressed }) => [
            styles.primaryButton,
            (submitting || !auth.isReady) && styles.primaryButtonDisabled,
            pressed && !submitting && styles.primaryButtonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {phase === 'request' ? 'Send code' : 'Reset password'}
            </Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Link href="/(auth)/login" style={styles.link}>
            Back to sign in
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 12, marginBottom: 16 },
  body: { color: '#E2E8F0', fontSize: 15, marginBottom: 12 },
  email: { color: '#F8FAFC', fontWeight: '600' },
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
  linkRow: { marginTop: 20, alignItems: 'center' },
  link: { color: '#60A5FA', fontSize: 14 },
});
