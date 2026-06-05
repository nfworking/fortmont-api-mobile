import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
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
  Menu,
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

const DRAWER_WIDTH = 280;

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

function ProfileDropdown({
  name,
  email,
  onOpenProfile,
}: {
  name: string;
  email: string;
  onOpenProfile: () => void;
}) {
  return (
    <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/30">
      <View className="border-b border-zinc-800 px-4 py-3">
        <Text className="text-sm font-semibold text-white">{name}</Text>
        <Text className="mt-1 text-xs text-zinc-400">{email}</Text>
      </View>
      <Pressable onPress={onOpenProfile} className="flex-row items-center px-4 py-3 active:bg-zinc-900">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
          <Settings size={16} color="#ffffff" />
        </View>
        <View className="ml-3">
          <Text className="text-sm font-semibold text-white">Profile</Text>
          <Text className="text-xs text-zinc-400">Open your profile settings</Text>
        </View>
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
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  initial: string;
  isOpen: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
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
      {
        rotateZ: `${interpolate(menuProgress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [0, 1]),
    transform: [
      {
        translateY: interpolate(menuProgress.value, [0, 1], [-6, 0]),
      },
      {
        scale: interpolate(menuProgress.value, [0, 1], [0.98, 1]),
      },
    ],
  }));

  return (
    <View className="relative">
      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={onToggle}
          onPressIn={() => {
            pressScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          className="flex-row items-center rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1"
        >
          <View className="h-9 w-9 overflow-hidden rounded-full bg-zinc-800">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-9 w-9 rounded-full" resizeMode="cover" />
            ) : (
              <View className="h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                <Text className="text-sm font-semibold text-white">{initial}</Text>
              </View>
            )}
          </View>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={14} color="#a1a1aa" style={{ marginLeft: 6 }} />
          </Animated.View>
        </Pressable>
      </Animated.View>

      {isOpen && (
        <Animated.View style={menuStyle} className="absolute right-0 top-14 z-30 w-64">
          <ProfileDropdown name={name} email={email} onOpenProfile={onOpenProfile} />
        </Animated.View>
      )}
    </View>
  );
}

export function SamplePage({ auth, onLogout }: SamplePageProps) {
  const [section, setSection] = useState<SectionKey>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMounted, setIsSidebarMounted] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 768;
  const drawerProgress = useSharedValue(0);
  const profileInitial = auth.user.displayName.slice(0, 1).toUpperCase();
  const isDraggingSidebar = useRef(false);

  const openProfilePage = () => {
    setSection('profile');
    setIsProfileMenuOpen(false);
    setIsSidebarOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((value) => !value);
  };

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

  useEffect(() => {
    if (!isCompact) {
      setIsSidebarMounted(false);
      setIsSidebarOpen(false);
      setIsProfileMenuOpen(false);
      isDraggingSidebar.current = false;
    }
  }, [isCompact]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerProgress.value, [0, 1], [0, 1]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(drawerProgress.value, [0, 1], [-DRAWER_WIDTH, 0]),
      },
    ],
  }));

  const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

  const updateDrawerProgress = (value: number) => {
    drawerProgress.value = clampProgress(value);
  };

  const openSidebar = () => {
    setIsSidebarMounted(true);
    setIsSidebarOpen(true);
    setIsProfileMenuOpen(false);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setIsProfileMenuOpen(false);
  };

  const sidebarEdgeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isCompact && !isSidebarOpen,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isCompact &&
          !isSidebarOpen &&
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          isDraggingSidebar.current = true;
          setIsSidebarMounted(true);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isDraggingSidebar.current) {
            return;
          }

          updateDrawerProgress(gestureState.dx / DRAWER_WIDTH);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isDraggingSidebar.current) {
            return;
          }

          const shouldOpen = gestureState.dx > DRAWER_WIDTH * 0.35 || gestureState.vx > 0.5;
          isDraggingSidebar.current = false;
          setIsSidebarOpen(shouldOpen);
        },
        onPanResponderTerminate: () => {
          isDraggingSidebar.current = false;
          setIsSidebarOpen(false);
        },
      }),
    [isCompact, isSidebarOpen, drawerProgress]
  );

  const sidebarDrawerResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isCompact && isSidebarOpen,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isCompact &&
          isSidebarOpen &&
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          isDraggingSidebar.current = true;
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isDraggingSidebar.current) {
            return;
          }

          updateDrawerProgress(1 + gestureState.dx / DRAWER_WIDTH);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isDraggingSidebar.current) {
            return;
          }

          const shouldOpen = !(gestureState.dx < -DRAWER_WIDTH * 0.2 || gestureState.vx < -0.5);
          isDraggingSidebar.current = false;
          setIsSidebarOpen(shouldOpen);
        },
        onPanResponderTerminate: () => {
          isDraggingSidebar.current = false;
          setIsSidebarOpen(true);
        },
      }),
    [isCompact, isSidebarOpen, drawerProgress]
  );

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
      return (
      
        <UsersPage />
     
      );
    }

    return <RealtimeDashboard />;
  }, [section]);

  return (
    <View className="flex-1 bg-black">
      {isCompact && (
        <View className="relative border-b border-zinc-900 bg-zinc-950 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => {
                if (isSidebarOpen) {
                  closeSidebar();
                } else {
                  openSidebar();
                }
              }}
              className="mr-3 h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <Menu size={18} color="#ffffff" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">Fortmont API</Text>
              <Text className="text-xs text-zinc-400">Admin dashboard</Text>
            </View>
            <ProfileMenuButton
              name={auth.user.displayName}
              email={auth.user.email}
              avatarUrl={auth.user.avatarUrl}
              initial={profileInitial}
              isOpen={isProfileMenuOpen}
              onToggle={toggleProfileMenu}
              onOpenProfile={openProfilePage}
            />
          </View>
        </View>
      )}

      {!isCompact && (
        <View
          className="relative flex-row items-center border-b border-zinc-900 bg-zinc-950 px-4"
          style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
        >
          <View className="flex-1">
            <Text className="text-base font-bold text-white">Fortmont API</Text>
            <Text className="text-xs text-zinc-400">Admin dashboard</Text>
          </View>

          <ProfileMenuButton
            name={auth.user.displayName}
            email={auth.user.email}
            avatarUrl={auth.user.avatarUrl}
            initial={profileInitial}
            isOpen={isProfileMenuOpen}
            onToggle={toggleProfileMenu}
            onOpenProfile={openProfilePage}
          />
        </View>
      )}

      <View className="flex-1 flex-row">
        {isCompact && isSidebarMounted && (
          <View className="absolute inset-0 z-20">
            <Animated.View className="absolute inset-0 bg-black/60" style={overlayStyle}>
              <Pressable className="absolute inset-0" onPress={closeSidebar} />
            </Animated.View>

            {!isSidebarOpen && (
              <View className="absolute bottom-0 left-0 top-0 z-30 w-6" {...sidebarEdgeResponder.panHandlers} />
            )}

            <Animated.View
              className="absolute left-0 top-0 h-full w-[280px] border-r border-zinc-900 bg-zinc-950 px-3"
              style={[
                drawerStyle,
                { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
              ]}
              {...sidebarDrawerResponder.panHandlers}
            >
              <View className="gap-2">
                <SidebarItem
                  label="Dashboard"
                  icon={<LayoutDashboard size={18} color="#ffffff" />}
                  active={section === 'dashboard'}
                  onPress={() => {
                    setSection('dashboard');
                    closeSidebar();
                  }}
                />
                <SidebarItem
                  label="Registry"
                  icon={<Database size={18} color="#ffffff" />}
                  active={section === 'registry'}
                  onPress={() => {
                    setSection('registry');
                    closeSidebar();
                  }}
                />
                <SidebarItem
                  label="LXC"
                  icon={<ServerCog size={18} color="#ffffff" />}
                  active={section === 'lxc'}
                  onPress={() => {
                    setSection('lxc');
                    closeSidebar();
                  }}
                />
                <SidebarItem
                  label="Users"
                  icon={<Users size={18} color="#ffffff" />}
                  onPress={() => {
                    setSection('users');
                    closeSidebar();
                  }}
                />
                
              </View>

              <View className="mt-4 flex-1 justify-end">
                <Pressable
                  onPress={() => {
                    closeSidebar();
                    onLogout();
                  }}
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
          {section === 'dashboard' ? (
            <View className="flex-1">{content}</View>
          ) : (
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
              <View className="flex-1">{content}</View>
            </ScrollView>
          )}
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
                onPress={() => {
                  setSection('dashboard');
                  setIsProfileMenuOpen(false);
                }}
              />
              <SidebarItem
                label="Registry"
                icon={<Database size={18} color="#ffffff" />}
                active={section === 'registry'}
                onPress={() => {
                  setSection('registry');
                  setIsProfileMenuOpen(false);
                }}
              />
              <SidebarItem
                label="LXC"
                icon={<ServerCog size={18} color="#ffffff" />}
                active={section === 'lxc'}
                onPress={() => {
                  setSection('lxc');
                  setIsProfileMenuOpen(false);
                }}
              />
              <SidebarItem
                label="Users"
                icon={<Users size={18} color="#ffffff" />}
                onPress={() => {
                  setSection('users');
                  setIsProfileMenuOpen(false);
                }}
              />
            </View>

            <View className="mt-4 flex-1 justify-end">
              <Pressable
                onPress={() => {
                  closeSidebar();
                  onLogout();
                }}
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
