import { ImageIcon, Mail, ShieldCheck, User, UserCircle2, BadgeInfo, Edit2, Bell } from 'lucide-react-native';
import { Image, Text, View, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import type { AuthResponse } from './LoginScreen';
import { ThemeToggle } from './ThemeToggle';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your notification setup function
import { setupPushNotifications } from '../lib/useNotifications'; // Adjust this path to match your file structure

type ProfilePageProps = {
  profile: AuthResponse['user'];
  extraFields?: Array<{
    label: string;
    value?: string | null;
  }>;
  token?: string;
};

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">{label}</Text>
          <Text className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">{value?.trim() ? value : 'Not provided'}</Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="space-y-2">
      <Text className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400 dark:text-zinc-500">{title}</Text>
      <Text className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</Text>
    </View>
  );
}

function formatValue(value: unknown) {
  if (value === null) return 'Not provided';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function ProfilePage({ profile, extraFields, token }: ProfilePageProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#ffffff' : '#18181b';
  const initials = (profile.displayName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [role, setRole] = useState(profile.role ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(
      displayName !== (profile.displayName ?? '') ||
        email !== (profile.email ?? '') ||
        phone !== (profile.phone ?? '') ||
        role !== (profile.role ?? '')
    );
  }, [displayName, email, phone, role, profile]);

  const baseFields = [
    { label: 'User ID', key: 'id', value: profile.id, icon: <BadgeInfo size={16} color={iconColor} /> },
    { label: 'Username', key: 'username', value: profile.username, icon: <User size={16} color={iconColor} /> },
    { label: 'Active', key: 'isActive', value: profile.isActive, icon: <ShieldCheck size={16} color={iconColor} /> },
  ];

  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const toggleEdit = (key: string) => {
    setEditing((s) => ({ ...s, [key]: !s[key] }));
  };

  async function handleEnableNotifications() {
  if (!token) {
    Alert.alert('Missing token', 'Cannot register device token without an auth token.');
    return;
  }

  const alreadySetup = await AsyncStorage.getItem(`push_setup_done_${profile.id}`);
  if (alreadySetup === 'true') {
    Alert.alert('Already enabled', `Notifications are already set up on this device for ${profile.displayName || profile.username}.`);
    return;
  }

  setIsEnablingPush(true);

  try {
    const result = await setupPushNotifications();

    if (!result.success) {
      Alert.alert(
        result.reason === 'permission_denied'
          ? 'Permission Denied'
          : 'Token Failed',
        'Could not enable notifications.'
      );
      return;
    }

    const res = await fetch(`https://api.fortmont.me/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        token: result.token,
        platform: Platform.OS,
        deviceVersion: Device.osVersion,
        deviceName: Device.deviceName,
        deviceModelName: Device.modelName,
        deviceBrand: Device.brand,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    await AsyncStorage.setItem(`push_setup_done_${profile.id}`, 'true');

    Alert.alert('Success', 'Notifications enabled');
  } catch (err: any) {
    Alert.alert('Setup Error', err?.message ?? String(err));
  } finally {
    setIsEnablingPush(false);
  }
}

  async function handleSave() {
    if (!token) {
      Alert.alert('Missing token', 'Cannot update profile without an auth token.');
      return;
    }

    const changes: Record<string, any> = {};
    if (displayName !== (profile.displayName ?? '')) changes.displayName = displayName;
    if (email !== (profile.email ?? '')) changes.email = email;
    if (phone !== (profile.phone ?? '')) changes.phone = phone;
    if (role !== (profile.role ?? '')) {
      if ((profile.role ?? '').toString().toLowerCase() === 'admin') {
        changes.role = role;
      } else {
        Alert.alert('Permission denied', 'Only admins can update role. Role change will be ignored.');
      }
    }

    if (Object.keys(changes).length === 0) return;

    setIsSaving(true);
    try {
      const url = `https://api.fortmont.me/api/auth/`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      Alert.alert('Success', 'Profile updated successfully');
      setHasChanges(false);
    } catch (err: any) {
      Alert.alert('Update failed', err?.message ?? String(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View className="flex-1 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 sm:py-6">
      <View className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <View className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <View className="flex-row flex-wrap items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-full border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" resizeMode="cover" />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <Text className="text-lg font-bold text-zinc-900 dark:text-white">{initials || '?'}</Text>
                </View>
              )}
            </View>

            <View className="flex-1 min-w-[220px]">
              <Text className="text-sm uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Account profile</Text>
              <Text className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{profile.displayName}</Text>
              <Text className="mt-2 text-zinc-500 dark:text-zinc-400">Edit your profile here</Text>
            </View>
          </View>
        </View>

        <View className="px-5 py-5">
          <SectionHeading title="Your details" subtitle="Edit your information below" />

          <View className="mt-4 flex-row flex-wrap gap-3">
            {baseFields.map((field) => (
              <View key={field.key} className="min-w-[180px] flex-1">
                <InfoRow label={field.label} value={formatValue(field.value)} icon={field.icon} />
              </View>
            ))}

            {[
              { label: 'Display name', key: 'displayName', value: displayName, icon: <UserCircle2 size={16} color={iconColor} /> },
              { label: 'Email', key: 'email', value: email, icon: <Mail size={16} color={iconColor} /> },
              { label: 'Phone', key: 'phone', value: phone, icon: <BadgeInfo size={16} color={iconColor} /> },
              { label: 'Role', key: 'role', value: role, icon: <ShieldCheck size={16} color={iconColor} /> },
            ].map((field) => (
              <View key={field.key} className="min-w-[180px] flex-1">
                <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <View className="flex-row items-start gap-3">
                    <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">{field.icon}</View>
                    <View className="flex-1">
                      <Text className="text-xs uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">{field.label}</Text>
                      {editing[field.key] ? (
                        <TextInput
                          value={String(field.value ?? '')}
                          onChangeText={(text) => {
                            if (field.key === 'displayName') setDisplayName(text);
                            if (field.key === 'email') setEmail(text);
                            if (field.key === 'phone') setPhone(text);
                            if (field.key === 'role') setRole(text);
                          }}
                          placeholder={String(field.value ?? '')}
                          placeholderTextColor="#71717a"
                          className="mt-2 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                        />
                      ) : (
                        <Text className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">{String(field.value ?? '') || 'Not provided'}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => toggleEdit(field.key)} className="ml-2 items-center justify-center rounded-full p-2">
                      <Edit2 size={14} color="#a1a1aa" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {extraFields && extraFields.length > 0 ? (
            <>
              <View className="mt-8">
                <SectionHeading title="Additional fields" subtitle="Future API values can be passed in here without changing the layout." />
              </View>

              <View className="mt-5 flex-row flex-wrap gap-4">
                {extraFields.map((field) => (
                  <View key={field.label} className="min-w-[220px] flex-1">
                    <InfoRow label={field.label} value={field.value} icon={<BadgeInfo size={18} color={iconColor} />} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View className="mt-8 rounded-2xl border border-dashed border-zinc-300 px-4 py-4 dark:border-zinc-700">
            <Text className="text-sm font-semibold text-zinc-900 dark:text-white">Settings area</Text>
            <Text className="mt-2 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your application alert preferences directly from your profile dashboard.
            </Text>

            <ThemeToggle variant="segmented" className="mb-4" />
            
            <Pressable
              onPress={handleEnableNotifications}
              disabled={isEnablingPush}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 active:bg-zinc-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:active:bg-zinc-700"
            >
              {isEnablingPush ? (
                <ActivityIndicator color={iconColor} size="small" />
              ) : (
                <>
                  <Bell size={16} color={iconColor} />
                  <Text className="text-sm font-medium text-zinc-900 dark:text-white">Enable Notifications</Text>
                </>
              )}
            </Pressable>
          </View>

          {hasChanges ? (
            <View className="mt-6 flex-row justify-end">
              <Pressable
                onPress={handleSave}
                className="rounded-full bg-emerald-600 px-4 py-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Save changes</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}