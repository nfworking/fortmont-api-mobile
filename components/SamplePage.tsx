import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Database, LayoutDashboard, LogOut, Menu, ServerCog, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthResponse } from './LoginScreen';
import { RealtimeDashboard } from './RealtimeDashboard';
import { RegistryPage } from './RegistryPage';




type SamplePageProps = {
  auth: AuthResponse;
  onLogout: () => void;
};

type SectionKey = 'dashboard' | 'registry' | 'lxc';

function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

function SidebarItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center rounded-xl px-3 py-3',
        active ? 'bg-zinc-800' : 'bg-transparent'
      )}
    >
      <View className="w-7 items-center justify-center">{icon}</View>
      <Text className={cn('ml-3 text-base font-semibold', active ? 'text-white' : 'text-zinc-300')}>
        {label}
      </Text>
    </Pressable>
  );
}

function SidebarSection({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-800">{icon}</View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-white">{label}</Text>
          <Text className="text-xs text-zinc-400">{value}</Text>
        </View>
      </View>
    </View>
  );
}

export function SamplePage({ auth, onLogout }: SamplePageProps) {
  const [section, setSection] = useState<SectionKey>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMounted, setIsSidebarMounted] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 768;
  const drawerProgress = useSharedValue(0);

  useEffect(() => {
    if (isCompact && isSidebarOpen) {
      setIsSidebarMounted(true);
    }

    drawerProgress.value = withTiming(isSidebarOpen ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished && !isSidebarOpen) {
        runOnJS(setIsSidebarMounted)(false);
      }
    });
  }, [drawerProgress, isCompact, isSidebarOpen]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerProgress.value, [0, 1], [0, 1]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(drawerProgress.value, [0, 1], [-300, 0]),
      },
    ],
  }));

  const content = useMemo(() => {
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

    return <RealtimeDashboard />;
  }, [section]);

  return (
    <View className="flex-1 bg-black">
      {isCompact && (
        <View
          className="flex-row items-center border-b border-zinc-900 bg-zinc-950 px-4"
          style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
        >
          <Pressable
            onPress={() => setIsSidebarOpen((value) => !value)}
            className="mr-3 h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <Menu size={18} color="#ffffff" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-white">Fortmont API</Text>
            <Text className="text-xs text-zinc-400">Admin dashboard</Text>
          </View>
        </View>
      )}

      <View className="flex-1 flex-row">
        {isCompact && isSidebarMounted && (
          <View className="absolute inset-0 z-20">
            <Animated.View className="absolute inset-0 bg-black/60" style={overlayStyle}>
              <Pressable className="absolute inset-0" onPress={() => setIsSidebarOpen(false)} />
            </Animated.View>

            <Animated.View
              className="absolute left-0 top-0 h-full w-[280px] border-r border-zinc-900 bg-zinc-950 px-3"
              style={[
                drawerStyle,
                { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
              ]}
            >
              <View className="gap-2">
                <SidebarItem
                  label="Dashboard"
                  icon={<LayoutDashboard size={18} color="#ffffff" />}
                  active={section === 'dashboard'}
                  onPress={() => {
                    setSection('dashboard');
                    setIsSidebarOpen(false);
                  }}
                />
                <SidebarItem
                  label="Registry"
                  icon={<Database size={18} color="#ffffff" />}
                  active={section === 'registry'}
                  onPress={() => {
                    setSection('registry');
                    setIsSidebarOpen(false);
                  }}
                />
                <SidebarItem
                  label="LXC"
                  icon={<ServerCog size={18} color="#ffffff" />}
                  active={section === 'lxc'}
                  onPress={() => {
                    setSection('lxc');
                    setIsSidebarOpen(false);
                  }}
                />
                <SidebarItem
                  label="Users"
                  icon={<Users size={18} color="#ffffff" />}
                  onPress={() => {
                    setSection('dashboard');
                    setIsSidebarOpen(false);
                  }}
                />
              </View>

              <View className="mt-4 flex-1 justify-end gap-3">
                <SidebarSection
                  label={auth.user.displayName}
                  value={auth.user.email}
                  icon={<Text className="text-sm font-semibold text-white">{auth.user.displayName.slice(0, 1)}</Text>}
                />

                <Pressable
                  onPress={onLogout}
                  className="flex-row items-center rounded-xl border border-zinc-800 px-3 py-3"
                >
                  <View className="w-7 items-center justify-center">
                    <LogOut size={18} color="#ffffff" />
                  </View>
                  <Text className="ml-3 text-base font-semibold text-white">Log out</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        )}

        <View className="flex-1 bg-black px-4 py-4">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1">{content}</View>
          </ScrollView>
        </View>

        {!isCompact && (
          <View
            className="w-[280px] border-l border-zinc-900 bg-zinc-950 px-3"
            style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
          >
            <View className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4">
              <Text className="text-lg font-bold text-white">Fortmont API</Text>
              <Text className="mt-1 text-sm text-zinc-400">Admin dashboard</Text>
            </View>

            <View className="gap-2">
              <SidebarItem
                label="Dashboard"
                icon={<LayoutDashboard size={18} color="#ffffff" />}
                active={section === 'dashboard'}
                onPress={() => setSection('dashboard')}
              />
              <SidebarItem
                label="Registry"
                icon={<Database size={18} color="#ffffff" />}
                active={section === 'registry'}
                onPress={() => setSection('registry')}
              />
              <SidebarItem
                label="LXC"
                icon={<ServerCog size={18} color="#ffffff" />}
                active={section === 'lxc'}
                onPress={() => setSection('lxc')}
              />
              <SidebarItem
                label="Users"
                icon={<Users size={18} color="#ffffff" />}
                onPress={() => setSection('dashboard')}
              />
            </View>

            <View className="mt-4 flex-1 justify-end gap-3">
              <SidebarSection
                label={auth.user.displayName}
                value={auth.user.email}
                icon={<Text className="text-sm font-semibold text-white">{auth.user.displayName.slice(0, 1)}</Text>}
              />

              <Pressable
                onPress={onLogout}
                className="flex-row items-center rounded-xl border border-zinc-800 px-3 py-3"
              >
                <View className="w-7 items-center justify-center">
                  <LogOut size={18} color="#ffffff" />
                </View>
                <Text className="ml-3 text-base font-semibold text-white">Log out</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
