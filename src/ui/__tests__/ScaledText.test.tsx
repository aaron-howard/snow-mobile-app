import React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { render } from '@testing-library/react-native';

import { ScaledText, clampFontScale, scaledFontSize } from '../ScaledText';

describe('clampFontScale', () => {
  test('clamps to the 100%–200% range', () => {
    expect(clampFontScale(0.5)).toBe(1);
    expect(clampFontScale(1)).toBe(1);
    expect(clampFontScale(1.5)).toBe(1.5);
    expect(clampFontScale(2)).toBe(2);
    expect(clampFontScale(3)).toBe(2);
  });

  test('falls back to 1 for NaN', () => {
    expect(clampFontScale(Number.NaN)).toBe(1);
  });
});

describe('scaledFontSize', () => {
  test('scales the base size at 100/150/200%', () => {
    expect(scaledFontSize(16, 1)).toBe(16);
    expect(scaledFontSize(16, 1.5)).toBe(24);
    expect(scaledFontSize(16, 2)).toBe(32);
  });

  test('caps growth at 200% so text cannot overflow its budget', () => {
    expect(scaledFontSize(16, 3)).toBe(32);
  });
});

describe('ScaledText', () => {
  function fontSizeOf(style: unknown): number | undefined {
    return (StyleSheet.flatten(style as TextStyle) ?? {}).fontSize;
  }

  test('renders at the clamped scaled size and disables platform scaling', () => {
    const { getByText } = render(
      <ScaledText fontSize={16} fontScale={1.5}>
        Hello
      </ScaledText>,
    );
    const node = getByText('Hello');
    expect(node.props.allowFontScaling).toBe(false);
    expect(fontSizeOf(node.props.style)).toBe(24);
  });

  test('caps at 200% for very large system scales', () => {
    const { getByText } = render(
      <ScaledText fontSize={20} fontScale={4}>
        Big
      </ScaledText>,
    );
    expect(fontSizeOf(getByText('Big').props.style)).toBe(40);
  });
});
