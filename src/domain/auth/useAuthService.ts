import { useCallback } from 'react';
import { useAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { toAuthError } from './clerkErrors';
import type { AuthResult } from './types';
import { AUTH_TIMEOUT_MS, withTimeout } from './withTimeout';

/**
 * The single React-facing wrapper around Clerk's SDK for this app.
 *
 * Screens never import `useSignIn` / `useSignUp` directly — they go
 * through this hook. The wrapper enforces:
 *
 *  - 3-second budget on every Clerk call (Req 1.6/1.7).
 *  - Stable `AuthResult<T>` shape so screens switch on `error.code`
 *    instead of inspecting raw Clerk error objects.
 *  - Session activation (`setActive`) on success, so the user is fully
 *    signed in before the call returns.
 *
 * The hook is intentionally thin — it does not own UI state (loading,
 * field values, etc.). Screens manage that locally.
 */
export interface AuthService {
  /** True once Clerk has hydrated; some calls no-op until then. */
  isReady: boolean;

  /** Email + password sign-in. Activates the session on success. */
  signInWithEmail(email: string, password: string): Promise<AuthResult<void>>;

  /**
   * Email + password sign-up. Does NOT yet activate a session — the user
   * must verify their email first via `verifyEmailCode`.
   */
  signUpWithEmail(email: string, password: string): Promise<AuthResult<void>>;

  /**
   * Confirm the verification code emailed during sign-up. Activates the
   * session on success.
   */
  verifyEmailCode(code: string): Promise<AuthResult<void>>;

  /** Re-send the verification email for the in-flight sign-up. */
  resendVerificationEmail(): Promise<AuthResult<void>>;

  /** Begin the password-reset flow — Clerk emails a reset code. */
  requestPasswordReset(email: string): Promise<AuthResult<void>>;

  /**
   * Submit the reset code + new password. Activates the session on
   * success so the user lands signed in.
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<AuthResult<void>>;

  /** Sign out. Always returns a void promise (no error path worth surfacing). */
  signOut(): Promise<void>;
}

export function useAuthService(): AuthService {
  const { isLoaded: signInLoaded, signIn, setActive: setActiveFromSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveFromSignUp } = useSignUp();
  const { signOut: clerkSignOut } = useAuth();

  const isReady = signInLoaded && signUpLoaded;

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult<void>> => {
      if (!signIn || !setActiveFromSignIn) {
        return { ok: false, error: { code: 'auth_system_error', message: 'Auth not ready.' } };
      }
      try {
        const result = await withTimeout(
          signIn.create({ identifier: email, password }),
          AUTH_TIMEOUT_MS,
        );
        if (result.status === 'complete' && result.createdSessionId) {
          await setActiveFromSignIn({ session: result.createdSessionId });
          return { ok: true, data: undefined };
        }
        // Anything other than 'complete' means Clerk needs more steps
        // (e.g. unverified email, MFA). Surface as unverified for now —
        // we'll refine when MFA is in scope.
        return {
          ok: false,
          error: { code: 'account_unverified', message: 'Account not yet verified.' },
        };
      } catch (err) {
        return { ok: false, error: toAuthError(err) };
      }
    },
    [signIn, setActiveFromSignIn],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult<void>> => {
      if (!signUp) {
        return { ok: false, error: { code: 'auth_system_error', message: 'Auth not ready.' } };
      }
      try {
        await withTimeout(
          signUp.create({ emailAddress: email, password }),
          AUTH_TIMEOUT_MS,
        );
        await withTimeout(
          signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
          AUTH_TIMEOUT_MS,
        );
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: toAuthError(err) };
      }
    },
    [signUp],
  );

  const verifyEmailCode = useCallback(
    async (code: string): Promise<AuthResult<void>> => {
      if (!signUp || !setActiveFromSignUp) {
        return { ok: false, error: { code: 'auth_system_error', message: 'Auth not ready.' } };
      }
      try {
        const result = await withTimeout(
          signUp.attemptEmailAddressVerification({ code }),
          AUTH_TIMEOUT_MS,
        );
        if (result.status === 'complete' && result.createdSessionId) {
          await setActiveFromSignUp({ session: result.createdSessionId });
          return { ok: true, data: undefined };
        }
        return {
          ok: false,
          error: { code: 'verification_code_invalid', message: 'Code could not be verified.' },
        };
      } catch (err) {
        return { ok: false, error: toAuthError(err) };
      }
    },
    [signUp, setActiveFromSignUp],
  );

  const resendVerificationEmail = useCallback(async (): Promise<AuthResult<void>> => {
    if (!signUp) {
      return { ok: false, error: { code: 'auth_system_error', message: 'Auth not ready.' } };
    }
    try {
      await withTimeout(
        signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
        AUTH_TIMEOUT_MS,
      );
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toAuthError(err) };
    }
  }, [signUp]);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<AuthResult<void>> => {
      if (!signIn) {
        return { ok: false, error: { code: 'auth_system_error', message: 'Auth not ready.' } };
      }
      try {
        await withTimeout(
          signIn.create({ strategy: 'reset_password_email_code', identifier: email }),
          AUTH_TIMEOUT_MS,
        );
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: toAuthError(err) };
      }
    },
    [signIn],
  );

  const confirmPasswordReset = useCallback(
    async (code: string, newPassword: string): Promise<AuthResult<void>> => {
      if (!signIn || !setActiveFromSignIn) {
        return { ok: false, error: { code: 'auth_system_error', message: 'Auth not ready.' } };
      }
      try {
        const result = await withTimeout(
          signIn.attemptFirstFactor({
            strategy: 'reset_password_email_code',
            code,
            password: newPassword,
          }),
          AUTH_TIMEOUT_MS,
        );
        if (result.status === 'complete' && result.createdSessionId) {
          await setActiveFromSignIn({ session: result.createdSessionId });
          return { ok: true, data: undefined };
        }
        return {
          ok: false,
          error: { code: 'reset_link_expired', message: 'Could not complete password reset.' },
        };
      } catch (err) {
        return { ok: false, error: toAuthError(err) };
      }
    },
    [signIn, setActiveFromSignIn],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await clerkSignOut();
    } catch (err) {
      // Sign-out failures are extremely rare and not worth blocking the
      // UI on — just log and move on. The local session will time out.
      // eslint-disable-next-line no-console
      console.warn('[auth] signOut failed', err);
    }
  }, [clerkSignOut]);

  return {
    isReady,
    signInWithEmail,
    signUpWithEmail,
    verifyEmailCode,
    resendVerificationEmail,
    requestPasswordReset,
    confirmPasswordReset,
    signOut,
  };
}
