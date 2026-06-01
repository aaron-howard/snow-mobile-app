import { Hono } from 'hono';
import type { Env } from './env';
import { clerkAuth } from './middleware/auth';
import { syncBodyLimit } from './middleware/syncBodyLimit';
import { sync } from './routes/sync';

const app = new Hono<{ Bindings: Env }>();

// Health check — public, no auth.
app.get('/', (c) =>
  c.json({
    ok: true,
    service: 'sn-cert-prep-api',
    disclaimer: 'Unofficial. Not affiliated with or endorsed by ServiceNow, Inc.',
  }),
);

// Sync: body size limit runs before JWT verification to save CPU on huge junk requests.
app.use('/sync/*', syncBodyLimit);
// All /sync routes require a valid Clerk session JWT.
app.use('/sync/*', clerkAuth);
app.route('/sync', sync);

// Fallback 404 so the response shape is consistent.
app.notFound((c) => c.json({ error: 'not found' }, 404));

// Hide stack traces; log minimal detail to Worker logs (avoid leaking sensitive data).
app.onError((err, c) => {
  const safe =
    err instanceof Error
      ? { name: err.name, message: err.message }
      : { name: 'non-Error', message: String(err) };
  console.error('[worker] unhandled error', safe);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
