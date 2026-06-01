import type { AuthError, AuthErrorCode } from './types';
import { AuthTimeoutError } from './withTimeout';

/**
 * Translate Clerk SDK errors into our stable `AuthError` shape.
 *
 * Why: screens switch on `error.code` to decide what UI to show. Clerk's
 * raw error codes change occasionally; this module is the single place
 * that needs to track them.
 *
 * Reference: https://clerk.com/docs/errors/overview
 */

/** Clerk errors are objects with an `errors[]` array. Narrow defensively. */
interface ClerkErrorShape {
  errors: {
    code?: string;
    message?: string;
    longMessage?: string;
  }[];
}

function isClerkError(err: unknown): err is ClerkErrorShape {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as { errors: unknown }).errors)
  );
}

/**
 * Maps Clerk error codes → our AuthErrorCode. The first matching Clerk
 * code in the error list wins. Unknown codes fall through to 'unknown'.
 */
function mapClerkErrorCode(clerkCode: string): AuthErrorCode {
  switch (clerkCode) {
    case 'form_identifier_not_found':
    case 'form_password_incorrect':
    case 'form_password_pwned':
      return 'invalid_credentials';
    case 'form_identifier_exists':
      return 'email_in_use';
    case 'form_password_length_too_short':
      return 'password_too_short';
    case 'form_password_size_in_bytes_exceeded':
    case 'form_password_length_too_long':
      return 'password_too_long';
    case 'verification_expired':
    case 'verification_failed':
    case 'form_code_incorrect':
      return 'verification_code_invalid';
    case 'reset_password_code_invalid':
    case 'reset_password_code_expired':
      return 'reset_link_expired';
    case 'oauth_callback_invalid':
    case 'oauth_access_denied':
    case 'oauth_token_invalid':
    case 'external_account_not_found':
      return 'social_provider_error';
    case 'user_locked':
    case 'too_many_requests':
      return 'account_locked';
    case 'identification_unverified':
    case 'verification_unverified':
      return 'account_unverified';
    default:
      return 'unknown';
  }
}

/** Fallback user-facing messages, keyed by AuthErrorCode. */
const DEFAULT_MESSAGES: Record<AuthErrorCode, string> = {
  timeout: 'The server took too long to respond. Please try again.',
  invalid_credentials: 'Email or password is incorrect.',
  account_locked:
    'This account is temporarily locked due to too many failed attempts. Try again later.',
  account_unverified:
    'Please verify your email address before signing in. Check your inbox for the verification link.',
  email_in_use: 'An account with this email already exists.',
  password_too_short: 'Password must be at least 8 characters long.',
  password_too_long: 'Password must be no more than 128 characters long.',
  verification_code_invalid: 'That code is incorrect or has expired. Please request a new one.',
  reset_link_expired: 'This password-reset link has expired. Please request a new one.',
  social_provider_error:
    'There was a problem signing in with that provider. Please try email and password instead.',
  auth_system_error: 'Authentication is temporarily unavailable. Please try again in a moment.',
  unknown: 'Something went wrong. Please try again.',
};

export function toAuthError(err: unknown): AuthError {
  if (err instanceof AuthTimeoutError) {
    return { code: 'timeout', message: DEFAULT_MESSAGES.timeout };
  }

  if (isClerkError(err) && err.errors.length > 0) {
    for (const e of err.errors) {
      if (!e.code) continue;
      const code = mapClerkErrorCode(e.code);
      if (code !== 'unknown') {
        return {
          code,
          message: e.longMessage ?? e.message ?? DEFAULT_MESSAGES[code],
        };
      }
    }
    // No matched code — surface the first message verbatim.
    const first = err.errors[0];
    return {
      code: 'unknown',
      message: first?.longMessage ?? first?.message ?? DEFAULT_MESSAGES.unknown,
    };
  }

  return { code: 'unknown', message: DEFAULT_MESSAGES.unknown };
}
