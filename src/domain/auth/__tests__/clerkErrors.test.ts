import { toAuthError } from '../clerkErrors';
import { AuthTimeoutError } from '../withTimeout';

describe('toAuthError', () => {
  test('maps AuthTimeoutError to code "timeout"', () => {
    expect(toAuthError(new AuthTimeoutError()).code).toBe('timeout');
  });

  describe('Clerk SDK errors', () => {
    test('maps form_password_incorrect to invalid_credentials', () => {
      const err = { errors: [{ code: 'form_password_incorrect', message: 'wrong' }] };
      expect(toAuthError(err).code).toBe('invalid_credentials');
    });

    test('maps form_identifier_not_found to invalid_credentials', () => {
      const err = { errors: [{ code: 'form_identifier_not_found', message: 'nope' }] };
      expect(toAuthError(err).code).toBe('invalid_credentials');
    });

    test('maps form_identifier_exists to email_in_use', () => {
      const err = { errors: [{ code: 'form_identifier_exists', message: 'dupe' }] };
      expect(toAuthError(err).code).toBe('email_in_use');
    });

    test('maps form_password_length_too_short to password_too_short', () => {
      const err = { errors: [{ code: 'form_password_length_too_short', message: 'short' }] };
      expect(toAuthError(err).code).toBe('password_too_short');
    });

    test('maps form_password_size_in_bytes_exceeded to password_too_long', () => {
      const err = { errors: [{ code: 'form_password_size_in_bytes_exceeded', message: 'long' }] };
      expect(toAuthError(err).code).toBe('password_too_long');
    });

    test('maps verification_expired to verification_code_invalid', () => {
      const err = { errors: [{ code: 'verification_expired', message: 'expired' }] };
      expect(toAuthError(err).code).toBe('verification_code_invalid');
    });

    test('maps reset_password_code_expired to reset_link_expired', () => {
      const err = { errors: [{ code: 'reset_password_code_expired', message: 'expired' }] };
      expect(toAuthError(err).code).toBe('reset_link_expired');
    });

    test('maps oauth_access_denied to social_provider_error', () => {
      const err = { errors: [{ code: 'oauth_access_denied', message: 'denied' }] };
      expect(toAuthError(err).code).toBe('social_provider_error');
    });

    test('maps user_locked to account_locked', () => {
      const err = { errors: [{ code: 'user_locked', message: 'locked' }] };
      expect(toAuthError(err).code).toBe('account_locked');
    });

    test('maps identification_unverified to account_unverified', () => {
      const err = { errors: [{ code: 'identification_unverified', message: 'unverified' }] };
      expect(toAuthError(err).code).toBe('account_unverified');
    });

    test('prefers longMessage over message when both are present', () => {
      const err = {
        errors: [
          { code: 'form_password_incorrect', message: 'short', longMessage: 'verbose message' },
        ],
      };
      expect(toAuthError(err).message).toBe('verbose message');
    });

    test('returns the first known code when multiple errors are present', () => {
      const err = {
        errors: [
          { code: 'unknown_clerk_code' },
          { code: 'form_password_incorrect', message: 'wrong' },
        ],
      };
      expect(toAuthError(err).code).toBe('invalid_credentials');
    });

    test('falls through to unknown when no Clerk code matches', () => {
      const err = { errors: [{ code: 'completely_new_clerk_error', message: 'huh' }] };
      const out = toAuthError(err);
      expect(out.code).toBe('unknown');
      // Surfaces the raw message as the user-visible text.
      expect(out.message).toBe('huh');
    });

    test('uses a default message when no message or longMessage is provided', () => {
      const err = { errors: [{ code: 'form_password_incorrect' }] };
      expect(toAuthError(err).message).toMatch(/email or password is incorrect/i);
    });
  });

  describe('non-Clerk errors', () => {
    test('returns unknown for plain Errors', () => {
      expect(toAuthError(new Error('something broke')).code).toBe('unknown');
    });

    test('returns unknown for null', () => {
      expect(toAuthError(null).code).toBe('unknown');
    });

    test('returns unknown for objects without an errors array', () => {
      expect(toAuthError({ message: 'not a Clerk error' }).code).toBe('unknown');
    });

    test('returns unknown for an empty Clerk errors array', () => {
      expect(toAuthError({ errors: [] }).code).toBe('unknown');
    });
  });
});
