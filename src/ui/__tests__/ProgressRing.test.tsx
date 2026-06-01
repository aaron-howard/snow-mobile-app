import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressRing } from '../ProgressRing';

describe('ProgressRing', () => {
  test('renders the score with an accessible value', () => {
    const { getByText, getByLabelText } = render(<ProgressRing score={72} />);
    expect(getByText('72')).toBeTruthy();
    expect(getByLabelText('Readiness: 72 out of 100')).toBeTruthy();
  });

  test('clamps the score to 100', () => {
    const { getByText } = render(<ProgressRing score={140} />);
    expect(getByText('100')).toBeTruthy();
  });

  test('clamps negative scores to 0', () => {
    const { getByText } = render(<ProgressRing score={-5} />);
    expect(getByText('0')).toBeTruthy();
  });

  test('supports a custom label', () => {
    const { getByLabelText } = render(<ProgressRing score={50} label="Mastery" />);
    expect(getByLabelText('Mastery: 50 out of 100')).toBeTruthy();
  });
});
