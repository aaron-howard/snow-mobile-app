import React from 'react';
import { render } from '@testing-library/react-native';

import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  test('renders an accessible alert when offline (Req 9.7, 10.1)', () => {
    const { getByLabelText } = render(<OfflineBanner visible />);
    const banner = getByLabelText(
      'You are offline. Your progress is saved and will sync when you reconnect.',
    );
    expect(banner).toBeTruthy();
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });

  test('renders nothing when online', () => {
    const { queryByLabelText } = render(<OfflineBanner visible={false} />);
    expect(
      queryByLabelText(
        'You are offline. Your progress is saved and will sync when you reconnect.',
      ),
    ).toBeNull();
  });
});
