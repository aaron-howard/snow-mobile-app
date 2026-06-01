import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import ProgressScreen from '../../../app/(tabs)/progress';
import type { UseProgressResult } from '@domain/analytics/useProgress';
import type { UseEnrolledExamsResult } from '@domain/catalog/useEnrolledExams';
import type { ExamDTO } from '@db/repositories/types';

const mockUseProgress = jest.fn();
const mockUseEnrolledExams = jest.fn();

jest.mock('@/domain/analytics/useProgress', () => ({
  useProgress: (...args: unknown[]) => mockUseProgress(...args),
}));
jest.mock('@/domain/catalog/useEnrolledExams', () => ({
  useEnrolledExams: () => mockUseEnrolledExams(),
}));

const exam: ExamDTO = {
  id: 'exam-1',
  name: 'CSA',
  certificationLevel: 'Associate',
  estimatedStudyHours: 40,
  officialDurationMinutes: 90,
  officialQuestionCount: 60,
  officialPassingScore: 70,
  minimumQuestionCount: 100,
  contentVersion: 'v1',
  contentDownloadedAt: 1,
  isEnrolled: true,
  enrolledAt: 1,
};

function progressState(overrides: Partial<UseProgressResult> = {}): UseProgressResult {
  return {
    loading: false,
    error: null,
    hasData: true,
    readinessScore: 72,
    domainAccuracy: [{ domainId: 'd1', name: 'Scripting', correct: 8, total: 10 }],
    studyDays: [new Date(2026, 4, 10)],
    showReadiness80: false,
    dismissReadiness80: jest.fn(),
    ...overrides,
  };
}

function examsState(overrides: Partial<UseEnrolledExamsResult> = {}): UseEnrolledExamsResult {
  return { loading: false, error: null, exams: [exam], ...overrides };
}

describe('ProgressScreen', () => {
  beforeEach(() => {
    mockUseProgress.mockReset();
    mockUseEnrolledExams.mockReset();
    mockUseProgress.mockReturnValue(progressState());
    mockUseEnrolledExams.mockReturnValue(examsState());
  });

  test('renders readiness score and domain accuracy once an exam is selected', async () => {
    const { getByText, getByLabelText } = render(<ProgressScreen />);
    await waitFor(() => expect(getByText('72')).toBeTruthy());
    expect(getByLabelText('Readiness: 72 out of 100')).toBeTruthy();
    expect(getByLabelText('Scripting: 80% accuracy, 8 of 10 correct')).toBeTruthy();
  });

  test('shows the empty-state message when no session data exists (Req 6.9)', async () => {
    mockUseProgress.mockReturnValue(progressState({ hasData: false }));
    const { getByText } = render(<ProgressScreen />);
    await waitFor(() =>
      expect(getByText(/No study data is available yet/i)).toBeTruthy(),
    );
  });

  test('prompts enrollment when there are no enrolled exams', () => {
    mockUseEnrolledExams.mockReturnValue(examsState({ exams: [] }));
    const { getByText } = render(<ProgressScreen />);
    expect(getByText(/Enroll in an exam from the Catalog/i)).toBeTruthy();
  });

  test('shows the readiness-80 recommendation banner when triggered (Req 6.6)', async () => {
    mockUseProgress.mockReturnValue(progressState({ showReadiness80: true, readinessScore: 84 }));
    const { getByLabelText, getByText } = render(<ProgressScreen />);
    await waitFor(() => expect(getByText(/readiness score of 84/i)).toBeTruthy());
    expect(getByLabelText('Dismiss exam readiness recommendation')).toBeTruthy();
  });
});
