import { PixelRatio, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

/** Supported system font-scale range: 100%–200% (Requirement 10.2). */
export const MIN_FONT_SCALE = 1;
export const MAX_FONT_SCALE = 2;

/** Clamp a system font scale into the supported 100%–200% range. */
export function clampFontScale(scale: number): number {
  if (Number.isNaN(scale)) return MIN_FONT_SCALE;
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, scale));
}

/** Effective font size after clamped scaling. */
export function scaledFontSize(baseFontSize: number, scale: number): number {
  return baseFontSize * clampFontScale(scale);
}

export interface ScaledTextProps extends TextProps {
  /** Unscaled font size in points. */
  fontSize?: number;
  /**
   * Override the system font scale (mainly for tests). Defaults to the live OS
   * scale from `PixelRatio.getFontScale()`.
   */
  fontScale?: number;
}

/**
 * Text that scales with the OS font setting but caps at 200% so large sizes
 * never truncate, clip, or overlap (Requirement 10.2). We apply the clamped
 * scale ourselves and disable the platform's own scaling to avoid double-scaling
 * past the cap; text wraps freely (no default `numberOfLines`).
 */
export function ScaledText({
  fontSize = 16,
  fontScale,
  style,
  children,
  ...rest
}: ScaledTextProps) {
  const scale = fontScale ?? PixelRatio.getFontScale();
  const effective = scaledFontSize(fontSize, scale);

  const flattened = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  return (
    <Text {...rest} allowFontScaling={false} style={[flattened, { fontSize: effective }]}>
      {children}
    </Text>
  );
}
