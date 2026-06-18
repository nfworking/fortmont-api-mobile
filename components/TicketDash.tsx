import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface Ticket {
  id: string;
  type: string;
  department: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus | string;
  createdById?: string | null;
  assignedToId?: string | null;
  createdBy?: User | null;
  assignedTo?: User | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers (ported as-is from the web dashboard's logic)
// ---------------------------------------------------------------------------

function normalizeStatus(status: Ticket['status']) {
  return (status ?? 'open').toString().toLowerCase();
}

function statusLabel(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function displayName(user: User | null | undefined, fallback: string) {
  return user?.displayName ?? user?.email ?? fallback;
}

function calculateStats(tickets: Ticket[]) {
  return {
    total: tickets.length,
    open: tickets.filter((t) => normalizeStatus(t.status) === 'open').length,
    unassigned: tickets.filter((t) => !t.assignedToId).length,
    inProgress: tickets.filter((t) => normalizeStatus(t.status) === 'in_progress').length,
    resolved: tickets.filter((t) => ['resolved', 'closed'].includes(normalizeStatus(t.status))).length,
    urgent: tickets.filter((t) => t.priority === 'URGENT').length,
  };
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Tabs (status filter)
// ---------------------------------------------------------------------------

type TabKey = 'all' | 'open' | 'in_progress' | 'pending' | 'unassigned' | 'resolved';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending', label: 'Pending' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'resolved', label: 'Resolved' },
];

// ---------------------------------------------------------------------------
// Data-driven color lookups.
//
// These map ticket priority/status to a color pair. Because the value is
// chosen at render time from ticket data (not a static className Tailwind
// can extract at build time), the swatch itself is applied via a tiny
// inline `style`, while every other visual property (padding, radius,
// font weight, dark mode, layout) stays in `className` below.
// ---------------------------------------------------------------------------

const priorityColor: Record<TicketPriority, { fg: string; bg: string }> = {
  LOW: { fg: '#15803D', bg: 'rgba(34, 197, 94, 0.12)' },
  MEDIUM: { fg: '#A16207', bg: 'rgba(234, 179, 8, 0.14)' },
  HIGH: { fg: '#C2410C', bg: 'rgba(249, 115, 22, 0.14)' },
  URGENT: { fg: '#BE123C', bg: 'rgba(244, 63, 94, 0.14)' },
};

const statusColor: Record<string, { fg: string; bg: string }> = {
  open: { fg: '#2563EB', bg: 'rgba(59, 130, 246, 0.12)' },
  in_progress: { fg: '#7C3AED', bg: 'rgba(139, 92, 246, 0.12)' },
  pending: { fg: '#A16207', bg: 'rgba(234, 179, 8, 0.14)' },
  resolved: { fg: '#15803D', bg: 'rgba(34, 197, 94, 0.12)' },
  closed: { fg: '#52525B', bg: 'rgba(113, 113, 122, 0.14)' },
};

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Pill({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: bg }}>
      <Text className="text-[10px] font-bold tracking-wide" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: number;
  accentClassName?: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-zinc-200 bg-white px-2 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
      <Text className={`text-lg font-bold text-zinc-900 dark:text-zinc-50 ${accentClassName ?? ''}`}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{label}</Text>
    </View>
  );
}

function TicketRow({
  ticket,
  viewMode,
  onPress,
}: {
  ticket: Ticket;
  viewMode: 'list' | 'grid';
  onPress: (ticket: Ticket) => void;
}) {
  const status = normalizeStatus(ticket.status);
  const sColor = statusColor[status] ?? statusColor.open;
  const pColor = priorityColor[ticket.priority] ?? priorityColor.MEDIUM;
  const assignee = displayName(ticket.assignedTo, 'Unassigned');

  return (
    <Pressable
      onPress={() => onPress(ticket)}
      className={`rounded-xl border border-zinc-200 bg-white p-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800 ${
        viewMode === 'grid' ? 'mb-2' : ''
      }`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-shrink flex-row gap-1.5">
          <Pill label={ticket.priority} fg={pColor.fg} bg={pColor.bg} />
          <Pill label={statusLabel(status)} fg={sColor.fg} bg={sColor.bg} />
        </View>
        <Text className="text-[11px] text-zinc-400 dark:text-zinc-500">{timeAgo(ticket.updatedAt)}</Text>
      </View>

      <Text
        className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        numberOfLines={viewMode === 'grid' ? 2 : 1}
      >
        {ticket.subject}
      </Text>

      <Text className="mb-2.5 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
        {ticket.department} · {ticket.type}
      </Text>

      <View className="flex-row items-center justify-between">
        <View className="flex-shrink flex-row items-center gap-1.5">
          <View
            className={`h-1.5 w-1.5 rounded-full ${
              ticket.assignedToId ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          />
          <Text className="flex-shrink text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
            {assignee}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View className="items-center px-8 pt-16">
      <Text className="mb-1.5 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
        No tickets here
      </Text>
      <Text className="text-center text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Nothing matches the current filter. Try a different tab or search term.
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View className="mb-3 flex-row gap-3">
      <Text className="w-24 text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
      <View className="flex-1">
        {typeof value === 'string' ? (
          <Text className="text-sm text-zinc-900 dark:text-zinc-50">{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

function TicketDetailModal({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const visible = ticket !== null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* Stop backdrop press from closing when tapping inside the sheet */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="max-h-[85%] rounded-t-3xl border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Drag handle */}
            <View className="items-center pt-2.5 pb-1">
              <View className="h-1 w-9 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </View>

            {ticket && (
              <ScrollView
                className="px-5 pt-3"
                contentContainerStyle={{ paddingBottom: 28 }}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  const status = normalizeStatus(ticket.status);
                  const sColor = statusColor[status] ?? statusColor.open;
                  const pColor = priorityColor[ticket.priority] ?? priorityColor.MEDIUM;

                  return (
                    <>
                      <View className="mb-3 flex-row items-center gap-1.5">
                        <Pill label={ticket.priority} fg={pColor.fg} bg={pColor.bg} />
                        <Pill label={statusLabel(status)} fg={sColor.fg} bg={sColor.bg} />
                      </View>

                      <Text className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {ticket.subject}
                      </Text>
                      <Text className="mb-5 text-xs text-zinc-500 dark:text-zinc-400">
                        {ticket.department} · {ticket.type}
                      </Text>

                      <View className="mb-5 h-px bg-zinc-200 dark:bg-zinc-800" />

                      <Text className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Description
                      </Text>
                      <Text className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                        {ticket.description}
                      </Text>

                      <View className="mb-5 h-px bg-zinc-200 dark:bg-zinc-800" />

                      <Text className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        People
                      </Text>
                      <DetailRow label="Created by" value={displayName(ticket.createdBy, 'Unknown')} />
                      <DetailRow label="Assigned to" value={displayName(ticket.assignedTo, 'Unassigned')} />

                      <View className="mb-5 h-px bg-zinc-200 dark:bg-zinc-800" />

                      <Text className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Timeline
                      </Text>
                      <DetailRow label="Created" value={new Date(ticket.createdAt).toLocaleString()} />
                      <DetailRow label="Updated" value={new Date(ticket.updatedAt).toLocaleString()} />
                      <DetailRow
                        label="Ticket ID"
                        value={<Text className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{ticket.id}</Text>}
                      />
                    </>
                  );
                })()}
              </ScrollView>
            )}

            <View className="px-5 pb-6 pt-2">
              <Pressable
                onPress={onClose}
                className="items-center rounded-xl border border-zinc-200 bg-zinc-100 py-3 active:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:active:bg-zinc-700"
              >
                <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Close</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

const TICKETS_ENDPOINT = 'https://api.fortmont.me/api/ticketing/get/ticket';

export function TicketDashboard() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<TabKey>('all');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);

  const fetchTickets = React.useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setIsLoading(true);

    try {
      const res = await fetch(`${TICKETS_ENDPOINT}?refresh=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data: Ticket[] = await res.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      if (!silent) setError('Could not load tickets. Pull to refresh to try again.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Light polling so the queue stays roughly current, mirroring the web
  // dashboard's silent background refresh.
  React.useEffect(() => {
    const id = setInterval(() => fetchTickets({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [fetchTickets]);

  const handlePullToRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchTickets({ silent: true });
    setIsRefreshing(false);
  }, [fetchTickets]);

  const stats = React.useMemo(() => calculateStats(tickets), [tickets]);

  const filteredTickets = React.useMemo(() => {
    let result = tickets;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => {
        const creator = displayName(t.createdBy, '').toLowerCase();
        const assignee = displayName(t.assignedTo, '').toLowerCase();
        return (
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          creator.includes(q) ||
          assignee.includes(q)
        );
      });
    }

    if (activeTab !== 'all') {
      result = result.filter((t) => {
        const status = normalizeStatus(t.status);
        if (activeTab === 'resolved') return status === 'resolved' || status === 'closed';
        if (activeTab === 'unassigned') return !t.assignedToId;
        return status === activeTab;
      });
    }

    return result;
  }, [tickets, search, activeTab]);

  return (
    <View className="flex-1 bg-transparent ">
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-[22px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ticket Queue
        </Text>
        <Text className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
          {stats.total} ticket{stats.total === 1 ? '' : 's'} · updated live
        </Text>
      </View>

      {/* Stats */}
      <View className="mb-3.5 flex-row gap-2 px-4">
        <StatCard label="Open" value={stats.open} accentClassName="text-blue-600 dark:text-blue-400" />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          accentClassName="text-violet-600 dark:text-violet-400"
        />
        <StatCard label="Unassigned" value={stats.unassigned} />
        <StatCard label="Urgent" value={stats.urgent} accentClassName="text-rose-600 dark:text-rose-400" />
      </View>

      {/* Search + view toggle */}
      <View className="mb-2.5 flex-row gap-2 px-4">
        <View className="h-[38px] flex-1 justify-center rounded-[10px] border border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tickets..."
            placeholderTextColor="#9CA3AF"
            className="text-sm text-zinc-900 dark:text-zinc-50"
          />
        </View>

        <View className="flex-row overflow-hidden rounded-[10px] border border-zinc-200 dark:border-zinc-800">
          <Pressable
            onPress={() => setViewMode('list')}
            className={`h-[38px] items-center justify-center px-3 ${
              viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-950' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                viewMode === 'list'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              List
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('grid')}
            className={`h-[38px] items-center justify-center px-3 ${
              viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-950' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                viewMode === 'grid'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Cards
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Status tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-2.5 flex-grow-0"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {TABS.map((item) => {
          const active = activeTab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setActiveTab(item.key)}
              className={`rounded-full border px-3.5 py-1.5 ${
                active
                  ? 'border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-950'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Error banner */}
      {error && (
        <View className="mx-4 mb-2.5 rounded-[10px] border border-rose-300 bg-rose-50 p-2.5 dark:border-rose-900 dark:bg-rose-950/40">
          <Text className="text-[13px] text-zinc-900 dark:text-zinc-50">{error}</Text>
        </View>
      )}

      {/* Ticket list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator className="text-blue-500" />
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          key={viewMode}
          keyExtractor={(t) => t.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? { gap: 8 } : undefined}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} tintColor="#3B82F6" />
          }
          renderItem={({ item }) => (
            <View className={viewMode === 'grid' ? 'flex-1' : undefined}>
              <TicketRow ticket={item} viewMode={viewMode} onPress={setSelectedTicket} />
            </View>
          )}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </View>
  );
}

export default TicketDashboard;