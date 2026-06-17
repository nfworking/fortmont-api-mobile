import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';

type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string;
};

export function UsersPage() {
  const { colorScheme } = useColorScheme();
  const spinnerColor = colorScheme === 'dark' ? '#ffffff' : '#18181b';
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;



  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('https://api.fortmont.me/api/users', {
          
        });

        const data = (await response.json()) as User[] | { data?: User[] };

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
    <View className="flex-1 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <View className="mb-4">
        <Text className="text-sm uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">
          Users
        </Text>
        <Text className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
          User List
        </Text>
        <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Users returned from the API endpoint.
        </Text>
      </View>

      {isLoading ? (
        <View className="min-h-[240px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-black">
          <ActivityIndicator color={spinnerColor} />
        </View>
      ) : error ? (
        <View className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 dark:border-red-900/50 dark:bg-red-950/30">
          <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
        </View>
      ) : isCompact ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3">
            {users.length === 0 ? (
              <View className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-black">
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  No users found.
                </Text>
              </View>
            ) : (
              users.map((user) => (
                <View
                  key={user.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-black"
                >
                  <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {getName(user)}
                  </Text>
                  <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {user.email}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[420px] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <View className="flex-row border-b border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="w-64 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
                Name
              </Text>
              <Text className="flex-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
                Email
              </Text>
            </View>

            {users.length === 0 ? (
              <View className="bg-zinc-50 px-4 py-6 dark:bg-black">
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  No users found.
                </Text>
              </View>
            ) : (
              users.map((user, index) => (
                <View
                  key={user.id}
                  className={
                    index % 2 === 0
                      ? 'flex-row border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-900 dark:bg-black'
                      : 'flex-row border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-900 dark:bg-zinc-950'
                  }
                >
                  <Text className="w-64 text-sm font-medium text-zinc-900 dark:text-white">
                    {getName(user)}
                  </Text>
                  <Text className="flex-1 text-sm text-zinc-600 dark:text-zinc-300">
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
