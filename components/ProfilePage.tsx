import { ImageIcon, Mail, ShieldCheck, User, UserCircle2, BadgeInfo } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';
import type { AuthResponse } from './LoginScreen';

type ProfilePageProps = {
  profile: AuthResponse['user'];
  extraFields?: Array<{
    label: string;
    value?: string | null;
  }>;
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
          <Text className="mt-2 text-base font-semibold text-white">
            {value?.trim() ? value : 'Not provided yet'}
          </Text>
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
  if (value === null) {
    return 'Not provided';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

export function ProfilePage({ profile, extraFields }: ProfilePageProps) {
  const initials = profile.displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const baseFields = [
    { label: 'User ID', key: 'id', value: profile.id, icon: <BadgeInfo size={18} color="#ffffff" /> },
    { label: 'Username', key: 'username', value: profile.username, icon: <User size={18} color="#ffffff" /> },
    {
      label: 'Display name',
      key: 'displayName',
      value: profile.displayName,
      icon: <UserCircle2 size={18} color="#ffffff" />,
    },
    { label: 'Email', key: 'email', value: profile.email, icon: <Mail size={18} color="#ffffff" /> },
    { label: 'Active', key: 'isActive', value: profile.isActive, icon: <ShieldCheck size={18} color="#ffffff" /> },
    { label: 'Role', key: 'role', value: profile.role, icon: <ShieldCheck size={18} color="#ffffff" /> },
    { label: 'Phone', key: 'phone', value: profile.phone, icon: <BadgeInfo size={18} color="#ffffff" /> },
  ];

  return (
    <View className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4 sm:px-6 sm:py-6">
      <View className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950">
        <View className="border-b border-zinc-800 px-5 py-5">
          <View className="flex-row flex-wrap items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-900">
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  className="h-16 w-16 rounded-full bg-zinc-800"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                  <Text className="text-lg font-bold text-white">{initials || '?'}</Text>
                </View>
              )}
            </View>

            <View className="flex-1 min-w-[220px]">
              <Text className="text-sm uppercase tracking-[0.3em] text-zinc-500">Account profile</Text>
              <Text className="mt-2 text-3xl font-bold text-white">{profile.displayName}</Text>
              <Text className="mt-2 text-zinc-400">
                Read-only profile details. Editing controls will be added after the API supports them.
              </Text>
            </View>

            <View className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <View className="flex-row items-center gap-2">
                <ImageIcon size={16} color="#a1a1aa" />
                <Text className="text-sm font-semibold text-white">Avatar placeholder</Text>
              </View>
              <Text className="mt-1 text-xs text-zinc-400">No image record has been created yet.</Text>
            </View>
          </View>
        </View>

        <View className="px-5 py-5">
          <SectionHeading
            title="Retrieved details"
            subtitle="Everything currently available from the session is displayed here."
          />

          <View className="mt-5 flex-row flex-wrap gap-4">
            {baseFields.map((field) => (
              <View key={field.key} className="min-w-[220px] flex-1">
                <InfoRow label={field.label} value={formatValue(field.value)} icon={field.icon} />
              </View>
            ))}
          </View>

          {extraFields && extraFields.length > 0 ? (
            <>
              <View className="mt-8">
                <SectionHeading
                  title="Additional fields"
                  subtitle="Future API values can be passed in here without changing the layout."
                />
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
            <Text className="mt-2 text-sm text-zinc-400">
              This section is intentionally static for now. Once the API exposes profile updates, the
              controls can be added here without changing the surrounding structure.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
