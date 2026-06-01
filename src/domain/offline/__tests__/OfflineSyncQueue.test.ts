import { OfflineSyncQueue } from '../OfflineSyncQueue';
import type { ProgressUpdate } from '../types';

function update(id: string): ProgressUpdate {
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
      startedAt: 0,
      completedAt: 1,
      score: 80,
      totalQuestions: 10,
      correctAnswers: 8,
      durationSeconds: 120,
    },
    createdAt: 0,
  };
}

describe('OfflineSyncQueue', () => {
  test('enqueue ignores duplicate ids', () => {
    const queue = new OfflineSyncQueue(async () => undefined);
    queue.enqueue(update('a'));
    queue.enqueue(update('a'));
    expect(queue.getPendingCount()).toBe(1);
  });

  test('flush delivers all when online and empties the queue', async () => {
    const delivered: string[] = [];
    const queue = new OfflineSyncQueue(async (u) => {
      delivered.push(u.id);
    });
    queue.enqueue(update('a'));
    queue.enqueue(update('b'));

    const result = await queue.flush();
    expect(result).toEqual({ syncedCount: 2, failedCount: 0, pendingCount: 0 });
    expect(delivered).toEqual(['a', 'b']);
    expect(queue.getPendingCount()).toBe(0);
  });

  test('failed deliveries stay queued and are retried', async () => {
    let online = false;
    const queue = new OfflineSyncQueue(async () => {
      if (!online) throw new Error('offline');
    });
    queue.enqueue(update('a'));
    queue.enqueue(update('b'));

    const first = await queue.flush();
    expect(first.failedCount).toBe(2);
    expect(queue.getPendingCount()).toBe(2);

    online = true;
    const second = await queue.flush();
    expect(second.syncedCount).toBe(2);
    expect(queue.getPendingCount()).toBe(0);
  });

  test('retryOnReconnect drains the queue', async () => {
    const queue = new OfflineSyncQueue(async () => undefined);
    queue.enqueue(update('a'));
    queue.retryOnReconnect();
    // Allow the fire-and-forget flush microtask to settle.
    await Promise.resolve();
    await Promise.resolve();
    expect(queue.getPendingCount()).toBe(0);
  });
});
