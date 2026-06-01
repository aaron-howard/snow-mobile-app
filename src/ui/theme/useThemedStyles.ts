import { useMemo } from 'react';

import { useTheme } from './ThemeProvider';
import type { Theme } from './themes';

/**
 * Memoize a theme-derived stylesheet so screens repaint when high-contrast is
 * toggled (Req 10.5). Call `StyleSheet.create` *inside* the factory so the
 * precise per-key style types are preserved:
 *
 * ```ts
 * const makeStyles = (t: Theme) =>
 *   StyleSheet.create({
 *     screen: { backgroundColor: t.background },
 *     title: { color: t.textPrimary, fontWeight: '700' },
 *   });
 *
 * function Screen() {
 *   const styles = useThemedStyles(makeStyles);
 *   // ...
 * }
 * ```
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
