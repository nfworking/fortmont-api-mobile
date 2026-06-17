import { Pressable, Text, View } from 'react-native';
import { Monitor, Moon, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemePreference } from '../lib/useThemePreference';
import type { ThemePreference } from '../lib/themeStorage';

type ThemeToggleProps = {
  variant?: 'icon' | 'segmented';
  className?: string;
};

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { colorScheme, preference, applyPreference, toggleTheme } = useThemePreference();

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleTheme();
  };

  const handleSelect = async (next: ThemePreference) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await applyPreference(next);
  };

  if (variant === 'segmented') {
    return (
      <View className={className}>
        <Text className="text-sm font-semibold text-zinc-900 dark:text-white">Appearance</Text>
        <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Choose light, dark, or match your device setting.
        </Text>
        <View className="mt-3 flex-row gap-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const isActive = preference === value;

            return (
              <Pressable
                key={value}
                onPress={() => handleSelect(value)}
                className={`flex-1 items-center rounded-xl border px-2 py-3 ${
                  isActive
                    ? 'border-zinc-900 bg-zinc-900 dark:border-white dark:bg-white'
                    : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900'
                }`}
              >
                <Icon
                  size={16}
                  color={isActive ? (colorScheme === 'dark' ? '#18181b' : '#ffffff') : '#71717a'}
                />
                <Text
                  className={`mt-1.5 text-xs font-semibold ${
                    isActive
                      ? 'text-white dark:text-zinc-900'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 ${className ?? ''}`}
    >
      {isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#52525b" />}
    </Pressable>
  );
}
