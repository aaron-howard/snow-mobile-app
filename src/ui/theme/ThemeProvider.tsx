import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { highContrastTheme, standardTheme, type Theme } from './themes';
import { loadHighContrastPreference, persistHighContrastPreference } from './highContrastStorage';

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
 *
 * The preference is persisted to device storage and rehydrated on launch
 * (Requirement 10.6): on mount we load any saved value, and every subsequent
 * change is written back. Writes are suppressed until hydration completes so the
 * default value never clobbers a stored preference.
 */
export function ThemeProvider({ children, initialHighContrast = false }: ThemeProviderProps) {
  const [highContrast, setHighContrastState] = useState(initialHighContrast);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadHighContrastPreference().then((stored) => {
      if (cancelled) return;
      if (stored !== null) setHighContrastState(stored);
      hydrated.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void persistHighContrastPreference(highContrast);
  }, [highContrast]);

  const setHighContrast = useCallback((enabled: boolean) => setHighContrastState(enabled), []);
  const toggleHighContrast = useCallback(() => setHighContrastState((v) => !v), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: highContrast ? highContrastTheme : standardTheme,
      highContrast,
      setHighContrast,
      toggleHighContrast,
    }),
    [highContrast, setHighContrast, toggleHighContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the active theme and high-contrast controls. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
