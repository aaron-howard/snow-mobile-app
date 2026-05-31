/**
 * Sentinel error thrown when an auth operation exceeds its time budget.
 * Caught at the auth-service boundary and mapped to `AuthErrorCode.timeout`.
 */
export class AuthTimeoutError extends Error {
  readonly isAuthTimeout = true as const;

  constructor(message = 'auth operation timed out') {
    super(message);
    this.name = 'AuthTimeoutError';
  }
}

/**
 * Reject the returned promise with `AuthTimeoutError` if `promise` does
 * not settle within `ms`. Per Requirement 1.6/1.7, the budget for auth
 * operations is 3 seconds.
 *
 * Note: this does NOT cancel the underlying Clerk request — Clerk's SDK
 * may still complete in the background. From the user's perspective the
 * timeout is what matters; we surface the error and let the next attempt
 * win the race if it eventually arrives.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuthTimeoutError()), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const AUTH_TIMEOUT_MS = 3_000;
