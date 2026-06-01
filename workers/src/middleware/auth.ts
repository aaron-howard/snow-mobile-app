import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '@clerk/backend';
import type { Env } from '../env';

/**
 * Hono middleware that verifies the Clerk session JWT on every request.
 *
 * On success, sets two context variables:
 *   - `userId`: the Clerk user ID (use this to scope DB queries)
 *   - `sessionId`: the Clerk session ID (handy for audit logs)
 *
 * On failure, returns 401 immediately.
 *
 * We verify the JWT against Clerk's JWKS (via `@clerk/backend.verifyToken`)
 * — no shared secrets need to be shipped to the client, only Clerk's
 * publishable key (already public by design).
 */
export const clerkAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: { userId: string; sessionId: string };
}> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) {
    return c.json({ error: 'missing or malformed Authorization header' }, 401);
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return c.json({ error: 'empty bearer token' }, 401);
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });
    const userId = payload.sub;
    const sessionId = payload.sid;
    if (!userId || typeof userId !== 'string') {
      return c.json({ error: 'token missing subject' }, 401);
    }
    c.set('userId', userId);
    c.set('sessionId', typeof sessionId === 'string' ? sessionId : '');
    await next();
  } catch (err) {
    // Don't leak verification details to clients or verbose logs.
    const safe =
      err instanceof Error
        ? { name: err.name, message: err.message }
        : { name: 'non-Error', message: String(err) };
    console.warn('[auth] token verification failed', safe);
    return c.json({ error: 'invalid token' }, 401);
  }
};
