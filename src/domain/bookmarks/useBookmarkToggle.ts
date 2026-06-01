import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { syncWithApi } from '@db/sync';
import type { BookmarkableItem } from './types';

function itemKey(itemType: 'question' | 'flashcard', itemId: string): string {
  return `${itemType}|${itemId}`;
}

export interface UseBookmarkToggleResult {
  ready: boolean;
  isBookmarked: (itemType: 'question' | 'flashcard', itemId: string) => boolean;
  toggle: (item: BookmarkableItem) => Promise<void>;
}

/**
 * Per-item bookmark state for a study screen (Requirements 7.1, 7.2, 7.6).
 * Tracks the exam's bookmarks, toggles optimistically against the local DB, and
 * fires a best-effort sync so the change propagates to other devices promptly.
 */
export function useBookmarkToggle(examId: string | undefined): UseBookmarkToggleResult {
  const repos = useMemo(() => createRepositories(), []);
  const { userId, getToken } = useAuth();
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!examId || !userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await repos.bookmarks.listForUserAndExam(userId, examId);
        if (!cancelled) setKeys(new Set(list.map((b) => itemKey(b.itemType, b.itemId))));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, userId, repos]);

  const isBookmarked = useCallback(
    (itemType: 'question' | 'flashcard', itemId: string) => keys.has(itemKey(itemType, itemId)),
    [keys],
  );

  const toggle = useCallback(
    async (item: BookmarkableItem) => {
      if (!userId) return;
      const key = itemKey(item.itemType, item.id);
      const wasBookmarked = keys.has(key);

      // Optimistic update so the icon flips within the 500 ms budget.
      setKeys((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        if (wasBookmarked) {
          const existing = await repos.bookmarks.find(userId, item.itemType, item.id);
          if (existing) await repos.bookmarks.delete(existing.id);
        } else {
          await repos.bookmarks.create({
            userId,
            itemType: item.itemType,
            itemId: item.id,
            examId: item.examId,
            createdAt: Date.now(),
          });
        }
        // Best-effort propagation within 30 s (Req 7.6); ignore offline failures.
        void syncWithApi({ getToken }).catch(() => undefined);
      } catch {
        // Roll back the optimistic change on persistence failure.
        setKeys((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) next.add(key);
          else next.delete(key);
          return next;
        });
      }
    },
    [keys, repos, userId, getToken],
  );

  return { ready, isBookmarked, toggle };
}
