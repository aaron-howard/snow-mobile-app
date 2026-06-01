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
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';

/** Two-step flow: collect email/password, then collect the email-code. */
type Phase = 'collect' | 'verify';

export default function RegisterScreen() {
  const router = useRouter();
  const auth = useAuthService();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
            <ActivityIndicator color={theme.onAccentStrong} />
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
    subtitle: { color: theme.textSecondary, fontSize: 12, marginBottom: 16 },
    body: { color: theme.textBody, fontSize: 15, marginBottom: 12 },
    email: { color: theme.textPrimary, fontWeight: '600' },
    label: { color: theme.textBody, fontSize: 14, marginTop: 12 },
    helper: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
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
    secondaryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
    secondaryButtonText: { color: theme.accent, fontSize: 14 },
    linkRow: { marginTop: 20, alignItems: 'center' },
    link: { color: theme.accent, fontSize: 14 },
  });
