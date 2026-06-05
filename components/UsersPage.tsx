import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string;
};
import { FORTMONT_API_KEY } from '@env';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const apiKey = FORTMONT_API_KEY;

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('https://api.fortmont.me/api/users', {
          headers: {
            'x-api-key': apiKey,
          },
        });

        const data = (await response.json()) as
          | User[]
          | { data?: User[] };

        if (!response.ok) {
          throw new Error('Unable to load users.');
        }

        setUsers(Array.isArray(data) ? data : data.data ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load users.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getName = (user: User) =>
    user.displayName?.trim() || user.username;

  return (
    <View className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4">
      <View className="mb-4">
        <Text className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Users
        </Text>
        <Text className="mt-2 text-3xl font-bold text-white">
          User List
        </Text>
        <Text className="mt-2 text-sm text-zinc-400">
          Users returned from the API endpoint.
        </Text>
      </View>

      {isLoading ? (
        <View className="min-h-[240px] items-center justify-center rounded-2xl border border-zinc-800 bg-black">
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : error ? (
        <View className="rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-4">
          <Text className="text-sm text-red-300">{error}</Text>
        </View>
      ) : isCompact ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3">
            {users.length === 0 ? (
              <View className="rounded-2xl border border-zinc-800 bg-black px-4 py-6">
                <Text className="text-sm text-zinc-400">
                  No users found.
                </Text>
              </View>
            ) : (
              users.map((user) => (
                <View
                  key={user.id}
                  className="rounded-2xl border border-zinc-800 bg-black px-4 py-4"
                >
                  <Text className="text-lg font-semibold text-white">
                    {getName(user)}
                  </Text>
                  <Text className="mt-2 text-sm text-zinc-300">
                    {user.email}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[420px] overflow-hidden rounded-2xl border border-zinc-800">
            <View className="flex-row border-b border-zinc-800 bg-zinc-900 px-4 py-3">
              <Text className="w-64 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Name
              </Text>
              <Text className="flex-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Email
              </Text>
            </View>

            {users.length === 0 ? (
              <View className="bg-black px-4 py-6">
                <Text className="text-sm text-zinc-400">
                  No users found.
                </Text>
              </View>
            ) : (
              users.map((user, index) => (
                <View
                  key={user.id}
                  className={
                    index % 2 === 0
                      ? 'flex-row border-b border-zinc-900 bg-black px-4 py-4'
                      : 'flex-row border-b border-zinc-900 bg-zinc-950 px-4 py-4'
                  }
                >
                  <Text className="w-64 text-sm font-medium text-white">
                    {getName(user)}
                  </Text>
                  <Text className="flex-1 text-sm text-zinc-300">
                    {user.email}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}