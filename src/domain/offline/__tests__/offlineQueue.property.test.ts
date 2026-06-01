// Feature: servicenow-cert-study-app, Property 23
//
// Property 23 — Offline progress updates are fully queued and retried until
// synchronized: given a set of queued updates and an interruption that fails the
// first N delivery attempts, repeated flushes eventually drain the queue, and
// every update is delivered to the server exactly once.
//
// Validates: Requirements 9.4, 9.5, 9.6.

import fc from 'fast-check';
import { OfflineSyncQueue } from '../OfflineSyncQueue';
import type { ProgressUpdate } from '../types';

function makeUpdate(id: string, i: number): ProgressUpdate {
  return {
    id,
    sessionId: id,
    examId: 'exam-1',
    userId: 'user-1',
    payload: {
      id,
      userId: 'user-1',
      examId: 'exam-1',
      sessionType: 'quiz',
      startedAt: i,
      completedAt: i + 1,
      score: 50,
      totalQuestions: 10,
      correctAnswers: 5,
      durationSeconds: 60,
    },
    createdAt: i,
  };
}

describe('OfflineSyncQueue — Property 23', () => {
  test('retries until every queued update is synchronized exactly once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 20 }),
        fc.nat({ max: 30 }),
        async (ids, failCount) => {
          const updates = ids.map((id, i) => makeUpdate(id, i));

          let attempts = 0;
          const delivered = new Set<string>();
          let doubleDelivered = false;

          const queue = new OfflineSyncQueue(async (update) => {
            attempts += 1;
            if (attempts <= failCount) throw new Error('offline'); // simulated interruption
            if (delivered.has(update.id)) doubleDelivered = true;
            delivered.add(update.id);
          });

          updates.forEach((u) => queue.enqueue(u));

          let guard = 0;
          while (queue.getPendingCount() > 0 && guard < 100) {
            await queue.flush();
            guard += 1;
          }

          return (
            !doubleDelivered &&
            queue.getPendingCount() === 0 &&
            delivered.size === ids.length
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
