import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app.theme';

export type ThemePreference = 'light' | 'dark' | 'system';

export async function loadThemePreference(): Promise<ThemePreference> {
  const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export async function saveThemePreference(preference: ThemePreference) {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
}
