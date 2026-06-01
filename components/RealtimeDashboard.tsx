import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { RealtimeVmCard, type RealtimeVm } from './RealtimeVmCard';

type RealtimeApiResponse = {
  data?: RealtimeVm[];
};

const API_URL = 'https://api.fortmont.me/api/realtime';
const API_URL_DEV = 'https://api.fortmont.me/api/realtime/prodapp';

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : value < 10 ? 1 : 0;

  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function RealtimeDashboard() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isWide = width >= 960;
  const [vms, setVms] = useState<RealtimeVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadRealtimeData = useCallback(async (isBackgroundRefresh: boolean) => {
    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;

    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch(API_URL, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as RealtimeApiResponse;
      const nextVms = Array.isArray(payload.data)
        ? [...payload.data].sort((left, right) => left.vmid - right.vmid)
        : [];

      if (isMountedRef.current) {
        setVms(nextVms);
        setError(null);
      }
    } catch (requestError) {
      if (isMountedRef.current) {
        const message = requestError instanceof Error ? requestError.message : 'Unable to load realtime data';
        setError(message);
        setVms([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }

      requestInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadRealtimeData(false);

    const refreshTimer = setInterval(() => {
      void loadRealtimeData(true);
    }, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(refreshTimer);
    };
  }, [loadRealtimeData]);

  return (
    <View className="flex-1">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadRealtimeData(true);
            }}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 overflow-hidden rounded-3xl border border-emerald-900/30 bg-zinc-950 px-5 py-5">
          <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/10" />
          <View className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-cyan-500/10" />

          <Text className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">Realtime monitor</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Live LXC status</Text>
          <Text className="mt-3 max-w-2xl text-sm leading-5 text-zinc-400">
           Welcome to your dashboard!
          </Text>

          <View className="mt-4 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2.5 self-start">
            <Text className="text-sm font-semibold text-zinc-200">{vms.length} machines</Text>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-10">
            <ActivityIndicator color="#ffffff" />
            <Text className="mt-4 text-sm text-zinc-400">Loading realtime data…</Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border border-rose-900/60 bg-rose-950/40 px-5 py-5">
            <Text className="text-base font-semibold text-rose-100">Could not load realtime data</Text>
            <Text className="mt-2 text-sm leading-5 text-rose-200/80">{error}</Text>
          </View>
        ) : vms.length === 0 ? (
          <View className="rounded-3xl border border-zinc-800 bg-zinc-950 px-5 py-5">
            <Text className="text-base font-semibold text-white">No VMs returned</Text>
            <Text className="mt-2 text-sm text-zinc-400">The API responded successfully, but it did not return any data.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {vms.map((vm, index) => (
              <View
                key={`${vm.vmid}-${vm.name}`}
                style={{ width: isWide ? '48.5%' : '100%', marginBottom: 12 }}
              >
                <RealtimeVmCard vm={vm} index={index} formatBytes={formatBytes} />
              </View>
            ))}
          </View>
        )}

        {!isCompact && (
          <Text className="mt-4 text-xs uppercase tracking-[0.3em] text-zinc-500">
            Auto refreshes every 15 seconds
          </Text>
        )}
      </ScrollView>
    </View>
  );
}