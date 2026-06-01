/**
 * WCAG 2.1 relative-luminance and contrast-ratio math (pure). Used to validate
 * the high-contrast theme (Property 26, Requirement 10.3).
 */

/** Parse a `#RGB` or `#RRGGBB` hex string into 0–255 channels. */
export function parseHex(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) {
    throw new Error(`contrast: invalid hex color "${hex}"`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Convert an sRGB channel (0–255) to its linear-light value (0–1). */
function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
  );
}

/** WCAG contrast ratio between two colors, in the range [1, 21]. */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG 2.1 AA minimum contrast for normal text and UI components. */
export const WCAG_AA_CONTRAST = 4.5;
