import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  Database,
  LayoutDashboard,
  LogOut,
  ServerCog,
  Settings,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthResponse } from './LoginScreen';
import { ProfilePage } from './ProfilePage';
import { RealtimeDashboard } from './RealtimeDashboard';
import { RegistryPage } from './RegistryPage';
import { UsersPage } from './UsersPage';

type SamplePageProps = {
  auth: AuthResponse;
  onLogout: () => void;
};

type SectionKey = 'dashboard' | 'registry' | 'lxc' | 'profile' | 'users';

function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

// ─── Tab bar item ────────────────────────────────────────────────────────────

function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: (color: string) => React.ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = active ? '#ffffff' : '#71717a';
  const labelColor = active ? '#ffffff' : '#71717a';

  return (
    <Animated.View style={pressStyle} className="flex-1 items-center">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.88, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        className="items-center justify-center py-2 w-full"
      >
        {/* Active pill indicator */}
        <Animated.View
          style={pillStyle}
          className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-500"
        />

        <View className="items-center justify-center h-8 w-8">
          {icon(iconColor)}
        </View>
        <Text
          className="mt-1 text-[10px] font-semibold tracking-wide"
          style={{ color: labelColor }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  name,
  email,
  onOpenProfile,
  onLogout,
}: {
  name: string;
  email: string;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
      <View className="border-b border-zinc-800 px-4 py-3">
        <Text className="text-sm font-semibold text-white">{name}</Text>
        <Text className="mt-0.5 text-xs text-zinc-400">{email}</Text>
      </View>
      <Pressable
        onPress={onOpenProfile}
        className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-900"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
          <Settings size={14} color="#a1a1aa" />
        </View>
        <View>
          <Text className="text-sm font-semibold text-white">Profile settings</Text>
          <Text className="text-xs text-zinc-500">Manage your account</Text>
        </View>
      </Pressable>
      <View className="h-px bg-zinc-800" />
      <Pressable
        onPress={onLogout}
        className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-900"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
          <LogOut size={14} color="#ef4444" />
        </View>
        <Text className="text-sm font-semibold text-red-400">Log out</Text>
      </Pressable>
    </View>
  );
}

function ProfileMenuButton({
  name,
  email,
  avatarUrl,
  initial,
  isOpen,
  onToggle,
  onOpenProfile,
  onLogout,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  initial: string;
  isOpen: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const pressScale = useSharedValue(1);
  const menuProgress = useSharedValue(0);

  useEffect(() => {
    menuProgress.value = withTiming(isOpen ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [isOpen, menuProgress]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateZ: `${interpolate(menuProgress.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(menuProgress.value, [0, 1], [-8, 0]) },
      { scale: interpolate(menuProgress.value, [0, 1], [0.97, 1]) },
    ],
    pointerEvents: isOpen ? 'auto' : 'none',
  }));

  return (
    <View className="relative">
      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={onToggle}
          onPressIn={() => {
            pressScale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          className="flex-row items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 p-1 pr-2"
        >
          <View className="h-8 w-8 overflow-hidden rounded-full bg-zinc-800">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-8 w-8 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-8 w-8 items-center justify-center">
                <Text className="text-xs font-bold text-white">{initial}</Text>
              </View>
            )}
          </View>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={13} color="#71717a" />
          </Animated.View>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={menuStyle}
        className="absolute right-0 top-12 z-50 w-64"
      >
        <ProfileDropdown
          name={name}
          email={email}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />
      </Animated.View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const NAV_ITEMS: {
  key: SectionKey;
  label: string;
  icon: (color: string) => React.ReactNode;
}[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: (c) => <LayoutDashboard size={20} color={c} />,
  },
  {
    key: 'registry',
    label: 'Registry',
    icon: (c) => <Database size={20} color={c} />,
  },
  {
    key: 'lxc',
    label: 'LXC',
    icon: (c) => <ServerCog size={20} color={c} />,
  },
  {
    key: 'users',
    label: 'Users',
    icon: (c) => <Users size={20} color={c} />,
  },
];

export function SamplePage({ auth, onLogout }: SamplePageProps) {
  const [section, setSection] = useState<SectionKey>('dashboard');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const profileInitial = auth.user.displayName.slice(0, 1).toUpperCase();

  const openProfilePage = () => {
    setSection('profile');
    setIsProfileMenuOpen(false);
  };

  const content = useMemo(() => {
    if (section === 'profile') {
      return <ProfilePage profile={auth.user} token={auth.token} />;
    }
    if (section === 'registry') {
      return <RegistryPage />;
    }
    if (section === 'lxc') {
      return (
        <View className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-6">
          <Text className="text-sm uppercase tracking-[0.3em] text-zinc-500">LXC</Text>
          <Text className="mt-2 text-3xl font-bold text-white">LXC Registry</Text>
          <Text className="mt-3 text-zinc-400">
            This section is intentionally left empty for now.
          </Text>
        </View>
      );
    }
    if (section === 'users') {
      return <UsersPage />;
    }
    return <RealtimeDashboard />;
  }, [section, auth.user, auth.token]);

  // Tab bar height for bottom padding
  const TAB_BAR_HEIGHT = 60;

  return (
    <View className="flex-1 bg-black">
      {/* ── Top header ── */}
      <View
        className="flex-row items-center border-b border-zinc-900 bg-zinc-950 px-4"
        style={{ paddingTop: insets.top + 10, paddingBottom: 10 }}
      >
        <View className="flex-1">
          <Text className="text-base font-bold text-white">Fortmont API</Text>
          <Text className="text-xs text-zinc-500">Admin dashboard</Text>
        </View>
        <ProfileMenuButton
          name={auth.user.displayName}
          email={auth.user.email}
          avatarUrl={auth.user.avatarUrl}
          initial={profileInitial}
          isOpen={isProfileMenuOpen}
          onToggle={() => setIsProfileMenuOpen((v) => !v)}
          onOpenProfile={openProfilePage}
          onLogout={onLogout}
        />
      </View>

      {/* ── Page content ── */}
      <View className="flex-1">
        {section === 'dashboard' ? (
          <View className="flex-1 px-4 pt-4" style={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 8 }}>
            {content}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1">{content}</View>
          </ScrollView>
        )}
      </View>

      {/* ── Bottom tab bar ── */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-zinc-800/80 bg-zinc-950/95"
        style={{ paddingBottom: insets.bottom }}
      >
        <View
          className="flex-row items-stretch"
          style={{ height: TAB_BAR_HEIGHT }}
        >
          {NAV_ITEMS.map((item) => (
            <TabItem
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={section === item.key}
              onPress={() => {
                setSection(item.key);
                setIsProfileMenuOpen(false);
              }}
            />
          ))}
        </View>
      </View>

      {/* Dismiss profile menu on outside tap */}
      {isProfileMenuOpen && (
        <Pressable
          className="absolute inset-0 z-40"
          onPress={() => setIsProfileMenuOpen(false)}
        />
      )}
    </View>
  );
}