import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { syncWithApi } from '@db/sync';
import { BookmarkService } from './BookmarkService';
import type { BookmarkRecord } from './types';

export interface ExamBookmarkGroup {
  examId: string;
  examName: string;
  questionCount: number;
  flashcardCount: number;
  /** All bookmarks for this exam, most-recent-first. */
  bookmarks: BookmarkRecord[];
}

export interface UseBookmarksResult {
  loading: boolean;
  error: string | null;
  groups: ExamBookmarkGroup[];
  removeBookmark: (bookmark: BookmarkRecord) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Loads the user's bookmarks for the management screen (Requirements 7.3, 7.6):
 * grouped by exam, each group sorted most-recent-first, with exam names and
 * per-type counts. Removing a bookmark persists locally and triggers a sync.
 */
export function useBookmarks(): UseBookmarksResult {
  const repos = useMemo(() => createRepositories(), []);
  const { userId, getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ExamBookmarkGroup[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setError('You must be signed in to view bookmarks.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await repos.bookmarks.listForUser(userId);
      const sorted = BookmarkService.sortByDateDescending(all);
      const byExam = BookmarkService.groupByExam(sorted);

      const examIds = [...byExam.keys()];
      const exams = await Promise.all(examIds.map((id) => repos.exams.getById(id)));
      const nameById = new Map(examIds.map((id, i) => [id, exams[i]?.name ?? 'Unknown exam']));

      const built: ExamBookmarkGroup[] = examIds.map((examId) => {
        const bookmarks = byExam.get(examId) ?? [];
        return {
          examId,
          examName: nameById.get(examId) ?? 'Unknown exam',
          questionCount: bookmarks.filter((b) => b.itemType === 'question').length,
          flashcardCount: bookmarks.filter((b) => b.itemType === 'flashcard').length,
          bookmarks,
        };
      });
      // Groups ordered by their most-recent bookmark (the list is already sorted).
      setGroups(built);
    } catch {
      setError('Could not load your bookmarks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [repos, userId]);

  useEffect(() => {
    void load();
    // Pull any bookmarks made on other devices (Req 7.6); best-effort.
    void syncWithApi({ getToken })
      .then(() => load())
      .catch(() => undefined);
  }, [load, getToken]);

  const removeBookmark = useCallback(
    async (bookmark: BookmarkRecord) => {
      setGroups((prev) =>
        prev
          .map((g) =>
            g.examId === bookmark.examId
              ? {
                  ...g,
                  bookmarks: g.bookmarks.filter((b) => b.id !== bookmark.id),
                  questionCount:
                    g.questionCount - (bookmark.itemType === 'question' ? 1 : 0),
                  flashcardCount:
                    g.flashcardCount - (bookmark.itemType === 'flashcard' ? 1 : 0),
                }
              : g,
          )
          .filter((g) => g.bookmarks.length > 0),
      );
      try {
        await repos.bookmarks.delete(bookmark.id);
        void syncWithApi({ getToken }).catch(() => undefined);
      } catch {
        // Reload to restore consistent state if the delete failed.
        await load();
      }
    },
    [repos, getToken, load],
  );

  return { loading, error, groups, removeBookmark, refresh: load };
}
