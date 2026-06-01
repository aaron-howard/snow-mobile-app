// Feature: servicenow-cert-study-app, Task 16.8
//
// High-contrast regression coverage:
//   - Toggling high-contrast repaints theme-derived styles immediately
//     (Req 10.5).
//   - The preference is persisted and rehydrated on a fresh mount (Req 10.6).
//
// Pairs with the Property 26 contrast suite (highContrast.property.test.ts),
// which proves the high-contrast palette meets WCAG AA.

import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider, useTheme } from '../ThemeProvider';
import { useThemedStyles } from '../useThemedStyles';
import { highContrastTheme, standardTheme, type Theme } from '../themes';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { backgroundColor: theme.background },
    title: { color: theme.textPrimary },
  });

function Probe() {
  const { highContrast, toggleHighContrast } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.screen}>
      <Text testID="title" style={styles.title}>
        {highContrast ? 'hc' : 'std'}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="toggle" onPress={toggleHighContrast}>
        <Text>toggle</Text>
      </Pressable>
    </View>
  );
}

function flatten(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as never) as Record<string, unknown>;
}

describe('high-contrast regression (Task 16.8)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('toggling repaints theme-derived styles to the high-contrast palette (Req 10.5)', async () => {
    const { getByTestId, getByLabelText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    const before = flatten(getByTestId('title').props.style);
    expect(before.color).toBe(standardTheme.textPrimary);

    fireEvent.press(getByLabelText('toggle'));

    const after = flatten(getByTestId('title').props.style);
    expect(after.color).toBe(highContrastTheme.textPrimary);
    expect(getByTestId('title').props.children).toBe('hc');
  });

  test('persists the preference when enabled (Req 10.6)', async () => {
    const { getByLabelText } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    // Allow the initial hydration effect to settle before mutating.
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(getByLabelText('toggle'));

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('sn_cert_prep.high_contrast.v1')).toBe('true');
    });
  });

  test('rehydrates a stored preference on a fresh mount (Req 10.6)', async () => {
    await AsyncStorage.setItem('sn_cert_prep.high_contrast.v1', 'true');

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('title').props.children).toBe('hc');
    });
    expect(flatten(getByTestId('title').props.style).color).toBe(highContrastTheme.textPrimary);
  });

  test('a stored "false" preference keeps the standard theme', async () => {
    await AsyncStorage.setItem('sn_cert_prep.high_contrast.v1', 'false');

    const { getByTestId } = render(
      <ThemeProvider initialHighContrast>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('title').props.children).toBe('std');
    });
  });
});
