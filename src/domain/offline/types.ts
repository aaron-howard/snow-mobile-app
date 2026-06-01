import type { StudySessionDTO } from '@db/repositories/types';

/**
 * A progress update waiting to be synchronized to the server. While offline,
 * updates accumulate locally; on reconnect they are flushed and retried until
 * every one is delivered (Requirements 9.4–9.6).
 */
export interface ProgressUpdate {
  /** Unique queue identity so each update is delivered exactly once. */
  id: string;
  sessionId: string;
  examId: string;
  userId: string;
  payload: StudySessionDTO;
  /** Epoch ms the update was enqueued. */
  createdAt: number;
}

/** Outcome of a single {@link OfflineSyncQueue.flush} pass. */
export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  pendingCount: number;
}
