import React from 'react';
import { render } from '@testing-library/react-native';
import { StudyCalendar } from '../StudyCalendar';

describe('StudyCalendar', () => {
  const month = new Date(2026, 4, 15); // May 2026

  test('renders the month and year header', () => {
    const { getByText } = render(<StudyCalendar studyDays={[]} month={month} />);
    expect(getByText('May 2026')).toBeTruthy();
  });

  test('marks days with a completed session as studied', () => {
    const studyDays = [new Date(2026, 4, 3), new Date(2026, 4, 10)];
    const { getByLabelText } = render(<StudyCalendar studyDays={studyDays} month={month} />);
    expect(getByLabelText('May 3, studied')).toBeTruthy();
    expect(getByLabelText('May 10, studied')).toBeTruthy();
  });

  test('leaves days without a session unmarked', () => {
    const { getByLabelText } = render(
      <StudyCalendar studyDays={[new Date(2026, 4, 3)]} month={month} />,
    );
    expect(getByLabelText('May 4')).toBeTruthy();
  });

  test('ignores sessions from other months', () => {
    const { queryByLabelText } = render(
      <StudyCalendar studyDays={[new Date(2026, 3, 3)]} month={month} />,
    );
    expect(queryByLabelText('May 3, studied')).toBeNull();
  });
});
