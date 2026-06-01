import { Hono } from 'hono';
import type { Env } from '../env';
import { getSql } from '../db/client';
import { NeonSyncStore } from '../db/syncStore';
import { pullChanges, pushChanges, type ChangeSet } from '../sync/protocol';

/**
 * WatermelonDB sync routes (https://watermelondb.dev/docs/Sync/Backend).
 *
 * The table policy + orchestration live in `../sync/protocol.ts` (pure,
 * unit-tested); the SQL lives in `../db/syncStore.ts` (NeonSyncStore). These
 * handlers just authenticate (via the `/sync/*` middleware), parse the body,
 * and delegate. Every query is scoped to the authenticated `userId`.
 */

interface PullChangesBody {
  lastPulledAt: number | null;
  schemaVersion: number;
  migration: unknown;
}

interface PushChangesBody {
  changes: ChangeSet;
  lastPulledAt: number | null;
}

export const sync = new Hono<{
  Bindings: Env;
  Variables: { userId: string; sessionId: string };
}>();

sync.post('/pull_changes', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<PullChangesBody>();
  const lastPulledAt = body.lastPulledAt ?? 0;

  const store = new NeonSyncStore(getSql(c.env.DATABASE_URL));
  const { changes, timestamp } = await pullChanges(store, userId, lastPulledAt, Date.now());

  return c.json({ changes, timestamp });
});

sync.post('/push_changes', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<PushChangesBody>();

  const store = new NeonSyncStore(getSql(c.env.DATABASE_URL));
  const result = await pushChanges(store, userId, body.changes ?? {}, Date.now());

  if (result.rejectedTables.length > 0) {
    console.warn('[sync] ignored pushes to pull-only/unknown tables', result.rejectedTables);
  }
  return c.json({ ok: true });
});
