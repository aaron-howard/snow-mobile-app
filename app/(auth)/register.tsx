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

/** Two-step flow: collect email/password, then collect the email-code. */
type Phase = 'collect' | 'verify';

export default function RegisterScreen() {
  const router = useRouter();
  const auth = useAuthService();
  const [phase, setPhase] = useState<Phase>('collect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmitCollect = async () => {
    if (submitting) return;
    setErrorMessage(null);
    if (!validatePassword(password)) {
      setErrorMessage(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters long.`,
      );
      return;
    }
    setSubmitting(true);
    const result = await auth.signUpWithEmail(email.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      setPhase('verify');
      return;
    }
    setErrorMessage(result.error.message);
  };

  const onSubmitVerify = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    const result = await auth.verifyEmailCode(code.trim());
    setSubmitting(false);
    if (result.ok) {
      router.replace('/(tabs)');
      return;
    }
    setErrorMessage(result.error.message);
  };

  const onResend = async () => {
    setErrorMessage(null);
    const result = await auth.resendVerificationEmail();
    if (!result.ok) setErrorMessage(result.error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          {phase === 'collect' ? 'Create account' : 'Verify your email'}
        </Text>
        <Text style={styles.subtitle}>
          Unofficial — not affiliated with ServiceNow, Inc.
        </Text>

        {phase === 'collect' ? (
          <>
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

            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              accessibilityHint={`Between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`}
              autoCapitalize="none"
              autoComplete="password-new"
              autoCorrect={false}
              onChangeText={setPassword}
              placeholder="Choose a password"
              secureTextEntry
              style={styles.input}
              textContentType="newPassword"
              value={password}
            />
            <Text style={styles.helper}>
              {MIN_PASSWORD_LENGTH}–{MAX_PASSWORD_LENGTH} characters.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              We sent a verification code to{' '}
              <Text style={styles.email}>{email}</Text>. Enter it below to finish creating your account.
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resend verification email"
              onPress={onResend}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Resend code</Text>
            </Pressable>
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
          accessibilityLabel={phase === 'collect' ? 'Create account' : 'Verify code'}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting || !auth.isReady, busy: submitting }}
          disabled={submitting || !auth.isReady}
          onPress={phase === 'collect' ? onSubmitCollect : onSubmitVerify}
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
              {phase === 'collect' ? 'Create account' : 'Verify'}
            </Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Link href="/(auth)/login" style={styles.link}>
            Already have an account? Sign in
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
  helper: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
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
  secondaryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  secondaryButtonText: { color: '#60A5FA', fontSize: 14 },
  linkRow: { marginTop: 20, alignItems: 'center' },
  link: { color: '#60A5FA', fontSize: 14 },
});
