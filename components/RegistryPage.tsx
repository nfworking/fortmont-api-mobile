import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from 'react-native';

type Dashboard = {
  id: string;
  name: string;
  version: string;
  hosted_on: string;
  server_url: string;
};

export function RegistryPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  useEffect(() => {
    const fetchDashboards = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('https://api.fortmont.me/api/registry');
        const data = (await response.json()) as Dashboard[] | { data?: Dashboard[] };

        if (!response.ok) {
          throw new Error('Unable to load registry data.');
        }

        setDashboards(Array.isArray(data) ? data : data.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load registry data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboards();
  }, []);

  return (
    <View className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4">
      <View className="mb-4">
        <Text className="text-sm uppercase tracking-[0.3em] text-zinc-500">Server Registry</Text>
        <Text className="mt-2 text-3xl font-bold text-white">Registry</Text>
        <Text className="mt-2 text-sm text-zinc-400">
          Services returned from the registry endpoint.
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
            {dashboards.length === 0 ? (
              <View className="rounded-2xl border border-zinc-800 bg-black px-4 py-6">
                <Text className="text-sm text-zinc-400">No registry items found.</Text>
              </View>
            ) : (
              dashboards.map((item) => (
                <View key={item.id} className="rounded-2xl border border-zinc-800 bg-black px-4 py-4">
                  <Text className="text-lg font-semibold text-white">{item.name}</Text>
                  <View className="mt-3 gap-2">
                    <View>
                      <Text className="text-xs uppercase tracking-[0.25em] text-zinc-500">Version</Text>
                      <Text className="mt-1 text-sm text-zinc-300">{item.version}</Text>
                    </View>
                    <View>
                      <Text className="text-xs uppercase tracking-[0.25em] text-zinc-500">Hosted On</Text>
                      <Text className="mt-1 text-sm text-zinc-300">{item.hosted_on}</Text>
                    </View>
                    <View>
                      <Text className="text-xs uppercase tracking-[0.25em] text-zinc-500">Server URL</Text>
                      <Text className="mt-1 text-sm text-zinc-300">{item.server_url}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[620px] overflow-hidden rounded-2xl border border-zinc-800">
            <View className="flex-row border-b border-zinc-800 bg-zinc-900 px-4 py-3">
              <Text className="w-40 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Name
              </Text>
              <Text className="w-24 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Version
              </Text>
              <Text className="w-28 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Hosted On
              </Text>
              <Text className="flex-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Server URL
              </Text>
            </View>

            {dashboards.length === 0 ? (
              <View className="bg-black px-4 py-6">
                <Text className="text-sm text-zinc-400">No registry items found.</Text>
              </View>
            ) : (
              dashboards.map((item, index) => (
                <View
                  key={item.id}
                  className={
                    index % 2 === 0
                      ? 'flex-row border-b border-zinc-900 bg-black px-4 py-4'
                      : 'flex-row border-b border-zinc-900 bg-zinc-950 px-4 py-4'
                  }
                >
                  <Text className="w-40 text-sm font-medium text-white">{item.name}</Text>
                  <Text className="w-24 text-sm text-zinc-300">{item.version}</Text>
                  <Text className="w-28 text-sm text-zinc-300">{item.hosted_on}</Text>
                  <Text className="flex-1 text-sm text-zinc-300">{item.server_url}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
