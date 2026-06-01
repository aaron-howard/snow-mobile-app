import React from 'react';
import { render } from '@testing-library/react-native';
import { DomainAccuracyChart } from '../DomainAccuracyChart';

describe('DomainAccuracyChart', () => {
  const data = [
    { domainId: 'd1', name: 'Scripting', correct: 8, total: 10 },
    { domainId: 'd2', name: 'Security', correct: 1, total: 4 },
  ];

  test('renders a labeled row per domain with percentage and counts', () => {
    const { getByLabelText, getByText } = render(<DomainAccuracyChart data={data} />);
    expect(getByLabelText('Scripting: 80% accuracy, 8 of 10 correct')).toBeTruthy();
    expect(getByLabelText('Security: 25% accuracy, 1 of 4 correct')).toBeTruthy();
    // Text label alongside color (Req 10.4).
    expect(getByText('80% (8/10)')).toBeTruthy();
  });

  test('shows 0% when a domain has no attempts', () => {
    const { getByLabelText } = render(
      <DomainAccuracyChart data={[{ domainId: 'd1', name: 'Empty', correct: 0, total: 0 }]} />,
    );
    expect(getByLabelText('Empty: 0% accuracy, 0 of 0 correct')).toBeTruthy();
  });
});
