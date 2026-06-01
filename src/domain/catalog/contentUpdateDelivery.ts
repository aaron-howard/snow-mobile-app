/**
 * Content update notification delivery (Requirement 2.7).
 *
 * "WHEN an Exam's content is updated, THE App SHALL notify enrolled users who
 *  have downloaded that Exam's content for offline use and update the
 *  downloaded content within 24 hours."
 *
 * The decision of *which* notifications are deliverable is a pure function
 * (`planContentUpdateDeliveries`) so it can be exhaustively tested without a
 * database. The orchestrator (`processContentUpdates`) wires that decision to
 * the repositories plus two injected side-effects:
 *   - `refreshContent` — re-downloads the exam's offline content. `useCatalog`
 *     injects the real Expo FileSystem downloader (task 16.10); the default is
 *     a no-op that just bumps the locally-recorded content version.
 *   - `notify` — surfaces the update to the enrolled user (in-app banner now,
 *     push notification once task 12 is wired).
 */

import type {
  ContentUpdateNotificationDTO,
  ContentUpdateNotificationRepository,
  ExamDTO,
  ExamRepository,
} from '@db/repositories/types';

/** Enrolled users must have refreshed content within this window (Req 2.7). */
export const CONTENT_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Minimal exam shape the delivery decision needs. */
export type ExamDownloadState = Pick<
  ExamDTO,
  'id' | 'isEnrolled' | 'contentDownloadedAt' | 'contentVersion'
>;

export interface ContentUpdateDelivery {
  notificationId: string;
  examId: string;
  /** The new content version the device should refresh to. */
  contentVersion: string;
  /** Absolute deadline (ms epoch) to have refreshed the offline content. */
  refreshDeadline: number;
}

/**
 * Decide which unsent content-update notifications should be delivered.
 *
 * A notification is deliverable iff its exam is one the user is currently
 * enrolled in AND has downloaded for offline use AND the published content
 * version differs from what the device already holds. Already-sent
 * notifications, unknown exams, un-enrolled exams, never-downloaded exams, and
 * no-op version matches are all skipped.
 */
export function planContentUpdateDeliveries(
  notifications: readonly ContentUpdateNotificationDTO[],
  exams: readonly ExamDownloadState[],
  now: number,
): ContentUpdateDelivery[] {
  const examById = new Map(exams.map((e) => [e.id, e]));
  const deliveries: ContentUpdateDelivery[] = [];

  for (const n of notifications) {
    if (n.notifiedAt !== null) continue;

    const exam = examById.get(n.examId);
    if (!exam) continue;
    if (!exam.isEnrolled) continue;
    if (exam.contentDownloadedAt === null) continue;
    if (exam.contentVersion === n.contentVersion) continue;

    deliveries.push({
      notificationId: n.id,
      examId: n.examId,
      contentVersion: n.contentVersion,
      refreshDeadline: now + CONTENT_REFRESH_WINDOW_MS,
    });
  }

  return deliveries;
}

export interface ContentUpdateProcessorDeps {
  contentUpdateNotifications: Pick<
    ContentUpdateNotificationRepository,
    'listUnsent' | 'markNotified'
  >;
  exams: Pick<ExamRepository, 'list' | 'markContentDownloaded'>;
  /**
   * Re-download the exam's offline content to the given version. Resolves on
   * success; rejects to leave the notification unsent for a later retry.
   */
  refreshContent?: (examId: string, contentVersion: string) => Promise<void>;
  /** Surface the update to the enrolled user (in-app / push). */
  notify?: (delivery: ContentUpdateDelivery) => void | Promise<void>;
  /** Clock seam for testing. */
  now?: () => number;
}

export interface ContentUpdateRunResult {
  delivered: ContentUpdateDelivery[];
  failures: { notificationId: string; error: unknown }[];
}

const noopRefresh = async (): Promise<void> => {};

/**
 * Detect new content-update records and, for each enrolled user who has the
 * exam downloaded, refresh the offline content, notify the user, and mark the
 * record delivered. A notification is only marked delivered after its content
 * refresh succeeds, so an offline/failed run is safely retried next time.
 */
export async function processContentUpdates(
  deps: ContentUpdateProcessorDeps,
): Promise<ContentUpdateRunResult> {
  const now = deps.now ?? Date.now;
  const refreshContent = deps.refreshContent ?? noopRefresh;

  const [notifications, exams] = await Promise.all([
    deps.contentUpdateNotifications.listUnsent(),
    deps.exams.list(),
  ]);

  const plan = planContentUpdateDeliveries(notifications, exams, now());

  const delivered: ContentUpdateDelivery[] = [];
  const failures: { notificationId: string; error: unknown }[] = [];

  for (const delivery of plan) {
    try {
      await refreshContent(delivery.examId, delivery.contentVersion);
      await deps.exams.markContentDownloaded(
        delivery.examId,
        now(),
        delivery.contentVersion,
      );
      await deps.contentUpdateNotifications.markNotified(delivery.notificationId, now());
      await deps.notify?.(delivery);
      delivered.push(delivery);
    } catch (error) {
      failures.push({ notificationId: delivery.notificationId, error });
    }
  }

  return { delivered, failures };
}
