import { ImageIcon, Mail, ShieldCheck, User, UserCircle2, BadgeInfo, Edit2, Bell, Check, X, Camera } from 'lucide-react-native';
import { Image, Text, View, TextInput, Pressable, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import type { AuthResponse } from './LoginScreen';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your notification setup function
import { setupPushNotifications } from '../lib/useNotifications';

type ProfilePageProps = {
  profile: AuthResponse['user'];
  extraFields?: Array<{
    label: string;
    value?: string | null;
  }>;
  token?: string;
  onProfileUpdate?: () => void; // Added to trigger parent refetch/sync
};

export function ProfilePage({ profile, extraFields, token, onProfileUpdate }: ProfilePageProps) {
  const initials = (profile.displayName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  // Local state inputs
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [role, setRole] = useState(profile.role ?? '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Keep state in sync if the profile prop updates from a server refetch
  useEffect(() => {
    setDisplayName(profile.displayName ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.phone ?? '');
    setRole(profile.role ?? '');
  }, [profile]);

  // Track if any changes have been made locally
  useEffect(() => {
    setHasChanges(
      displayName !== (profile.displayName ?? '') ||
        email !== (profile.email ?? '') ||
        phone !== (profile.phone ?? '') ||
        role !== (profile.role ?? '')
    );
  }, [displayName, email, phone, role, profile]);

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
        Alert.alert(result.reason === 'permission_denied' ? 'Permission Denied' : 'Token Failed', 'Could not enable notifications.');
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
      setEditingField(null);
      if (onProfileUpdate) onProfileUpdate(); // Notifies parent to pull fresh API data
    } catch (err: any) {
      Alert.alert('Update failed', err?.message ?? String(err));
    } finally {
      setIsSaving(false);
    }
  }

  const mutableFields = [
    { label: 'Display name', key: 'displayName', value: displayName, setter: setDisplayName, icon: <UserCircle2 size={20} color="#a1a1aa" /> },
    { label: 'Email', key: 'email', value: email, setter: setEmail, icon: <Mail size={20} color="#a1a1aa" /> },
    { label: 'Phone', key: 'phone', value: phone, setter: setPhone, icon: <BadgeInfo size={20} color="#a1a1aa" /> },
    { label: 'Role', key: 'role', value: role, setter: setRole, icon: <ShieldCheck size={20} color="#a1a1aa" /> },
  ];

  return (
    <ScrollView className="flex-1 bg-zinc-950">
      <View className="px-4 py-6 sm:px-6">
        
        {/* Google-Style Centered Header Section */}
        <View className="items-center justify-center pt-4 pb-8">
          <View className="relative">
            <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-zinc-800 bg-zinc-900 shadow-xl">
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} className="h-full w-full rounded-full" resizeMode="cover" />
              ) : (
                <Text className="text-3xl font-semibold text-white">{initials || '?'}</Text>
              )}
            </View>
            <Pressable className="absolute bottom-0 right-0 rounded-full bg-zinc-800 p-2 border border-zinc-700 active:bg-zinc-700 shadow-md">
              <Camera size={16} color="#ffffff" />
            </Pressable>
          </View>
          
          <Text className="mt-4 text-2xl font-semibold text-white tracking-wide">{profile.displayName || 'Account Profile'}</Text>
          <Text className="mt-1 text-sm text-zinc-500 font-medium">{profile.email || 'Manage your personal info'}</Text>
        </View>

        {/* Info & Settings Section Card */}
        <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
          <View className="border-b border-zinc-800 px-4 py-4">
            <Text className="text-base font-semibold text-white">Basic info</Text>
            <Text className="text-xs text-zinc-500 mt-0.5">Some info may be visible to other users using the platform.</Text>
          </View>

          {/* System Read-only Metadata */}
          <View className="border-b border-zinc-800/60 px-4 py-2 bg-zinc-900/20">
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wider">User ID</Text>
              <Text className="text-sm font-mono text-zinc-400 select-all">{profile.id}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Username</Text>
              <Text className="text-sm font-medium text-zinc-300">@{profile.username}</Text>
            </View>
          </View>

          {/* Dynamic/Editable Fields List */}
          {mutableFields.map((field, index) => {
            const isEditing = editingField === field.key;
            return (
              <View 
                key={field.key} 
                className={`flex-row items-center border-b border-zinc-800/80 px-4 py-4 ${index === mutableFields.length - 1 ? 'border-b-0' : ''}`}
              >
                <View className="mr-4 text-zinc-400">{field.icon}</View>
                
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{field.label}</Text>
                  {isEditing ? (
                    <TextInput
                      value={String(field.value ?? '')}
                      onChangeText={field.setter}
                      autoFocus
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white text-base font-normal"
                    />
                  ) : (
                    <Text className="mt-1 text-base font-medium text-white">
                      {String(field.value ?? '').trim() || 'Not provided'}
                    </Text>
                  )}
                </View>

                {/* Direct inline editing toggles */}
                <View className="ml-2 flex-row gap-1">
                  {isEditing ? (
                    <>
                      <Pressable 
                        onPress={() => setEditingField(null)} 
                        className="rounded-full bg-zinc-800 p-2 border border-zinc-700"
                      >
                        <X size={16} color="#ef4444" />
                      </Pressable>
                    </>
                  ) : (
                    <Pressable 
                      onPress={() => setEditingField(field.key)} 
                      className="rounded-full p-2 active:bg-zinc-800"
                    >
                      <Edit2 size={16} color="#71717a" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Additional Fields Block */}
        {extraFields && extraFields.length > 0 && (
          <View className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <View className="border-b border-zinc-800 px-4 py-4">
              <Text className="text-base font-semibold text-white">Additional metadata</Text>
            </View>
            {extraFields.map((field, idx) => (
              <View 
                key={field.label} 
                className={`flex-row justify-between px-4 py-4 border-b border-zinc-800/60 ${idx === extraFields.length - 1 ? 'border-b-0' : ''}`}
              >
                <Text className="text-sm font-medium text-zinc-400">{field.label}</Text>
                <Text className="text-sm font-semibold text-white">{field.value || 'Not provided'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Alert Preferences & Tools Area */}
        <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <Text className="text-base font-semibold text-white">Privacy & notifications</Text>
          <Text className="mt-1 text-xs text-zinc-500">
            Manage how device alert tokens are provisioned down directly to your client application.
          </Text>
          
          <Pressable
            onPress={handleEnableNotifications}
            disabled={isEnablingPush}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 active:bg-zinc-700 disabled:opacity-60 py-3.5"
          >
            {isEnablingPush ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Bell size={16} color="#ffffff" />
                <Text className="text-sm font-medium text-white">Enable Device Notifications</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Sticky Action Bar for Global Changes */}
        {hasChanges && (
          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={() => {
                setDisplayName(profile.displayName ?? '');
                setEmail(profile.email ?? '');
                setPhone(profile.phone ?? '');
                setRole(profile.role ?? '');
                setEditingField(null);
              }}
              className="flex-1 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 py-3"
            >
              <Text className="text-sm font-semibold text-zinc-400">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="flex-2 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 shadow-lg active:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text className="text-sm font-semibold text-white">Save Changes</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}