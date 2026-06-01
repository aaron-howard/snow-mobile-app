import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRepositories } from '@db/repositories';
import type { ExamDTO, TopicDomainDTO } from '@db/repositories/types';
import { EnrollmentGuard } from '@domain/enrollment';
import { loadDomainSelections, persistDomainSelections } from './domainSelectionStorage';
import { processContentUpdates, type ContentUpdateDelivery } from './contentUpdateDelivery';

export interface CatalogDetail {
  examId: string;
  domains: TopicDomainDTO[];
  publishedQuestionCount: number;
}

export interface UseCatalogResult {
  exams: ExamDTO[];
  loading: boolean;
  loadError: string | null;
  enrollError: string | null;
  clearEnrollError: () => void;
  selectedExamId: string | null;
  selectExam: (examId: string | null) => void;
  detail: CatalogDetail | null;
  detailLoading: boolean;
  /** Per-exam selected domain id, or `null` when studying all domains. */
  domainByExam: Record<string, string | null>;
  setDomainForExam: (examId: string, domainId: string | null) => Promise<void>;
  enrollmentLimitVisible: boolean;
  dismissEnrollmentLimit: () => void;
  enroll: (examId: string) => Promise<void>;
  /** Pending content-update notices for enrolled, downloaded exams (Req 2.7). */
  contentUpdates: ContentUpdateDelivery[];
  dismissContentUpdate: (notificationId: string) => void;
  refresh: () => Promise<void>;
}

export function useCatalog(): UseCatalogResult {
  const repos = useMemo(() => createRepositories(), []);

  const [exams, setExams] = useState<ExamDTO[]>([]);
  const [domainByExam, setDomainByExam] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrollmentLimitVisible, setEnrollmentLimitVisible] = useState(false);
  const [contentUpdates, setContentUpdates] = useState<ContentUpdateDelivery[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Deliver any pending content updates before reading the catalog so the
      // list reflects refreshed content versions (Req 2.7). The actual offline
      // binary download is wired in task 13.5; failures retry on next refresh.
      try {
        const result = await processContentUpdates({
          contentUpdateNotifications: repos.contentUpdateNotifications,
          exams: repos.exams,
        });
        if (result.delivered.length > 0) {
          setContentUpdates((prev) => {
            const known = new Set(prev.map((d) => d.notificationId));
            return [...prev, ...result.delivered.filter((d) => !known.has(d.notificationId))];
          });
        }
      } catch {
        // Non-fatal: content-update delivery is retried on the next refresh.
      }

      const [list, selections] = await Promise.all([repos.exams.list(), loadDomainSelections()]);
      setExams(list);
      setDomainByExam(selections);
    } catch {
      setLoadError('Could not load the exam catalog. Pull to refresh or try again later.');
    } finally {
      setLoading(false);
    }
  }, [repos]);

  const dismissContentUpdate = useCallback((notificationId: string) => {
    setContentUpdates((prev) => prev.filter((d) => d.notificationId !== notificationId));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedExamId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const [domains, publishedQuestionCount] = await Promise.all([
          repos.topicDomains.listByExam(selectedExamId),
          repos.questions.countPublishedForExam(selectedExamId),
        ]);
        if (!cancelled) {
          setDetail({ examId: selectedExamId, domains, publishedQuestionCount });
        }
      } catch {
        if (!cancelled) {
          setDetail({ examId: selectedExamId, domains: [], publishedQuestionCount: 0 });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repos, selectedExamId]);

  const selectExam = useCallback((examId: string | null) => {
    setSelectedExamId(examId);
  }, []);

  const setDomainForExam = useCallback(async (examId: string, domainId: string | null) => {
    setDomainByExam((prev) => {
      const next = { ...prev, [examId]: domainId };
      void persistDomainSelections(next);
      return next;
    });
  }, []);

  const dismissEnrollmentLimit = useCallback(() => {
    setEnrollmentLimitVisible(false);
  }, []);

  const clearEnrollError = useCallback(() => {
    setEnrollError(null);
  }, []);

  const enroll = useCallback(
    async (examId: string) => {
      setEnrollError(null);
      const target = exams.find((e) => e.id === examId);
      if (!target || target.isEnrolled) return;

      try {
        const enrolled = await repos.exams.listEnrolled();
        const activeIds = enrolled.map((e) => e.id);
        if (!EnrollmentGuard.canEnroll(activeIds)) {
          setEnrollmentLimitVisible(true);
          return;
        }

        await repos.exams.setEnrollment(examId, true, Date.now());
        await refresh();
      } catch {
        setEnrollError('Enrollment could not be completed. Please try again.');
      }
    },
    [exams, repos, refresh],
  );

  return {
    exams,
    loading,
    loadError,
    enrollError,
    clearEnrollError,
    selectedExamId,
    selectExam,
    detail,
    detailLoading,
    domainByExam,
    setDomainForExam,
    enrollmentLimitVisible,
    dismissEnrollmentLimit,
    enroll,
    contentUpdates,
    dismissContentUpdate,
    refresh,
  };
}
