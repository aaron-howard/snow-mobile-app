/**
 * WatermelonDB ↔ Cloudflare Worker (Hono) ↔ Neon Postgres sync.
 *
 * Implements the requirement that sync begins within 60 seconds of a stable
 * connection (≥5 consecutive seconds), per Req 9.5–9.6. The connectivity-
 * watcher logic lives here so any caller (root layout, background task)
 * can trigger and observe sync without re-implementing the debounce.
 *
 * Server side: two Hono routes, `POST /sync/pull_changes` and
 * `POST /sync/push_changes`. They follow the WatermelonDB sync protocol
 * documented at https://watermelondb.dev/docs/Sync/Backend. The Worker
 * verifies the Clerk session JWT, then runs Neon Postgres queries scoped
 * by the authenticated `user_id`. The Worker source lives under `workers/`.
 */

import { synchronize, type SyncDatabaseChangeSet, type SyncPullArgs } from '@nozbe/watermelondb/sync';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { database } from './database';
import { apiClient, type ApiClient } from '../api/client';

const STABLE_CONNECTION_MS = 5_000; // ≥5 consecutive seconds (Req 9.5)
const SYNC_DEBOUNCE_MS = 60_000; // begin sync within 60 seconds (Req 9.5)

interface PullChangesResponse {
  changes: SyncDatabaseChangeSet;
  timestamp: number;
}

interface PullChangesRequest {
  lastPulledAt: number | null;
  schemaVersion: number;
  migration: SyncPullArgs['migration'];
}

interface PushChangesRequest {
  changes: SyncDatabaseChangeSet;
  lastPulledAt: number | null;
}

/** A function that returns a fresh Clerk session JWT (or null if unauthenticated). */
export type GetTokenFn = () => Promise<string | null>;

export interface SyncOptions {
  getToken: GetTokenFn;
  client?: ApiClient;
}

/**
 * Run a single sync cycle. Safe to call concurrently — WatermelonDB
 * serializes overlapping syncs internally.
 *
 * Throws if no Clerk session is available; the caller should ignore the
 * error and try again after the user signs in.
 */
export async function syncWithApi(opts: SyncOptions): Promise<void> {
  const client = opts.client ?? apiClient;

  const requireToken = async (): Promise<string> => {
    const token = await opts.getToken();
    if (!token) throw new Error('sync: no Clerk session — user not signed in');
    return token;
  };

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }: SyncPullArgs) => {
      const token = await requireToken();
      const response = await client.post<PullChangesRequest, PullChangesResponse>(
        '/sync/pull_changes',
        // WatermelonDB types `lastPulledAt` as optional; coerce to null for the wire.
        { lastPulledAt: lastPulledAt ?? null, schemaVersion, migration },
        { token },
      );
      return { changes: response.changes, timestamp: response.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const token = await requireToken();
      await client.post<PushChangesRequest, { ok: true }>(
        '/sync/push_changes',
        { changes, lastPulledAt: lastPulledAt ?? null },
        { token },
      );
    },
    // Conservative defaults — when an exam content update arrives we want
    // local copies overridden, not preserved as conflicts.
    sendCreatedAsUpdated: true,
  });
}

// -----------------------------------------------------------------------
// Connectivity watcher — owns the "stable ≥5s, then trigger within 60s" rule.
// -----------------------------------------------------------------------

interface WatcherHandle {
  /** Stop watching. */
  unsubscribe: () => void;
  /** Force a sync attempt now (e.g. user pull-to-refresh). */
  triggerNow: () => void;
}

/**
 * Start watching connectivity. Returns a handle to unsubscribe.
 *
 * The watcher idles with zero work while offline — we use timers and clear
 * them on disconnect rather than polling.
 */
export function startSyncWatcher(opts: SyncOptions): WatcherHandle {
  let stableSinceMs: number | null = null;
  let stableTimer: ReturnType<typeof setTimeout> | null = null;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSync = false;

  const clearTimers = () => {
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  };

  const runSync = () => {
    if (pendingSync) return;
    pendingSync = true;
    syncWithApi(opts)
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[sync] sync attempt failed', err);
      })
      .finally(() => {
        pendingSync = false;
      });
  };

  const onState = (state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      if (stableSinceMs === null) {
        stableSinceMs = Date.now();
        stableTimer = setTimeout(() => {
          // ≥5 consecutive seconds confirmed: schedule the sync trigger
          // within 60 seconds. We pick a small jitter so reconnect stampedes
          // (lots of devices coming online at once) don't pile on the Worker.
          const jitter = Math.floor(Math.random() * 10_000);
          syncTimer = setTimeout(runSync, Math.min(SYNC_DEBOUNCE_MS, 10_000 + jitter));
        }, STABLE_CONNECTION_MS);
      }
    } else {
      stableSinceMs = null;
      clearTimers();
    }
  };

  const unsubscribe = NetInfo.addEventListener(onState);

  return {
    unsubscribe: () => {
      unsubscribe();
      clearTimers();
    },
    triggerNow: () => {
      clearTimers();
      runSync();
    },
  };
}
