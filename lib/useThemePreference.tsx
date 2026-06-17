import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'nativewind';
import { loadThemePreference, saveThemePreference, type ThemePreference } from './themeStorage';

type ThemePreferenceContextValue = {
  colorScheme: 'light' | 'dark' | undefined;
  preference: ThemePreference;
  isReady: boolean;
  applyPreference: (next: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadThemePreference().then((stored) => {
      setPreference(stored);
      setColorScheme(stored);
      setIsReady(true);
    });
  }, [setColorScheme]);

  const applyPreference = useCallback(
    async (next: ThemePreference) => {
      setColorScheme(next);
      setPreference(next);
      await saveThemePreference(next);
    },
    [setColorScheme]
  );

  const toggleTheme = useCallback(async () => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    await applyPreference(next);
  }, [applyPreference, colorScheme]);

  const value = useMemo(
    () => ({
      colorScheme,
      preference,
      isReady,
      applyPreference,
      toggleTheme,
    }),
    [colorScheme, preference, isReady, applyPreference, toggleTheme]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return context;
}
