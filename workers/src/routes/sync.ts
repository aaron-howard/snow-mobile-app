import { Hono } from 'hono';
import type { Env } from '../env';
import { getSql } from '../db/client';

/**
 * WatermelonDB sync routes.
 *
 * Protocol: https://watermelondb.dev/docs/Sync/Backend
 *
 * Status: this file is the SHELL of the implementation. The two routes
 * return well-formed empty-change-set responses so client-side wiring can
 * be tested end-to-end, but the actual per-table SELECT and upsert SQL is
 * not yet written — that happens once the Postgres schema is applied
 * (see `workers/sql/schema.sql`).
 *
 * Each table sync follows the same shape:
 *
 *   pull_changes:
 *     SELECT id, ..., updated_at FROM <table>
 *      WHERE user_id = $1
 *        AND updated_at > $2   -- $2 = lastPulledAt
 *
 *   push_changes (per row):
 *     INSERT INTO <table> (id, ..., user_id) VALUES (...)
 *     ON CONFLICT (id) DO UPDATE SET ... WHERE <table>.user_id = $userId
 *
 * Tables without a `user_id` column (exams, topic_domains, blueprint_skills,
 * questions, answer_choices, decks, flashcards, content_update_notifications)
 * are content tables — server-authored, pulled only, never pushed.
 */

interface PullChangesBody {
  lastPulledAt: number | null;
  schemaVersion: number;
  migration: unknown;
}

interface PushChangesBody {
  changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }>;
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

  // Touch the SQL client so the Neon binding is exercised in the shell.
  // Replace with real per-table queries once schema.sql is applied.
  const _sql = getSql(c.env.DATABASE_URL);
  void _sql;
  void userId;
  void lastPulledAt;

  // Empty change-set + a current server timestamp so the client advances
  // its `lastPulledAt` cursor on every successful round-trip even before
  // the real queries are implemented.
  return c.json({
    changes: {},
    timestamp: Date.now(),
  });
});

sync.post('/push_changes', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<PushChangesBody>();

  const _sql = getSql(c.env.DATABASE_URL);
  void _sql;
  void userId;
  void body;

  // Accept and discard for now — wired end-to-end so the client knows the
  // route exists and returns 200, but no upserts happen yet.
  return c.json({ ok: true });
});
