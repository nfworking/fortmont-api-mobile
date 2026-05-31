import { ImageIcon, Mail, ShieldCheck, User, UserCircle2, BadgeInfo, Edit2 } from 'lucide-react-native';
import { Image, Text, View, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import type { AuthResponse } from './LoginScreen';

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
    <View className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4">
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-[0.25em] text-zinc-500">{label}</Text>
          <Text className="mt-2 text-base font-semibold text-white">{value?.trim() ? value : 'Not provided'}</Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="space-y-2">
      <Text className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">{title}</Text>
      <Text className="text-sm text-zinc-400">{subtitle}</Text>
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
    { label: 'User ID', key: 'id', value: profile.id, icon: <BadgeInfo size={16} color="#ffffff" /> },
    { label: 'Username', key: 'username', value: profile.username, icon: <User size={16} color="#ffffff" /> },
    { label: 'Active', key: 'isActive', value: profile.isActive, icon: <ShieldCheck size={16} color="#ffffff" /> },
  ];

  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const toggleEdit = (key: string) => {
    setEditing((s) => ({ ...s, [key]: !s[key] }));
  };

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
      // Only include role in the PATCH if the current user has admin privileges
      if ((profile.role ?? '').toString().toLowerCase() === 'admin') {
        changes.role = role;
      } else {
        Alert.alert('Permission denied', 'Only admins can update role. Role change will be ignored.');
      }
    }

    if (Object.keys(changes).length === 0) return;

    setIsSaving(true);
    try {
      const url = `http://172.20.0.100:3000/api/auth`;
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

      try {
        await res.json();
      } catch (_) {}

      const existing = await Notifications.getPermissionsAsync();
      let finalStatus = existing.status;
      if (finalStatus !== 'granted') {
        const asked = await Notifications.requestPermissionsAsync();
        finalStatus = asked.status;
      }

      if (finalStatus === 'granted') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Profile updated',
            body: `profile information update for ${displayName || profile.displayName}`,
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: null,
        });
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
    <View className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4 sm:px-6 sm:py-6">
      <View className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950">
        <View className="border-b border-zinc-800 px-5 py-5">
          <View className="flex-row flex-wrap items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-900">
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} className="h-16 w-16 rounded-full bg-zinc-800" resizeMode="cover" />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                  <Text className="text-lg font-bold text-white">{initials || '?'}</Text>
                </View>
              )}
            </View>

            <View className="flex-1 min-w-[220px]">
              <Text className="text-sm uppercase tracking-[0.3em] text-zinc-500">Account profile</Text>
              <Text className="mt-2 text-3xl font-bold text-white">{profile.displayName}</Text>
              <Text className="mt-2 text-zinc-400">Edit your profile here</Text>
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

            {/* editable rows: displayName, email, phone, role - show as rows with small edit icon */}
            {[
              { label: 'Display name', key: 'displayName', value: displayName, icon: <UserCircle2 size={16} color="#ffffff" /> },
              { label: 'Email', key: 'email', value: email, icon: <Mail size={16} color="#ffffff" /> },
              { label: 'Phone', key: 'phone', value: phone, icon: <BadgeInfo size={16} color="#ffffff" /> },
              { label: 'Role', key: 'role', value: role, icon: <ShieldCheck size={16} color="#ffffff" /> },
            ].map((field) => (
              <View key={field.key} className="min-w-[180px] flex-1">
                <View className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3">
                  <View className="flex-row items-start gap-3">
                    <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-zinc-800">{field.icon}</View>
                    <View className="flex-1">
                      <Text className="text-xs uppercase tracking-[0.25em] text-zinc-500">{field.label}</Text>
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
                          className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-white text-base"
                        />
                      ) : (
                        <Text className="mt-2 text-sm font-semibold text-white">{String(field.value ?? '') || 'Not provided'}</Text>
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
                    <InfoRow label={field.label} value={field.value} icon={<BadgeInfo size={18} color="#ffffff" />} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View className="mt-8 rounded-2xl border border-dashed border-zinc-700 px-4 py-4">
            <Text className="text-sm font-semibold text-white">Settings area</Text>
            <Text className="mt-2 text-sm text-zinc-400">This section is intentionally static for now. Once the API exposes profile updates, the controls can be added here without changing the surrounding structure.</Text>
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
