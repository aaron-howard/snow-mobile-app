/**
 * Shared types for the auth domain.
 */

export interface LockoutResult {
  /** True if the account should be considered locked right now. */
  locked: boolean;
  /**
   * If locked, the timestamp at which the lock expires. Computed as
   * (time of the 5th failed attempt in the qualifying window) + lockDurationMs.
   * `null` when the account is not locked.
   */
  lockedUntil: Date | null;
}

export interface LockoutOptions {
  /** Rolling window over which to count failed attempts (ms). Default 10 min. */
  windowMs: number;
  /** How long the lock lasts once triggered (ms). Default 15 min. */
  lockDurationMs: number;
}

/** Result shape for auth-service calls. Avoids throwing across the React boundary. */
export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: AuthError };

export interface AuthError {
  /** Stable code consumed by UI logic (switch on this, never on message). */
  code: AuthErrorCode;
  /** Human-readable message safe to show to the user. */
  message: string;
}

export type AuthErrorCode =
  | 'timeout' // Req 1.6/1.7: the 3-second budget was exceeded
  | 'invalid_credentials' // Req 1.9
  | 'account_locked' // Req 1.10
  | 'account_unverified' // Req 1.8
  | 'email_in_use' // Req 1.2
  | 'password_too_short' // Req 1.3
  | 'password_too_long' // Req 1.3
  | 'verification_code_invalid'
  | 'reset_link_expired' // Req 1.11
  | 'social_provider_error' // Req 1.13
  | 'auth_system_error' // Req 1.5 — Clerk JWKS down, etc.
  | 'unknown';
