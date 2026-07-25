import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useColorScheme } from 'nativewind';

const DEFAULT_FORTMONT_ISSUER = 'https://api.fortmont.me';

type AppExtra = {
  fortmontIssuer?: string;
};

type ProxmoxNode = {
  id: string;
  node: string;
  status: string;
  mem: number;
  maxmem: number;
  cpu: number;
  uptime: number;
};

type ProxmoxSummary = {
  nodes?: ProxmoxNode[];
  totalVMs?: number;
  runningVMs?: number;
  totalLXC?: number;
  runningLXC?: number;
  memUsedBytes?: number;
  memTotalBytes?: number;
};

type ProxmoxSummaryResponse = {
  data?: ProxmoxSummary;
};

type RealtimeDashboardProps = {
  token: string;
};

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

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0m';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function usageFraction(used: number, total: number) {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(used / total, 1));
}

export function RealtimeDashboard({ token }: RealtimeDashboardProps) {
  const { colorScheme } = useColorScheme();
  const spinnerColor = colorScheme === 'dark' ? '#ffffff' : '#18181b';
  const [summary, setSummary] = useState<ProxmoxSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
  const issuer = extra.fortmontIssuer?.trim() || DEFAULT_FORTMONT_ISSUER;
  const endpoint = `${issuer}/api/proxmox/summary`;

  const nodes = summary?.nodes ?? [];
  const onlineNodes = useMemo(
    () => nodes.filter((node) => node.status?.toLowerCase() === 'online').length,
    [nodes]
  );
  const totalGuests = (summary?.totalVMs ?? 0) + (summary?.totalLXC ?? 0);
  const runningGuests = (summary?.runningVMs ?? 0) + (summary?.runningLXC ?? 0);
  const totalMemRatio = usageFraction(summary?.memUsedBytes ?? 0, summary?.memTotalBytes ?? 0);

  const loadSummary = useCallback(
    async (isBackgroundRefresh: boolean) => {
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
        const response = await fetch(endpoint, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as ProxmoxSummaryResponse;
        const nextSummary = payload.data ?? null;

        if (isMountedRef.current) {
          setSummary(nextSummary);
          setError(null);
        }
      } catch (requestError) {
        if (isMountedRef.current) {
          const message =
            requestError instanceof Error ? requestError.message : 'Unable to load summary data';
          setError(message);
          setSummary(null);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }

        requestInFlightRef.current = false;
      }
    },
    [endpoint, token]
  );

  useEffect(() => {
    void loadSummary(false);

    const refreshTimer = setInterval(() => {
      void loadSummary(true);
    }, 30000);

    return () => {
      isMountedRef.current = false;
      clearInterval(refreshTimer);
    };
  }, [loadSummary]);

  return (
    <View className="flex-1">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadSummary(true);
            }}
            tintColor={spinnerColor}
            colors={[spinnerColor]}
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-3xl border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-950">
          <Text className="text-xs uppercase tracking-[0.32em] text-zinc-400 dark:text-zinc-500">
            Infrastructure
          </Text>
          <Text className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Welcome back
          </Text>
          <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Live summary of your Proxmox cluster.
          </Text>
        </View>

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <Text className="text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              Nodes
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
              {onlineNodes}/{nodes.length || 0}
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Online</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <Text className="text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              Guests
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
              {runningGuests}/{totalGuests}
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Running</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <Text className="text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              Memory
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
              {formatPercent(totalMemRatio * 100)}
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Cluster used</Text>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 py-10 dark:border-zinc-800 dark:bg-zinc-950">
            <ActivityIndicator color={spinnerColor} />
            <Text className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Loading cluster summary...
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border border-rose-300 bg-rose-50 px-5 py-5 dark:border-rose-900/60 dark:bg-rose-950/40">
            <Text className="text-base font-semibold text-rose-800 dark:text-rose-100">
              Could not load cluster summary
            </Text>
            <Text className="mt-2 text-sm leading-5 text-rose-700 dark:text-rose-200/80">
              {error}
            </Text>
          </View>
        ) : nodes.length === 0 ? (
          <View className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-950">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white">No nodes returned</Text>
            <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              The summary API returned no node data.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {nodes.map((node) => {
              const memoryRatio = usageFraction(node.mem, node.maxmem);
              const cpuPct = Math.max(0, node.cpu || 0) * 100;
              const isOnline = node.status?.toLowerCase() === 'online';

              return (
                <View
                  key={node.id}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-zinc-900 dark:text-white">{node.node}</Text>
                      <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Uptime {formatUptime(node.uptime)}
                      </Text>
                    </View>

                    <View
                      className={
                        isOnline
                          ? 'rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 dark:border-emerald-700/60 dark:bg-emerald-900/20'
                          : 'rounded-full border border-rose-300 bg-rose-50 px-3 py-1 dark:border-rose-700/60 dark:bg-rose-900/20'
                      }
                    >
                      <Text
                        className={
                          isOnline
                            ? 'text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300'
                            : 'text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300'
                        }
                      >
                        {node.status}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text className="text-xs uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                        Memory
                      </Text>
                      <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {formatBytes(node.mem)} / {formatBytes(node.maxmem)}
                      </Text>
                    </View>

                    <View className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <View
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(2, memoryRatio * 100)}%` }}
                      />
                    </View>

                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatPercent(memoryRatio * 100)} used
                      </Text>
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                        CPU {formatPercent(cpuPct)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text className="mt-4 text-xs uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">
          Auto refreshes every 30 seconds
        </Text>
      </ScrollView>
    </View>
  );
}
