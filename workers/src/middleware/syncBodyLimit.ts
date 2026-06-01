import type { MiddlewareHandler } from 'hono';

/** Max JSON body size for WatermelonDB sync POSTs (pull/push). */
const MAX_SYNC_BODY_BYTES = 5 * 1024 * 1024;

/**
 * Rejects oversized sync payloads before auth/DB work. Requires a numeric
 * Content-Length so the limit cannot be bypassed by omitting the header.
 */
export const syncBodyLimit: MiddlewareHandler = async (c, next) => {
  const raw = c.req.header('content-length');
  if (raw == null || raw.trim() === '') {
    return c.json({ error: 'Content-Length header is required' }, 411);
  }
  const bytes = Number.parseInt(raw, 10);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return c.json({ error: 'invalid Content-Length' }, 400);
  }
  if (bytes > MAX_SYNC_BODY_BYTES) {
    return c.json({ error: 'request body too large' }, 413);
  }
  await next();
};
