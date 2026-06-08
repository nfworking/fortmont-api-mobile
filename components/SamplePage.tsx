import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
import { BlurView } from '@react-native-community/blur';
import type { AuthResponse } from './LoginScreen';
import { ProfilePage } from './ProfilePage';
import { RealtimeDashboard } from './RealtimeDashboard';
import { RegistryPage } from './RegistryPage';
import { UsersPage } from './UsersPage';
import { StyleSheet } from 'react-native';
import ImmichGallery from "./ImmichGallery";
type SamplePageProps = {
  auth: AuthResponse;
  onLogout: () => void;
};

type SectionKey = 'dashboard' | 'registry' | 'lxc' | 'profile' | 'users' | 'immich';

// ─── Floating tab item ────────────────────────────────────────────────────────

function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: (color: string, size: number) => React.ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
  duration: 220,
  easing: Easing.out(Easing.cubic),
});
  }, [active]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Active pill expands to show label; inactive collapses to icon only
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255,255,255,${interpolate(progress.value, [0, 1], [0, 0.18])})`,
    paddingHorizontal: interpolate(progress.value, [0, 1], [10, 16]),
    borderWidth: interpolate(progress.value, [0, 1], [0, 0.8]),
    borderColor: `rgba(255,255,255,${interpolate(progress.value, [0, 1], [0, 0.25])})`,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxWidth: interpolate(progress.value, [0, 1], [0, 72]),
    marginLeft: interpolate(progress.value, [0, 1], [0, 6]),
  }));

  const iconColor = active ? '#ffffff' : 'rgba(255,255,255,0.55)';

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
scale.value = withTiming(0.87, { duration: 80, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
        }}
      >
        <Animated.View
          style={pillStyle}
          className="flex-row items-center rounded-full py-2.5"
        >
          {icon(iconColor, 20)}
          <Animated.Text
            style={[labelStyle, { color: '#ffffff', fontSize: 13, fontWeight: '600', overflow: 'hidden' }]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
        </Animated.View>
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
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.15)',
      }}
    >
      {/* Blur sits behind everything as an absolute layer */}
      <BlurView
        blurType="dark"
        blurAmount={40}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Glass tint over the blur */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'rgba(20,20,20,0.55)' },
        ]}
      />

      {/* Content on top */}
      <View>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{name}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{email}</Text>
        </View>

        <Pressable
          onPress={onOpenProfile}
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View
            style={{
              height: 32,
              width: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings size={14} color="rgba(255,255,255,0.7)" />
          </View>
          <Text style={{ marginLeft: 10, fontSize: 13, fontWeight: '600', color: '#fff' }}>
            Profile settings
          </Text>
        </Pressable>

        <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <Pressable
          onPress={onLogout}
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View
            style={{
              height: 32,
              width: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(239,68,68,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={14} color="#f87171" />
          </View>
          <Text style={{ marginLeft: 10, fontSize: 13, fontWeight: '600', color: '#f87171' }}>
            Log out
          </Text>
        </Pressable>
      </View>
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
  }, [isOpen]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${interpolate(menuProgress.value, [0, 1], [0, 180])}deg` }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: interpolate(menuProgress.value, [0, 1], [-10, 0]) },
      { scale: interpolate(menuProgress.value, [0, 1], [0.96, 1]) },
    ],
  }));

  return (
    <View style={{ position: 'relative' }}>
      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={onToggle}
          onPressIn={() => { pressScale.value = withSpring(0.93, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { pressScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 4,
            paddingRight: 10,
            paddingVertical: 4,
            borderRadius: 999,
            borderWidth: 0.8,
            borderColor: 'rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <View style={{ height: 32, width: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ height: 32, width: 32, borderRadius: 16 }} resizeMode="cover" />
            ) : (
              <View style={{ height: 32, width: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{initial}</Text>
              </View>
            )}
          </View>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={13} color="rgba(255,255,255,0.5)" />
          </Animated.View>
        </Pressable>
      </Animated.View>

      {isOpen && (
        <Animated.View style={[menuStyle, { position: 'absolute', right: 0, top: 48, zIndex: 50, width: 240 }]}>
          <ProfileDropdown name={name} email={email} onOpenProfile={onOpenProfile} onLogout={onLogout} />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS: {
  key: SectionKey;
  label: string;
  icon: (color: string, size: number) => React.ReactNode;
}[] = [
  { key: 'dashboard', label: 'Home',     icon: (c, s) => <LayoutDashboard size={s} color={c} /> },
  { key: 'registry',  label: 'Registry', icon: (c, s) => <Database        size={s} color={c} /> },
  { key: 'lxc',       label: 'LXC',      icon: (c, s) => <ServerCog       size={s} color={c} /> },
  { key: 'users',     label: 'Users',    icon: (c, s) => <Users           size={s} color={c} /> },
  { key: 'immich',    label: 'Immich',   icon: (c, s) => <Users           size={s} color={c} /> },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SamplePage({ auth, onLogout }: SamplePageProps) {
  const [section, setSection] = useState<SectionKey>('dashboard');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const profileInitial = auth.user.displayName.slice(0, 1).toUpperCase();

  const NAVBAR_HEIGHT = 64;
  const NAVBAR_BOTTOM = insets.bottom + 16;

  const content = useMemo(() => {
    if (section === 'profile') return <ProfilePage profile={auth.user} token={auth.token} />;
    if (section === 'registry') return <RegistryPage />;
    if (section === 'immich') {
      return (
     <Text>Hello</Text>
      );
    }
    if (section === 'lxc') {
      return (
        <View style={{ flex: 1, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#09090b', paddingHorizontal: 24, paddingVertical: 24 }}>
          <Text style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#52525b' }}>LXC</Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 8 }}>LXC Registry</Text>
          <Text style={{ color: '#71717a', marginTop: 12 }}>This section is intentionally left empty for now.</Text>
        </View>
      );
    }
    if (section === 'users') return <UsersPage />;
    return <RealtimeDashboard />;
  }, [section, auth.user, auth.token]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Top header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(9,9,11,0.95)',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Fortmont API</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Admin dashboard</Text>
        </View>
        <ProfileMenuButton
          name={auth.user.displayName}
          email={auth.user.email}
          avatarUrl={auth.user.avatarUrl}
          initial={profileInitial}
          isOpen={isProfileMenuOpen}
          onToggle={() => setIsProfileMenuOpen((v) => !v)}
          onOpenProfile={() => { setSection('profile'); setIsProfileMenuOpen(false); }}
          onLogout={onLogout}
        />
      </View>

      {/* Content */}
      {section === 'dashboard' ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: NAVBAR_HEIGHT + NAVBAR_BOTTOM + 16 }}>
          {content}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: NAVBAR_HEIGHT + NAVBAR_BOTTOM + 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      )}

      {/* ── Floating liquid-glass navbar ── */}
      <View
        style={{
          position: 'absolute',
          bottom: NAVBAR_BOTTOM,
          left: 24,
          right: 24,
          height: NAVBAR_HEIGHT,
          borderRadius: 999,
          overflow: 'hidden',
          // Soft shadow for lift
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 20,
          elevation: 18,
        }}
      >
        {/* Blur layer */}
        <BlurView
          blurType="dark"
          blurAmount={50}
          style={{ position: 'absolute', inset: 0 }}
        />
        {/* Glass tint + border */}
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 999,
            borderWidth: 0.8,
            borderColor: 'rgba(255,255,255,0.18)',
          }}
        />
        {/* Top specular sheen */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.35)',
            borderRadius: 999,
          }}
        />

        {/* Tab items */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 8 }}>
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

      {/* Dismiss profile menu */}
      {isProfileMenuOpen && (
        <Pressable
          style={{ position: 'absolute', inset: 0, zIndex: 40 }}
          onPress={() => setIsProfileMenuOpen(false)}
        />
      )}
    </View>
  );
}