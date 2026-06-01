import type { ProgressUpdate, SyncResult } from './types';

/** Delivers a single update to the server. Rejects if the network is unavailable. */
export type DeliverFn = (update: ProgressUpdate) => Promise<void>;

/**
 * In-memory retry coordinator for progress updates (Requirements 9.4–9.6).
 *
 * Updates are enqueued while offline and flushed on reconnect. A `flush` pass
 * attempts every pending update; successfully delivered ones are removed while
 * failures are retained for the next pass, so the queue is retried until all
 * updates are synchronized. Each update is delivered to the server at most once
 * (it is dropped from the queue only after `deliver` resolves).
 *
 * Note: durable, cross-restart persistence of local writes is provided by
 * WatermelonDB; this queue coordinates delivery/retry timing on top of it.
 */
export class OfflineSyncQueue {
  private pending: ProgressUpdate[] = [];
  private flushing = false;

  constructor(private readonly deliver: DeliverFn) {}

  /** Add an update to the queue. Ignores duplicates by `id`. */
  enqueue(update: ProgressUpdate): void {
    if (this.pending.some((u) => u.id === update.id)) return;
    this.pending.push(update);
  }

  getPendingCount(): number {
    return this.pending.length;
  }

  /**
   * Attempt to deliver every pending update once. Delivered updates are removed;
   * failures stay queued. Concurrent flushes are coalesced (a second call while
   * one is in flight is a no-op that reports the current pending count).
   */
  async flush(): Promise<SyncResult> {
    if (this.flushing) {
      return { syncedCount: 0, failedCount: 0, pendingCount: this.pending.length };
    }
    this.flushing = true;
    let syncedCount = 0;
    let failedCount = 0;
    const remaining: ProgressUpdate[] = [];
    try {
      const batch = [...this.pending];
      for (const update of batch) {
        try {
          await this.deliver(update);
          syncedCount += 1;
        } catch {
          failedCount += 1;
          remaining.push(update);
        }
      }
      this.pending = remaining;
    } finally {
      this.flushing = false;
    }
    return { syncedCount, failedCount, pendingCount: this.pending.length };
  }

  /** Fire-and-forget flush, e.g. from a reconnect listener (Req 9.5, 9.6). */
  retryOnReconnect(): void {
    void this.flush().catch(() => {
      // Swallowed: remaining updates stay queued for the next reconnect.
    });
  }
}
