import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { highContrastTheme, standardTheme, type Theme } from './themes';

export interface ThemeContextValue {
  theme: Theme;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  toggleHighContrast: () => void;
}

/**
 * Default value used when a consumer renders outside a provider (e.g. in
 * isolated component tests): the standard theme with no-op setters. This keeps
 * `useTheme` safe to call anywhere.
 */
const defaultValue: ThemeContextValue = {
  theme: standardTheme,
  highContrast: false,
  setHighContrast: () => undefined,
  toggleHighContrast: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Initial high-contrast state (defaults to off). */
  initialHighContrast?: boolean;
}

/**
 * Provides the active theme. Activation is a synchronous React state update, so
 * the new theme is applied on the next render — well within the 500 ms budget
 * (Requirement 10.5).
 */
export function ThemeProvider({ children, initialHighContrast = false }: ThemeProviderProps) {
  const [highContrast, setHighContrast] = useState(initialHighContrast);

  const toggleHighContrast = useCallback(() => setHighContrast((v) => !v), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: highContrast ? highContrastTheme : standardTheme,
      highContrast,
      setHighContrast,
      toggleHighContrast,
    }),
    [highContrast, toggleHighContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the active theme and high-contrast controls. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
