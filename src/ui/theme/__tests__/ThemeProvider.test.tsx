import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ThemeProvider, useTheme } from '../ThemeProvider';

function Probe() {
  const { theme, highContrast, toggleHighContrast } = useTheme();
  return (
    <>
      <Text>{`theme:${theme.name}`}</Text>
      <Text>{`bg:${theme.background}`}</Text>
      <Text>{`hc:${highContrast}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="toggle" onPress={toggleHighContrast}>
        <Text>toggle</Text>
      </Pressable>
    </>
  );
}

describe('ThemeProvider', () => {
  test('defaults to the standard theme', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(getByText('theme:standard')).toBeTruthy();
    expect(getByText('bg:#0F172A')).toBeTruthy();
  });

  test('activation applies the high-contrast theme immediately (Req 10.5)', () => {
    const { getByText, getByLabelText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(getByText('theme:standard')).toBeTruthy();

    // Synchronous React state update — well within the 500 ms budget.
    fireEvent.press(getByLabelText('toggle'));

    expect(getByText('theme:highContrast')).toBeTruthy();
    expect(getByText('bg:#000000')).toBeTruthy();
    expect(getByText('hc:true')).toBeTruthy();
  });

  test('useTheme outside a provider falls back to the standard theme', () => {
    const { getByText } = render(<Probe />);
    expect(getByText('theme:standard')).toBeTruthy();
    expect(getByText('hc:false')).toBeTruthy();
  });

  test('honors an initial high-contrast value', () => {
    const { getByText } = render(
      <ThemeProvider initialHighContrast>
        <Probe />
      </ThemeProvider>,
    );
    expect(getByText('theme:highContrast')).toBeTruthy();
  });
});
