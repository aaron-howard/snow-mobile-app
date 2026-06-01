import React from 'react';
import { render } from '@testing-library/react-native';
import { TimerDisplay, formatRemaining } from '../TimerDisplay';

describe('formatRemaining', () => {
  test('pads minutes and seconds to mm:ss', () => {
    expect(formatRemaining(0)).toBe('00:00');
    expect(formatRemaining(5)).toBe('00:05');
    expect(formatRemaining(65)).toBe('01:05');
    expect(formatRemaining(3661)).toBe('61:01');
  });

  test('never goes negative', () => {
    expect(formatRemaining(-10)).toBe('00:00');
  });
});

describe('TimerDisplay', () => {
  test('announces the remaining time for screen readers (Req 5.2, 10.1)', () => {
    const { getByLabelText } = render(<TimerDisplay remainingSeconds={125} />);
    expect(getByLabelText('Time remaining: 02:05')).toBeTruthy();
  });

  test('shows a paused label when paused', () => {
    const { getByLabelText } = render(<TimerDisplay remainingSeconds={300} paused />);
    expect(getByLabelText('Timer paused at 05:00')).toBeTruthy();
  });
});
