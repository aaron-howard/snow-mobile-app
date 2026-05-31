import { Hono } from 'hono';
import type { Env } from './env';
import { clerkAuth } from './middleware/auth';
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

// All /sync routes require a valid Clerk session JWT.
app.use('/sync/*', clerkAuth);
app.route('/sync', sync);

// Fallback 404 so the response shape is consistent.
app.notFound((c) => c.json({ error: 'not found' }, 404));

// Hide stack traces; log to console for the Worker logs.
app.onError((err, c) => {
  console.error('[worker] unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
