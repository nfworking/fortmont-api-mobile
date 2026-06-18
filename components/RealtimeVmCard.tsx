import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export type RealtimeVm = {
  vmid: number;
  name: string;
  mem: number;
  status: string;
};

type RealtimeVmCardProps = {
  vm: RealtimeVm;
  index: number;
  formatBytes: (bytes: number) => string;
};

function isRunningStatus(status: string) {
  return status.toLowerCase() === 'running';
}

function StatusDot({ status }: { status: string }) {
  const pulse = useSharedValue(0);
  const running = isRunningStatus(status);
  const toneClass = running ? 'bg-emerald-400' : 'bg-rose-400';

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.85]) }],
  }));

  return (
    <View className="flex-row items-center">
      <View className="relative mr-2 h-3 w-3 items-center justify-center">
        <Animated.View
          className={`absolute h-3 w-3 rounded-full ${toneClass}`}
          style={ringStyle}
        />
        <View className={`h-2.5 w-2.5 rounded-full ${toneClass}`} />
      </View>
      <Text className={`text-xs font-semibold uppercase tracking-[0.25em] ${running ? 'text-emerald-300' : 'text-rose-300'}`}>
        {status}
      </Text>
    </View>
  );
}

export function RealtimeVmCard({ vm, index, formatBytes }: RealtimeVmCardProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 80,
      withTiming(1, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [index, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [16, 0]),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.985, 1]),
      },
    ],
  }));

  return (
    <Animated.View style={cardStyle}>
      <View className="rounded-3xl border border-zinc-200 px-4 py-4 shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-[0.35em] text-zinc-400 dark:text-zinc-500">VMID {vm.vmid}</Text>
            <Text numberOfLines={1} className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">
              {vm.name}
            </Text>
          </View>

          <StatusDot status={vm.status} />
        </View>

        <View className="mt-4 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Text className="text-xs uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-500">Memory</Text>
          <Text className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">{formatBytes(vm.mem)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}