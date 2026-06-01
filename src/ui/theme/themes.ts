/**
 * Semantic color tokens for the app. Two concrete themes are provided: the
 * default ("standard") slate palette and a WCAG-AA "highContrast" palette whose
 * every foreground/background text pair clears 4.5:1 (Requirement 10.3,
 * Property 26).
 *
 * The token set is deliberately broad so every screen can be expressed without
 * hardcoded hex. In the **standard** theme each token equals the exact color the
 * screens used before the migration, so the default look is unchanged; the
 * **highContrast** theme remaps neutrals/accents to pure black/white/yellow and
 * keeps status surfaces dark+saturated (white text) so they stay legible and
 * distinct from the black background.
 *
 * Token families:
 *   - Neutrals: `background`, `surface`, `border`, `borderStrong`,
 *     `textPrimary`, `textBody`, `textSecondary`
 *   - Accent/actions: `accent` + `onAccent`, `accentStrong` + `onAccentStrong`,
 *     `accentStrongPressed`
 *   - Status foreground (on dark): `success`, `danger`, `warning`
 *   - Status surfaces (banners/pills) + their on-color: `dangerSurface`,
 *     `successSurface`, `infoSurface`, `warningSurface`
 *   - Light "card" family (data-viz surfaces): `card`, `cardText`, `cardMuted`,
 *     `cardTrack`
 *   - On-card status (charts/calendar/ring bands): `bandSuccess`, `bandWarning`,
 *     `bandDanger`, `studiedSurface`, `onStudiedSurface`
 */
export interface Theme {
  name: 'standard' | 'highContrast';

  // --- Neutrals -----------------------------------------------------------
  /** App background. */
  background: string;
  /** Raised dark surfaces (cards, inputs, sheets). */
  surface: string;
  /** Borders and dividers. */
  border: string;
  /** Stronger borders (unselected chips/choices, secondary buttons). */
  borderStrong: string;
  /** Primary body text. */
  textPrimary: string;
  /** Readable body copy / form labels (a touch softer than primary). */
  textBody: string;
  /** Secondary / muted text. */
  textSecondary: string;

  // --- Accent / actions ---------------------------------------------------
  /** Accent for links, spinners, and highlights on dark. */
  accent: string;
  /** Text/icon placed on top of `accent`. */
  onAccent: string;
  /** Filled primary-action background. */
  accentStrong: string;
  /** Text on top of `accentStrong`. */
  onAccentStrong: string;
  /** Pressed state for filled primary actions. */
  accentStrongPressed: string;

  // --- Status foreground (on dark) ---------------------------------------
  /** Positive / correct indicator. */
  success: string;
  /** Negative / incorrect indicator. */
  danger: string;
  /** Caution indicator. */
  warning: string;

  // --- Status surfaces (banners / pills) + on-color ----------------------
  dangerSurface: string;
  onDangerSurface: string;
  successSurface: string;
  onSuccessSurface: string;
  infoSurface: string;
  onInfoSurface: string;
  warningSurface: string;
  onWarningSurface: string;

  // --- Light "card" family (data-viz surfaces) ---------------------------
  /** Light raised card (e.g. progress charts). */
  card: string;
  /** Primary text on `card`. */
  cardText: string;
  /** Muted text on `card`. */
  cardMuted: string;
  /** Track/rail behind a bar or ring on `card`. */
  cardTrack: string;

  // --- On-card status (charts / calendar / ring bands) -------------------
  bandSuccess: string;
  bandWarning: string;
  bandDanger: string;
  /** "Studied" calendar cell background + its text. */
  studiedSurface: string;
  onStudiedSurface: string;
}

export const standardTheme: Theme = {
  name: 'standard',

  background: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  borderStrong: '#475569',
  textPrimary: '#F8FAFC',
  textBody: '#E2E8F0',
  textSecondary: '#94A3B8',

  accent: '#60A5FA',
  onAccent: '#0B1220',
  accentStrong: '#2563EB',
  onAccentStrong: '#F8FAFC',
  accentStrongPressed: '#1D4ED8',

  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',

  dangerSurface: '#7F1D1D',
  onDangerSurface: '#FEE2E2',
  successSurface: '#14532D',
  onSuccessSurface: '#DCFCE7',
  infoSurface: '#0C4A6E',
  onInfoSurface: '#E0F2FE',
  warningSurface: '#78350F',
  onWarningSurface: '#FEF3C7',

  card: '#FFFFFF',
  cardText: '#0F172A',
  cardMuted: '#475569',
  cardTrack: '#E2E8F0',

  bandSuccess: '#16A34A',
  bandWarning: '#D97706',
  bandDanger: '#DC2626',
  studiedSurface: '#DCFCE7',
  onStudiedSurface: '#166534',
};

/**
 * High-contrast palette on pure black. Foregrounds are white or fully-saturated
 * hues chosen so each text pair validated by {@link themeContrastPairs} meets
 * ≥4.5:1. Status surfaces keep a dark, saturated background with white text so
 * banners stay distinguishable from the black app background.
 */
export const highContrastTheme: Theme = {
  name: 'highContrast',

  background: '#000000',
  surface: '#000000',
  border: '#FFFFFF',
  borderStrong: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textBody: '#FFFFFF',
  textSecondary: '#F2F2F2',

  accent: '#FFFF00',
  onAccent: '#000000',
  accentStrong: '#FFFF00',
  onAccentStrong: '#000000',
  accentStrongPressed: '#CCCC00',

  success: '#00FF6A',
  danger: '#FF6B6B',
  warning: '#FFD400',

  dangerSurface: '#7F1D1D',
  onDangerSurface: '#FFFFFF',
  successSurface: '#14532D',
  onSuccessSurface: '#FFFFFF',
  infoSurface: '#0C4A6E',
  onInfoSurface: '#FFFFFF',
  warningSurface: '#78350F',
  onWarningSurface: '#FFFFFF',

  card: '#000000',
  cardText: '#FFFFFF',
  cardMuted: '#F2F2F2',
  cardTrack: '#444444',

  bandSuccess: '#00FF6A',
  bandWarning: '#FFD400',
  bandDanger: '#FF6B6B',
  studiedSurface: '#14532D',
  onStudiedSurface: '#DCFCE7',
};

/** A named foreground/background pair to validate for contrast. */
export interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
}

/**
 * Enumerate the meaningful foreground/background **text** pairs in a theme —
 * every text color as it is actually composited on a surface. Property 26
 * asserts each pair clears WCAG AA. Purely graphical or large-display elements
 * (progress-ring bands, bar fills, track rails, modal scrims) are excluded:
 * they are not body text and information is never conveyed by color alone.
 */
export function themeContrastPairs(theme: Theme): ContrastPair[] {
  return [
    { name: 'primary text on background', fg: theme.textPrimary, bg: theme.background },
    { name: 'primary text on surface', fg: theme.textPrimary, bg: theme.surface },
    { name: 'body text on background', fg: theme.textBody, bg: theme.background },
    { name: 'body text on surface', fg: theme.textBody, bg: theme.surface },
    { name: 'secondary text on background', fg: theme.textSecondary, bg: theme.background },
    { name: 'secondary text on surface', fg: theme.textSecondary, bg: theme.surface },
    { name: 'accent on background', fg: theme.accent, bg: theme.background },
    { name: 'accent on surface', fg: theme.accent, bg: theme.surface },
    { name: 'text on accent', fg: theme.onAccent, bg: theme.accent },
    { name: 'text on accentStrong', fg: theme.onAccentStrong, bg: theme.accentStrong },
    { name: 'border on background', fg: theme.border, bg: theme.background },
    { name: 'success on surface', fg: theme.success, bg: theme.surface },
    { name: 'danger on surface', fg: theme.danger, bg: theme.surface },
    { name: 'warning on surface', fg: theme.warning, bg: theme.surface },
    { name: 'text on dangerSurface', fg: theme.onDangerSurface, bg: theme.dangerSurface },
    { name: 'text on successSurface', fg: theme.onSuccessSurface, bg: theme.successSurface },
    { name: 'text on infoSurface', fg: theme.onInfoSurface, bg: theme.infoSurface },
    { name: 'text on warningSurface', fg: theme.onWarningSurface, bg: theme.warningSurface },
    { name: 'card text on card', fg: theme.cardText, bg: theme.card },
    { name: 'muted text on card', fg: theme.cardMuted, bg: theme.card },
    { name: 'studied text on studied cell', fg: theme.onStudiedSurface, bg: theme.studiedSurface },
  ];
}
