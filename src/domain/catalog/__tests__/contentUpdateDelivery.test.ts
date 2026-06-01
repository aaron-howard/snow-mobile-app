// Feature: servicenow-cert-study-app, Task 4.6
//
// Content update notification delivery for enrolled users (Requirement 2.7).

import type {
  ContentUpdateNotificationDTO,
  ExamDTO,
} from '@db/repositories/types';
import {
  CONTENT_REFRESH_WINDOW_MS,
  ContentUpdateDelivery,
  ExamDownloadState,
  planContentUpdateDeliveries,
  processContentUpdates,
} from '../contentUpdateDelivery';

const NOW = 1_700_000_000_000;

function exam(overrides: Partial<ExamDownloadState> = {}): ExamDownloadState {
  return {
    id: 'exam-1',
    isEnrolled: true,
    contentDownloadedAt: NOW - 5_000,
    contentVersion: '1',
    ...overrides,
  };
}

function notification(
  overrides: Partial<ContentUpdateNotificationDTO> = {},
): ContentUpdateNotificationDTO {
  return {
    id: 'cun-1',
    examId: 'exam-1',
    contentVersion: '2',
    publishedAt: NOW - 1_000,
    notifiedAt: null,
    ...overrides,
  };
}

describe('planContentUpdateDeliveries — Requirement 2.7', () => {
  test('delivers when enrolled, downloaded, and version changed', () => {
    const out = planContentUpdateDeliveries([notification()], [exam()], NOW);
    expect(out).toEqual<ContentUpdateDelivery[]>([
      {
        notificationId: 'cun-1',
        examId: 'exam-1',
        contentVersion: '2',
        refreshDeadline: NOW + CONTENT_REFRESH_WINDOW_MS,
      },
    ]);
  });

  test('skips notifications that were already sent', () => {
    const out = planContentUpdateDeliveries(
      [notification({ notifiedAt: NOW - 100 })],
      [exam()],
      NOW,
    );
    expect(out).toEqual([]);
  });

  test('skips exams the user is not enrolled in', () => {
    const out = planContentUpdateDeliveries([notification()], [exam({ isEnrolled: false })], NOW);
    expect(out).toEqual([]);
  });

  test('skips exams that have not been downloaded for offline use', () => {
    const out = planContentUpdateDeliveries(
      [notification()],
      [exam({ contentDownloadedAt: null })],
      NOW,
    );
    expect(out).toEqual([]);
  });

  test('skips when the device already has the published version', () => {
    const out = planContentUpdateDeliveries(
      [notification({ contentVersion: '1' })],
      [exam({ contentVersion: '1' })],
      NOW,
    );
    expect(out).toEqual([]);
  });

  test('skips notifications referencing an unknown exam', () => {
    const out = planContentUpdateDeliveries([notification({ examId: 'ghost' })], [exam()], NOW);
    expect(out).toEqual([]);
  });

  test('sets the refresh deadline 24 hours out', () => {
    const out = planContentUpdateDeliveries([notification()], [exam()], NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.refreshDeadline - NOW).toBe(24 * 60 * 60 * 1000);
  });
});

describe('processContentUpdates — Requirement 2.7', () => {
  function fullExam(overrides: Partial<ExamDTO> = {}): ExamDTO {
    return {
      id: 'exam-1',
      name: 'CSA',
      certificationLevel: 'Associate',
      estimatedStudyHours: 40,
      officialDurationMinutes: 90,
      officialQuestionCount: 60,
      officialPassingScore: 70,
      minimumQuestionCount: 60,
      contentVersion: '1',
      contentDownloadedAt: NOW - 5_000,
      isEnrolled: true,
      enrolledAt: NOW - 10_000,
      ...overrides,
    };
  }

  function makeDeps() {
    const markNotified = jest.fn().mockResolvedValue(undefined);
    const markContentDownloaded = jest.fn().mockResolvedValue(undefined);
    const refreshContent = jest.fn().mockResolvedValue(undefined);
    const notify = jest.fn();
    const listUnsent = jest.fn().mockResolvedValue([notification()]);
    const list = jest.fn().mockResolvedValue([fullExam()]);
    return {
      deps: {
        contentUpdateNotifications: { listUnsent, markNotified },
        exams: { list, markContentDownloaded },
        refreshContent,
        notify,
        now: () => NOW,
      },
      spies: { markNotified, markContentDownloaded, refreshContent, notify, listUnsent, list },
    };
  }

  test('refreshes content, marks downloaded, notifies, then marks delivered', async () => {
    const { deps, spies } = makeDeps();
    const result = await processContentUpdates(deps);

    expect(spies.refreshContent).toHaveBeenCalledWith('exam-1', '2');
    expect(spies.markContentDownloaded).toHaveBeenCalledWith('exam-1', NOW, '2');
    expect(spies.markNotified).toHaveBeenCalledWith('cun-1', NOW);
    expect(spies.notify).toHaveBeenCalledTimes(1);
    expect(result.delivered).toHaveLength(1);
    expect(result.failures).toHaveLength(0);
  });

  test('does not mark notified when content refresh fails (safe retry)', async () => {
    const { deps, spies } = makeDeps();
    spies.refreshContent.mockRejectedValueOnce(new Error('offline'));

    const result = await processContentUpdates(deps);

    expect(spies.markContentDownloaded).not.toHaveBeenCalled();
    expect(spies.markNotified).not.toHaveBeenCalled();
    expect(spies.notify).not.toHaveBeenCalled();
    expect(result.delivered).toHaveLength(0);
    expect(result.failures).toEqual([
      { notificationId: 'cun-1', error: expect.any(Error) },
    ]);
  });

  test('delivers nothing when there are no eligible notifications', async () => {
    const { deps, spies } = makeDeps();
    spies.list.mockResolvedValueOnce([fullExam({ contentDownloadedAt: null })]);

    const result = await processContentUpdates(deps);

    expect(spies.refreshContent).not.toHaveBeenCalled();
    expect(spies.markNotified).not.toHaveBeenCalled();
    expect(result.delivered).toHaveLength(0);
  });
});
