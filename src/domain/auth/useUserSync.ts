import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { createRepositories } from '../../db/repositories';

/**
 * Mirrors the signed-in Clerk user into the local `users` table.
 *
 * Mount this once at the root layout. Whenever Clerk's `user` becomes
 * available, we upsert a row keyed by the Clerk user ID. From that
 * point on, all progress data (study sessions, attempts, bookmarks)
 * can be FK-linked to a real local user record.
 *
 * We don't try to push the row back to Postgres here — the WatermelonDB
 * sync will pick it up on the next stable connection.
 */
export function useUserSync(): void {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const repos = createRepositories();
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    const displayName =
      user.firstName ?? user.username ?? email.split('@')[0] ?? 'Student';

    void repos.users
      .upsert({
        id: user.id,
        email,
        displayName,
        createdAt: user.createdAt?.getTime() ?? Date.now(),
        streakCurrent: 0,
        streakLongest: 0,
        totalQuestionsAnswered: 0,
        totalStudySessions: 0,
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[auth] user upsert failed', err);
      });
  }, [isLoaded, user]);
}
