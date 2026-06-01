import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ContentStaleWarning } from '../ContentStaleWarning';

describe('ContentStaleWarning', () => {
  test('renders an accessible alert when content is stale (Req 9.8, 10.1)', () => {
    const { getByLabelText } = render(<ContentStaleWarning visible />);
    const banner = getByLabelText('Downloaded content is over 30 days old. Refresh when connected.');
    expect(banner).toBeTruthy();
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });

  test('renders a tappable refresh prompt when onRefresh is provided', () => {
    const onRefresh = jest.fn();
    const { getByLabelText } = render(<ContentStaleWarning visible onRefresh={onRefresh} />);
    const prompt = getByLabelText(
      'Downloaded content is over 30 days old. Tap to refresh when connected.',
    );
    fireEvent.press(prompt);
    expect(onRefresh).toHaveBeenCalled();
  });

  test('renders nothing when content is fresh', () => {
    const { queryByLabelText } = render(<ContentStaleWarning visible={false} />);
    expect(
      queryByLabelText('Downloaded content is over 30 days old. Refresh when connected.'),
    ).toBeNull();
  });
});
