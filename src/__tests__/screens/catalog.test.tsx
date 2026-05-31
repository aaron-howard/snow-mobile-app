/**
 * Catalog screen tests — mock the catalog hook so WatermelonDB never
 * initializes under Jest.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({}),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseCatalog = jest.fn();

jest.mock('@/domain/catalog/useCatalog', () => ({
  useCatalog: () => mockUseCatalog(),
}));

import CatalogScreen from '../../../app/(tabs)/catalog';

const baseExam = {
  id: 'exam-1',
  name: 'Certified System Administrator (CSA)',
  certificationLevel: 'Associate',
  estimatedStudyHours: 40,
  officialDurationMinutes: 90,
  officialQuestionCount: 60,
  officialPassingScore: 70,
  minimumQuestionCount: 60,
  contentVersion: '1',
  contentDownloadedAt: null,
  isEnrolled: false,
  enrolledAt: null,
};

function mockDefault() {
  return {
    exams: [baseExam],
    loading: false,
    loadError: null,
    enrollError: null as string | null,
    clearEnrollError: jest.fn(),
    selectedExamId: null as string | null,
    selectExam: jest.fn(),
    detail: null as {
      examId: string;
      domains: { id: string; examId: string; name: string; weightPercent: number }[];
      publishedQuestionCount: number;
    } | null,
    detailLoading: false,
    domainByExam: {} as Record<string, string | null>,
    setDomainForExam: jest.fn().mockResolvedValue(undefined),
    enrollmentLimitVisible: false,
    dismissEnrollmentLimit: jest.fn(),
    enroll: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
  };
}

type CatalogHookState = ReturnType<typeof mockDefault>;

function setupHook(overrides: Partial<CatalogHookState> = {}) {
  const impl = { ...mockDefault(), ...overrides };
  mockUseCatalog.mockReturnValue(impl);
  return impl;
}

describe('CatalogScreen', () => {
  beforeEach(() => {
    mockUseCatalog.mockReset();
    setupHook();
  });

  test('renders heading and exam summary row', () => {
    const { getByRole, getByText } = render(<CatalogScreen />);
    expect(getByRole('header', { name: 'Exam catalog' })).toBeTruthy();
    expect(getByText('Certified System Administrator (CSA)')).toBeTruthy();
    expect(getByText(/Associate/)).toBeTruthy();
  });

  test('expanding a row calls selectExam with exam id', () => {
    const selectExam = jest.fn();
    setupHook({ selectExam });
    const { getByLabelText } = render(<CatalogScreen />);
    fireEvent.press(
      getByLabelText(
        'Certified System Administrator (CSA), Associate. Estimated 40 study hours. Tap for details.',
      ),
    );
    expect(selectExam).toHaveBeenCalledWith('exam-1');
  });

  test('shows enrollment limit modal when hook reports it visible', () => {
    setupHook({ enrollmentLimitVisible: true });
    const { getByLabelText } = render(<CatalogScreen />);
    expect(
      getByLabelText('You already have five active courses enrolled.'),
    ).toBeTruthy();
  });

  test('dismisses enrollment limit dialog', () => {
    const dismissEnrollmentLimit = jest.fn();
    setupHook({ enrollmentLimitVisible: true, dismissEnrollmentLimit });
    const { getByLabelText } = render(<CatalogScreen />);
    fireEvent.press(getByLabelText('Dismiss enrollment limit dialog'));
    expect(dismissEnrollmentLimit).toHaveBeenCalled();
  });

  test('shows enrollment error banner and dismiss control', () => {
    const clearEnrollError = jest.fn();
    setupHook({
      enrollError: 'Enrollment could not be completed. Please try again.',
      clearEnrollError,
    });
    const { getByText, getByLabelText } = render(<CatalogScreen />);
    expect(getByText(/Enrollment could not be completed/)).toBeTruthy();
    fireEvent.press(getByLabelText('Dismiss enrollment error'));
    expect(clearEnrollError).toHaveBeenCalled();
  });

  test('domain filter chip calls setDomainForExam', async () => {
    const setDomainForExam = jest.fn().mockResolvedValue(undefined);
    const domain = { id: 'dom-1', examId: 'exam-1', name: 'Platform', weightPercent: 35 };
    setupHook({
      selectedExamId: 'exam-1',
      detail: { examId: 'exam-1', domains: [domain], publishedQuestionCount: 2 },
      detailLoading: false,
      setDomainForExam,
    });
    const { getByLabelText } = render(<CatalogScreen />);
    fireEvent.press(getByLabelText('Filter study sessions to Platform'));
    await waitFor(() => {
      expect(setDomainForExam).toHaveBeenCalledWith('exam-1', 'dom-1');
    });
  });

  test('enroll button triggers enroll callback', async () => {
    const enroll = jest.fn().mockResolvedValue(undefined);
    const domain = { id: 'dom-1', examId: 'exam-1', name: 'Platform', weightPercent: 35 };
    setupHook({
      selectedExamId: 'exam-1',
      detail: { examId: 'exam-1', domains: [domain], publishedQuestionCount: 2 },
      detailLoading: false,
      enroll,
    });
    const { getByLabelText } = render(<CatalogScreen />);
    fireEvent.press(getByLabelText('Enroll in Certified System Administrator (CSA)'));
    await waitFor(() => {
      expect(enroll).toHaveBeenCalledWith('exam-1');
    });
  });
});
