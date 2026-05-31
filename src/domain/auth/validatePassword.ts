/**
 * Password length validation per Requirement 1.3:
 *
 *   "WHEN a user submits a password shorter than 8 characters or longer
 *    than 128 characters, THE App SHALL display an error message
 *    specifying the password length requirements."
 *
 * Pure function. No trim, no Unicode normalisation — we validate the raw
 * string the user submitted. Whitespace-padded passwords are unusual but
 * not malformed; we trust the user.
 *
 * Validates: Property 1.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function validatePassword(s: string): boolean {
  // Property 1: accept iff length in [MIN, MAX] inclusive.
  return s.length >= MIN_PASSWORD_LENGTH && s.length <= MAX_PASSWORD_LENGTH;
}
