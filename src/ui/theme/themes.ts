/**
 * Semantic color tokens for the app. Two concrete themes are provided: the
 * default ("standard") slate palette and a WCAG-AA "highContrast" palette whose
 * every foreground/background pair clears 4.5:1 (Requirement 10.3, Property 26).
 */
export interface Theme {
  name: 'standard' | 'highContrast';
  /** App background. */
  background: string;
  /** Raised surfaces (cards, banners). */
  surface: string;
  /** Primary body text. */
  textPrimary: string;
  /** Secondary / muted text. */
  textSecondary: string;
  /** Borders and dividers around interactive elements. */
  border: string;
  /** Accent used for primary actions and highlights. */
  accent: string;
  /** Text/icon color placed on top of `accent`. */
  onAccent: string;
  /** Positive / correct indicator. */
  success: string;
  /** Negative / incorrect indicator. */
  danger: string;
  /** Caution indicator. */
  warning: string;
}

export const standardTheme: Theme = {
  name: 'standard',
  background: '#0F172A',
  surface: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  accent: '#60A5FA',
  onAccent: '#0B1220',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
};

/**
 * High-contrast palette on pure black. Foregrounds are white or fully-saturated
 * hues chosen so each pair validated by {@link themeContrastPairs} meets ≥4.5:1.
 */
export const highContrastTheme: Theme = {
  name: 'highContrast',
  background: '#000000',
  surface: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: '#F2F2F2',
  border: '#FFFFFF',
  accent: '#FFFF00',
  onAccent: '#000000',
  success: '#00FF6A',
  danger: '#FF6B6B',
  warning: '#FFD400',
};

/** A named foreground/background pair to validate for contrast. */
export interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
}

/**
 * Enumerate the meaningful foreground/background pairs in a theme — every text
 * and interactive color as it is actually composited on a surface. Property 26
 * asserts each pair clears WCAG AA.
 */
export function themeContrastPairs(theme: Theme): ContrastPair[] {
  return [
    { name: 'primary text on background', fg: theme.textPrimary, bg: theme.background },
    { name: 'primary text on surface', fg: theme.textPrimary, bg: theme.surface },
    { name: 'secondary text on background', fg: theme.textSecondary, bg: theme.background },
    { name: 'secondary text on surface', fg: theme.textSecondary, bg: theme.surface },
    { name: 'accent on background', fg: theme.accent, bg: theme.background },
    { name: 'accent on surface', fg: theme.accent, bg: theme.surface },
    { name: 'text on accent', fg: theme.onAccent, bg: theme.accent },
    { name: 'border on background', fg: theme.border, bg: theme.background },
    { name: 'success on surface', fg: theme.success, bg: theme.surface },
    { name: 'danger on surface', fg: theme.danger, bg: theme.surface },
    { name: 'warning on surface', fg: theme.warning, bg: theme.surface },
  ];
}
