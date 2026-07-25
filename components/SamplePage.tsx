import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Bell,
  ChevronLeft,
  CircleHelp,
  Database,
  House,
  LogOut,
  ServerCog,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthResponse } from './LoginScreen';
import { ProfilePage } from './ProfilePage';
import { RealtimeDashboard } from './RealtimeDashboard';
import { useAppTheme } from '../lib/useAppTheme';
import { ThemeToggle } from './ThemeToggle';
import { UsersPage } from './UsersPage';
import { TicketDashboard } from './TicketDash';
import { StorageScreen } from './StorageScreen';

type SamplePageProps = {
  auth: AuthResponse;
  onLogout: () => void;
};

type AppExtra = {
  fortmontIssuer?: string;
};

const DEFAULT_FORTMONT_ISSUER = 'https://api.fortmont.me';

type RootPageKey = 'dashboard' | 'users' | 'tickets' | 'storage' | 'settings';

type SettingsRowProps = {
  label: string;
  description: string;
  icon: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
};

const ROOT_PAGES: RootPageKey[] = ['dashboard', 'users', 'tickets', 'storage', 'settings'];

function SettingsRow({ label, description, icon, onPress, danger }: SettingsRowProps) {
  const { isDark } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={
        danger
          ? 'mb-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3.5 dark:border-rose-900/50 dark:bg-rose-950/20'
          : 'mb-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950'
      }
    >
      <View className="flex-row items-center gap-3">
        <View
          className={
            danger
              ? 'h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30'
              : 'h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900'
          }
        >
          {icon}
        </View>

        <View className="flex-1">
          <Text
            className={
              danger
                ? 'text-base font-semibold text-rose-700 dark:text-rose-300'
                : 'text-base font-semibold text-zinc-900 dark:text-white'
            }
          >
            {label}
          </Text>
          <Text className={danger ? 'mt-0.5 text-xs text-rose-500' : 'mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'}>
            {description}
          </Text>
        </View>

        {onPress ? (
          <ChevronLeft
            size={16}
            color={danger ? (isDark ? '#fda4af' : '#e11d48') : isDark ? '#a1a1aa' : '#71717a'}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function RootTab({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, progress]);

  const tabStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [44, 118]),
    paddingHorizontal: interpolate(progress.value, [0, 1], [0, 12]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxWidth: interpolate(progress.value, [0, 1], [0, 62]),
    marginLeft: interpolate(progress.value, [0, 1], [0, 8]),
  }));

  return (
    <Animated.View style={tabStyle}>
      <Pressable
        onPress={onPress}
        className={
          active
            ? 'h-10 w-full flex-row items-center justify-center rounded-full bg-zinc-900 dark:bg-white'
            : 'h-10 w-full flex-row items-center justify-center rounded-full'
        }
      >
        {icon}
        <Animated.Text
          numberOfLines={1}
          style={labelStyle}
          className={
            active
              ? 'text-xs font-semibold text-white dark:text-zinc-950'
              : 'text-xs font-semibold text-zinc-500 dark:text-zinc-400'
          }
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

export function SamplePage({ auth, onLogout }: SamplePageProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark, colors } = useAppTheme();
  const pagerRef = useRef<ScrollView>(null);

  const [rootPage, setRootPage] = useState<RootPageKey>('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileProgress = useSharedValue(0);

  const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
  const issuer = extra.fortmontIssuer?.trim() || DEFAULT_FORTMONT_ISSUER;

  useEffect(() => {
    profileProgress.value = withTiming(isProfileOpen ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isProfileOpen, profileProgress]);

  const profileStyle = useAnimatedStyle(() => ({
    opacity: profileProgress.value,
    transform: [{ translateX: interpolate(profileProgress.value, [0, 1], [width, 0]) }],
  }));

  const iconColor = isDark ? '#d4d4d8' : '#3f3f46';
  const activeIconColor = isDark ? '#09090b' : '#ffffff';

  const pageIndex = ROOT_PAGES.indexOf(rootPage);

  const goToRootPage = (nextPage: RootPageKey) => {
    const nextIndex = ROOT_PAGES.indexOf(nextPage);
    if (nextIndex < 0) return;

    setRootPage(nextPage);
    pagerRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };

  const onPagerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const nextPage = ROOT_PAGES[nextIndex] ?? 'dashboard';
    setRootPage(nextPage);
  };

  useEffect(() => {
    if (pageIndex < 0) return;
    pagerRef.current?.scrollTo({ x: pageIndex * width, animated: false });
  }, [pageIndex, width]);

  const settingsScreen = useMemo(
    () => (
      <View className="flex-1 pt-1">
        <View className="mb-4 px-4">
          <Text className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Settings</Text>
          <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Account and app preferences</Text>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 26 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-4 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <ThemeToggle variant="segmented" />
          </View>

          <View className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/35">
            <SettingsRow
              label="Account"
              description="Open your profile settings"
              icon={<User size={18} color={iconColor} />}
              onPress={() => setIsProfileOpen(true)}
            />

            <SettingsRow
              label="Notifications"
              description="Placeholder for push and alert preferences"
              icon={<Bell size={18} color={iconColor} />}
            />

            <SettingsRow
              label="Security"
              description="Placeholder for session and access controls"
              icon={<Shield size={18} color={iconColor} />}
            />

            <SettingsRow
              label="About"
              description="Placeholder for app info and support"
              icon={<CircleHelp size={18} color={iconColor} />}
            />
          </View>

          <View className="mt-5">
            <SettingsRow
              label="Log out"
              description="End your current session"
              icon={<LogOut size={18} color={isDark ? '#fda4af' : '#e11d48'} />}
              onPress={onLogout}
              danger
            />
          </View>
        </ScrollView>
      </View>
    ),
    [iconColor, isDark, onLogout]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={onPagerMomentumEnd}
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        scrollEnabled={!isProfileOpen}
        bounces={false}
      >
        <View style={{ width, paddingHorizontal: 16, paddingBottom: insets.bottom + 86 }}>
          <RealtimeDashboard token={auth.token} />
        </View>

        <View style={{ width, paddingHorizontal: 16, paddingBottom: insets.bottom + 86 }}>
          <UsersPage auth={auth} />
        </View>

        <View style={{ width, paddingHorizontal: 16, paddingBottom: insets.bottom + 86 }}>
          <TicketDashboard auth={auth} />
        </View>

        <View style={{ width, paddingHorizontal: 16, paddingBottom: insets.bottom + 86 }}>
          <StorageScreen token={auth.token} baseUrl={issuer} />
        </View>

        <View style={{ width, paddingBottom: insets.bottom + 86 }}>
          {settingsScreen}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: insets.bottom + 10,
          borderRadius: 999,
        }}
        className="border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
          <RootTab
            label="Home"
            active={rootPage === 'dashboard'}
            icon={<House size={15} color={rootPage === 'dashboard' ? activeIconColor : iconColor} />}
            onPress={() => goToRootPage('dashboard')}
          />
          <RootTab
            label="Users"
            active={rootPage === 'users'}
            icon={<Users size={15} color={rootPage === 'users' ? activeIconColor : iconColor} />}
            onPress={() => goToRootPage('users')}
          />
          <RootTab
            label="Tickets"
            active={rootPage === 'tickets'}
            icon={<ServerCog size={15} color={rootPage === 'tickets' ? activeIconColor : iconColor} />}
            onPress={() => goToRootPage('tickets')}
          />
          <RootTab
            label="Storage"
            active={rootPage === 'storage'}
            icon={<Database size={15} color={rootPage === 'storage' ? activeIconColor : iconColor} />}
            onPress={() => goToRootPage('storage')}
          />
          <RootTab
            label="Settings"
            active={rootPage === 'settings'}
            icon={<Settings size={15} color={rootPage === 'settings' ? activeIconColor : iconColor} />}
            onPress={() => goToRootPage('settings')}
          />
        </ScrollView>
      </View>

      <Animated.View
        pointerEvents={isProfileOpen ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.background,
            paddingTop: insets.top + 8,
          },
          profileStyle,
        ]}
      >
        <View className="mb-2 px-4">
          <Pressable
            onPress={() => setIsProfileOpen(false)}
            className="h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <ChevronLeft size={18} color={iconColor} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <ProfilePage profile={auth.user} token={auth.token} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
