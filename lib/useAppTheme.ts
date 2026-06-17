import { useMemo } from 'react';
import { useColorScheme } from 'nativewind';

export function useAppTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return useMemo(
    () => ({
      isDark,
      colorScheme,
      colors: {
        background: isDark ? '#000000' : '#f4f4f5',
        surface: isDark ? '#09090b' : '#ffffff',
        surfaceElevated: isDark ? '#18181b' : '#fafafa',
        headerBg: isDark ? 'rgba(9,9,11,0.95)' : 'rgba(255,255,255,0.95)',
        border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderStrong: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        text: isDark ? '#ffffff' : '#18181b',
        textSecondary: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
        textMuted: isDark ? '#71717a' : '#52525b',
        textSubtle: isDark ? '#52525b' : '#a1a1aa',
        glassBg: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)',
        glassBorder: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)',
        glassTint: isDark ? 'rgba(20,20,20,0.55)' : 'rgba(255,255,255,0.65)',
        pillBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        pillActiveBg: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)',
        pillActiveBorder: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
        navIconActive: isDark ? '#ffffff' : '#18181b',
        navIconInactive: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
        navLabel: isDark ? '#ffffff' : '#18181b',
        shadow: isDark ? '#000000' : '#a1a1aa',
        blurType: (isDark ? 'dark' : 'light') as 'dark' | 'light',
        spinner: isDark ? '#ffffff' : '#18181b',
        refreshTint: isDark ? '#ffffff' : '#18181b',
      },
    }),
    [colorScheme, isDark]
  );
}
