import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import BookmarksScreen from '../../../app/bookmarks';
import type { UseBookmarksResult, ExamBookmarkGroup } from '@domain/bookmarks/useBookmarks';
import type { BookmarkRecord } from '@domain/bookmarks';

const mockUseBookmarks = jest.fn();
const mockPush = jest.fn();

jest.mock('@/domain/bookmarks/useBookmarks', () => ({
  useBookmarks: () => mockUseBookmarks(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function bm(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: 'bm-1',
    userId: 'u1',
    itemType: 'question',
    itemId: 'q1',
    examId: 'e1',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

const group: ExamBookmarkGroup = {
  examId: 'e1',
  examName: 'CSA',
  questionCount: 1,
  flashcardCount: 1,
  bookmarks: [bm(), bm({ id: 'bm-2', itemType: 'flashcard', itemId: 'f1' })],
};

function state(overrides: Partial<UseBookmarksResult> = {}): UseBookmarksResult {
  return {
    loading: false,
    error: null,
    groups: [group],
    removeBookmark: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('BookmarksScreen', () => {
  beforeEach(() => {
    mockUseBookmarks.mockReset();
    mockPush.mockReset();
    mockUseBookmarks.mockReturnValue(state());
  });

  test('renders grouped bookmarks with the exam name and counts', () => {
    const { getByText } = render(<BookmarksScreen />);
    expect(getByText('CSA')).toBeTruthy();
    expect(getByText('1 question · 1 flashcard')).toBeTruthy();
  });

  test('starts a bookmark quiz session for the exam (Req 7.4)', () => {
    const { getByLabelText } = render(<BookmarksScreen />);
    fireEvent.press(getByLabelText('Start a quiz from bookmarked questions for CSA'));
    expect(mockPush).toHaveBeenCalledWith('/exam/e1/quiz?mode=bookmark');
  });

  test('starts a bookmark flashcard session for the exam (Req 7.4)', () => {
    const { getByLabelText } = render(<BookmarksScreen />);
    fireEvent.press(getByLabelText('Review bookmarked flashcards for CSA'));
    expect(mockPush).toHaveBeenCalledWith('/exam/e1/flashcards?mode=bookmark');
  });

  test('disables session start when the exam has no items of that type (Req 7.5)', () => {
    mockUseBookmarks.mockReturnValue(
      state({
        groups: [{ ...group, flashcardCount: 0, bookmarks: [bm()] }],
      }),
    );
    const { getByLabelText } = render(<BookmarksScreen />);
    const flashcardsButton = getByLabelText('Review bookmarked flashcards for CSA');
    expect(flashcardsButton.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(flashcardsButton);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('removes a bookmark when its star is tapped', () => {
    const removeBookmark = jest.fn().mockResolvedValue(undefined);
    mockUseBookmarks.mockReturnValue(state({ removeBookmark }));
    const { getAllByLabelText } = render(<BookmarksScreen />);
    fireEvent.press(getAllByLabelText('Remove bookmark for this question')[0]!);
    expect(removeBookmark).toHaveBeenCalledTimes(1);
  });

  test('shows an empty-state message when there are no bookmarks', () => {
    mockUseBookmarks.mockReturnValue(state({ groups: [] }));
    const { getByText } = render(<BookmarksScreen />);
    expect(getByText(/haven't bookmarked anything yet/i)).toBeTruthy();
  });
});
