import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Pressable,
  StatusBar,
  Dimensions,
  RefreshControl,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  useWindowDimensions,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImmichConfig {
  serverUrl: string;
  apiKey: string;
}

interface ImmichAsset {
  id: string;
  deviceAssetId: string;
  ownerId: string;
  type: "IMAGE" | "VIDEO";
  originalPath: string;
  originalFileName: string;
  resized: boolean;
  thumbhash: string | null;
  fileCreatedAt: string;
  fileModifiedAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  duration: string;
  exifInfo?: {
    make?: string;
    model?: string;
    city?: string;
    state?: string;
    country?: string;
    description?: string;
    dateTimeOriginal?: string;
    fNumber?: number;
    exposureTime?: string;
    focalLength?: number;
    iso?: number;
    fileSizeInByte?: number;
    imageWidth?: number;
    imageHeight?: number;
  };
}

interface AlbumSimple {
  id: string;
  albumName: string;
  assetCount: number;
  albumThumbnailAssetId: string | null;
}

type ViewMode = "all" | "albums" | "favorites" | "videos";
type GridSize = 2 | 3 | 4;

// ─── Immich API client ────────────────────────────────────────────────────────

const createImmichClient = (config: ImmichConfig) => {
  const headers = {
    "x-api-key": config.apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const base = config.serverUrl.replace(/\/$/, "");

  const fetchJSON = async <T,>(path: string): Promise<T> => {
    const res = await fetch(`${base}/api${path}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  };

  // POST /api/search/metadata is the current way to list assets (GET /api/assets removed)
  const searchAssets = async (body: Record<string, unknown>): Promise<ImmichAsset[]> => {
    const res = await fetch(`${base}/api/search/metadata`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return data?.assets?.items ?? [];
  };

  return {
    ping: () => fetchJSON<{ res: string }>("/server/ping"),

    getAssets: (params: {
      page?: number;
      size?: number;
      isFavorite?: boolean;
      type?: "IMAGE" | "VIDEO";
    }) => {
      const body: Record<string, unknown> = {
        page: params.page ?? 1,
        size: params.size ?? 50,
        withExif: true,
        isArchived: false,
        isTrashed: false,
      };
      if (params.isFavorite !== undefined) body.isFavorite = params.isFavorite;
      if (params.type) body.type = params.type;
      return searchAssets(body);
    },

    getAlbums: () => fetchJSON<AlbumSimple[]>("/albums"),

    getAlbumAssets: async (albumId: string): Promise<ImmichAsset[]> => {
      const data = await fetchJSON<{ assets: { items: ImmichAsset[] } | ImmichAsset[] }>(
        `/albums/${albumId}`
      );
      if (Array.isArray(data.assets)) return data.assets as ImmichAsset[];
      return (data.assets as { items: ImmichAsset[] }).items ?? [];
    },

    // Correct thumbnail path: /api/assets/{id}/thumbnail?size=thumbnail|preview
    thumbnailUrl: (id: string, size: "thumbnail" | "preview" = "thumbnail") =>
      `${base}/api/assets/${id}/thumbnail?size=${size}&key=${config.apiKey}`,

    originalUrl: (id: string) =>
      `${base}/api/assets/${id}/original?key=${config.apiKey}`,

    toggleFavorite: async (id: string, isFavorite: boolean) => {
      const res = await fetch(`${base}/api/assets`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ids: [id], isFavorite }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
  };
};

// ─── Setup screen ─────────────────────────────────────────────────────────────

interface SetupScreenProps {
  onConnect: (config: ImmichConfig) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onConnect }) => {
  const [serverUrl, setServerUrl] = useState("http://");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!serverUrl || !apiKey) {
      setErrorMsg("Please enter both server URL and API key.");
      return;
    }
    setTesting(true);
    setErrorMsg(null);
    try {
      const client = createImmichClient({ serverUrl, apiKey });
      await client.ping();
      onConnect({ serverUrl, apiKey });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(`Connection failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 justify-center px-8">
        {/* Logo */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 bg-amber-400 rounded-3xl items-center justify-center mb-4 shadow-lg">
            <Text className="text-neutral-900 text-4xl font-black">I</Text>
          </View>
          <Text className="text-white text-3xl font-bold tracking-tight">
            Immich Gallery
          </Text>
          <Text className="text-neutral-500 text-sm mt-1 tracking-widest uppercase">
            Connect your server
          </Text>
        </View>

        {/* Inputs */}
        <View className="gap-4">
          <View>
            <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Server URL
            </Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-4 text-base"
              placeholder="https://your-immich-server.com"
              placeholderTextColor="#525252"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View>
            <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
              API Key
            </Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-4 text-base"
              placeholder="Your Immich API key"
              placeholderTextColor="#525252"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {errorMsg && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mt-1">
              <Text className="text-red-400 text-xs">{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            className={`mt-2 rounded-xl py-4 items-center ${
              testing ? "bg-amber-300" : "bg-amber-400"
            }`}
            onPress={handleConnect}
            disabled={testing}
            activeOpacity={0.85}
          >
            {testing ? (
              <ActivityIndicator color="#1c1917" />
            ) : (
              <Text className="text-neutral-900 font-bold text-base">
                Connect
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-neutral-700 text-xs text-center mt-8">
          Find your API key in Immich → Account Settings → API Keys
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ─── Asset thumbnail cell ─────────────────────────────────────────────────────

interface AssetCellProps {
  asset: ImmichAsset;
  size: number;
  thumbnailUrl: string;
  onPress: () => void;
}

const AssetCell: React.FC<AssetCellProps> = ({
  asset,
  size,
  thumbnailUrl,
  onPress,
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: size, height: size }}
      className="relative"
    >
      <Image
        source={{ uri: thumbnailUrl }}
        style={{ width: size, height: size, backgroundColor: "#171717" }}
        onLoad={() => setLoaded(true)}
        resizeMode="cover"
      />

      {!loaded && (
        <View
          className="absolute inset-0 bg-neutral-900 items-center justify-center"
          style={{ width: size, height: size }}
        />
      )}

      {asset.type === "VIDEO" && (
        <View className="absolute bottom-1.5 right-1.5 bg-black/70 rounded-md px-1.5 py-0.5 flex-row items-center gap-1">
          <Text className="text-white text-xs">▶</Text>
          {asset.duration !== "0:00:00.000000" && (
            <Text className="text-white text-xs">
              {formatDuration(asset.duration)}
            </Text>
          )}
        </View>
      )}

      {asset.isFavorite && (
        <View className="absolute top-1.5 right-1.5">
          <Text className="text-amber-400 text-xs">♥</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Detail modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  asset: ImmichAsset | null;
  client: ReturnType<typeof createImmichClient> | null;
  onClose: () => void;
  onFavoriteToggle: (id: string, isFavorite: boolean) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({
  asset,
  client,
  onClose,
  onFavoriteToggle,
}) => {
  const { width, height } = useWindowDimensions();
  const [showInfo, setShowInfo] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  if (!asset || !client) return null;

  const imageUrl = client.thumbnailUrl(asset.id, "preview");

  const handleFavorite = async () => {
    setTogglingFav(true);
    try {
      await client.toggleFavorite(asset.id, !asset.isFavorite);
      onFavoriteToggle(asset.id, !asset.isFavorite);
    } catch {
      Alert.alert("Error", "Could not update favorite.");
    } finally {
      setTogglingFav(false);
    }
  };

  const exif = asset.exifInfo;
  const date = new Date(asset.fileCreatedAt).toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Modal
      visible={!!asset}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" backgroundColor="black" />

        {/* Toolbar */}
        <SafeAreaView>
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <Text className="text-white text-lg">✕</Text>
            </TouchableOpacity>

            <Text
              className="text-neutral-400 text-sm flex-1 text-center mx-4"
              numberOfLines={1}
            >
              {asset.originalFileName}
            </Text>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleFavorite}
                disabled={togglingFav}
                className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
              >
                <Text
                  className={`text-lg ${
                    asset.isFavorite ? "text-amber-400" : "text-white"
                  }`}
                >
                  ♥
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowInfo((v) => !v)}
                className={`w-10 h-10 items-center justify-center rounded-full ${
                  showInfo ? "bg-amber-400/20" : "bg-white/10"
                }`}
              >
                <Text className="text-white text-base">ℹ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Image */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={{ uri: imageUrl }}
            style={{ width, height: height * 0.75 }}
            resizeMode="contain"
          />
        </View>

        {/* Info panel */}
        {showInfo && (
          <View className="bg-neutral-950/95 rounded-t-3xl p-6 pb-10">
            <View className="w-10 h-1 bg-neutral-700 rounded-full self-center mb-5" />

            <Text className="text-amber-400 text-xs uppercase tracking-widest font-semibold mb-1">
              {asset.type}
            </Text>
            <Text className="text-white text-base font-semibold mb-1">
              {date}
            </Text>

            {exif?.city && (
              <Text className="text-neutral-400 text-sm mb-4">
                📍 {[exif.city, exif.state, exif.country]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}

            {exif && (
              <View className="flex-row flex-wrap gap-2">
                {exif.make && (
                  <InfoChip label="Camera" value={`${exif.make} ${exif.model ?? ""}`} />
                )}
                {exif.fNumber && (
                  <InfoChip label="Aperture" value={`f/${exif.fNumber}`} />
                )}
                {exif.exposureTime && (
                  <InfoChip label="Shutter" value={exif.exposureTime} />
                )}
                {exif.focalLength && (
                  <InfoChip label="Focal" value={`${exif.focalLength}mm`} />
                )}
                {exif.iso && (
                  <InfoChip label="ISO" value={String(exif.iso)} />
                )}
                {exif.imageWidth && exif.imageHeight && (
                  <InfoChip
                    label="Size"
                    value={`${exif.imageWidth}×${exif.imageHeight}`}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const InfoChip: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View className="bg-neutral-800 rounded-lg px-3 py-2">
    <Text className="text-neutral-500 text-xs">{label}</Text>
    <Text className="text-white text-sm font-medium">{value}</Text>
  </View>
);

// ─── Albums grid ──────────────────────────────────────────────────────────────

interface AlbumsViewProps {
  albums: AlbumSimple[];
  client: ReturnType<typeof createImmichClient>;
  onSelectAlbum: (album: AlbumSimple) => void;
}

const AlbumsView: React.FC<AlbumsViewProps> = ({
  albums,
  client,
  onSelectAlbum,
}) => {
  const { width } = useWindowDimensions();
  const cellSize = (width - 48) / 2;

  return (
    <FlatList
      data={albums}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerClassName="p-4 gap-4"
      columnWrapperClassName="gap-4"
      renderItem={({ item }) => (
        <TouchableOpacity
          className="flex-1 rounded-2xl overflow-hidden bg-neutral-900"
          onPress={() => onSelectAlbum(item)}
          activeOpacity={0.85}
        >
          {item.albumThumbnailAssetId ? (
            <Image
              source={{
                uri: client.thumbnailUrl(item.albumThumbnailAssetId, "preview"),
              }}
              style={{ width: cellSize, height: cellSize }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="bg-neutral-800 items-center justify-center"
              style={{ width: cellSize, height: cellSize }}
            >
              <Text className="text-neutral-600 text-4xl">🖼</Text>
            </View>
          )}
          <View className="p-3">
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={1}
            >
              {item.albumName}
            </Text>
            <Text className="text-neutral-500 text-xs mt-0.5">
              {item.assetCount} item{item.assetCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-24">
          <Text className="text-neutral-600 text-base">No albums found</Text>
        </View>
      }
    />
  );
};

// ─── Main gallery screen ──────────────────────────────────────────────────────

interface GalleryScreenProps {
  config: ImmichConfig;
  onDisconnect: () => void;
}

const GalleryScreen: React.FC<GalleryScreenProps> = ({
  config,
  onDisconnect,
}) => {
  const { width } = useWindowDimensions();

  const client = useMemo(() => createImmichClient(config), [config]);

  const [assets, setAssets] = useState<ImmichAsset[]>([]);
  const [albums, setAlbums] = useState<AlbumSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSimple | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [selectedAsset, setSelectedAsset] = useState<ImmichAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const PAGE_SIZE = 50;
  const GAP = 2;
  const cellSize = Math.floor((width - GAP * (gridSize - 1)) / gridSize);

  // ── Fetch logic ────────────────────────────────────────────────────────────

  const fetchAssets = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        let fetched: ImmichAsset[] = [];

        if (viewMode === "albums" && selectedAlbum) {
          if (pageNum === 1) {
            fetched = await client.getAlbumAssets(selectedAlbum.id);
          }
        } else {
          const params: Parameters<typeof client.getAssets>[0] = {
            page: pageNum,
            size: PAGE_SIZE,
          };
          if (viewMode === "favorites") params.isFavorite = true;
          if (viewMode === "videos") params.type = "VIDEO";

          fetched = await client.getAssets(params);
        }

        setAssets((prev) =>
          reset ? fetched : [...prev, ...fetched]
        );
        setHasMore(fetched.length === PAGE_SIZE);
      } catch (e) {
        Alert.alert("Error", "Failed to load assets. Check your connection.");
      }
    },
    [client, viewMode, selectedAlbum]
  );

  const fetchAlbums = useCallback(async () => {
    try {
      const data = await client.getAlbums();
      setAlbums(data);
    } catch {}
  }, [client]);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    await Promise.all([fetchAssets(1, true), fetchAlbums()]);
    setLoading(false);
  }, [fetchAssets, fetchAlbums]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchAssets(1, true);
    setRefreshing(false);
  }, [fetchAssets]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore || viewMode === "albums") return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    await fetchAssets(next);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchAssets, viewMode]);

  // ── Filtered assets ────────────────────────────────────────────────────────

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter(
      (a) =>
        a.originalFileName.toLowerCase().includes(q) ||
        a.exifInfo?.city?.toLowerCase().includes(q) ||
        a.exifInfo?.country?.toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  // ── Favorite toggle ────────────────────────────────────────────────────────

  const handleFavoriteToggle = useCallback(
    (id: string, isFavorite: boolean) => {
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isFavorite } : a))
      );
      if (selectedAsset?.id === id) {
        setSelectedAsset((prev) => prev && { ...prev, isFavorite });
      }
    },
    [selectedAsset]
  );

  // ── Tab bar ────────────────────────────────────────────────────────────────

  const tabs: { mode: ViewMode; label: string; icon: string }[] = [
    { mode: "all", label: "All", icon: "⊞" },
    { mode: "albums", label: "Albums", icon: "▦" },
    { mode: "favorites", label: "Favorites", icon: "♥" },
    { mode: "videos", label: "Videos", icon: "▶" },
  ];

  const renderAsset = useCallback(
    ({ item }: { item: ImmichAsset }) => (
      <AssetCell
        asset={item}
        size={cellSize}
        thumbnailUrl={client.thumbnailUrl(item.id)}
        onPress={() => setSelectedAsset(item)}
      />
    ),
    [cellSize, client]
  );

  const keyExtractor = useCallback((item: ImmichAsset) => item.id, []);

  return (
    <View className="flex-1 bg-neutral-950">
      <StatusBar barStyle="light-content" />
      <SafeAreaView className="flex-1">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View className="px-4 pt-2 pb-3">
          {showSearch ? (
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 bg-neutral-900 text-white rounded-xl px-4 py-3 text-base border border-neutral-800"
                placeholder="Search by filename, city, country…"
                placeholderTextColor="#525252"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
              >
                <Text className="text-amber-400 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 bg-amber-400 rounded-lg items-center justify-center">
                  <Text className="text-neutral-900 font-black text-sm">I</Text>
                </View>
                <Text className="text-white font-bold text-lg tracking-tight">
                  {selectedAlbum ? selectedAlbum.albumName : "Gallery"}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                {/* Grid size toggle */}
                <TouchableOpacity
                  className="w-9 h-9 rounded-lg bg-neutral-800 items-center justify-center"
                  onPress={() =>
                    setGridSize((g) => (g === 2 ? 3 : g === 3 ? 4 : 2))
                  }
                >
                  <Text className="text-neutral-300 text-xs">
                    {gridSize === 2 ? "⊞" : gridSize === 3 ? "⊟" : "⊠"}
                  </Text>
                </TouchableOpacity>

                {/* Search */}
                <TouchableOpacity
                  className="w-9 h-9 rounded-lg bg-neutral-800 items-center justify-center"
                  onPress={() => setShowSearch(true)}
                >
                  <Text className="text-neutral-300 text-base">⌕</Text>
                </TouchableOpacity>

                {/* Settings */}
                <TouchableOpacity
                  className="w-9 h-9 rounded-lg bg-neutral-800 items-center justify-center"
                  onPress={() => setShowSettings((v) => !v)}
                >
                  <Text className="text-neutral-300 text-base">⚙</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Settings popover */}
        {showSettings && (
          <View className="mx-4 mb-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <Text className="text-neutral-400 text-xs uppercase tracking-widest font-semibold mb-3">
              Server
            </Text>
            <Text className="text-white text-sm mb-1" numberOfLines={1}>
              {config.serverUrl}
            </Text>
            <Text className="text-neutral-600 text-xs mb-4">
              API key: ●●●●●●●●{config.apiKey.slice(-4)}
            </Text>
            <TouchableOpacity
              className="bg-red-500/20 border border-red-500/30 rounded-xl py-3 items-center"
              onPress={onDisconnect}
            >
              <Text className="text-red-400 font-semibold text-sm">
                Disconnect
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 pb-3 gap-2"
        >
          {tabs.map((tab) => {
            const active = viewMode === tab.mode;
            return (
              <TouchableOpacity
                key={tab.mode}
                onPress={() => {
                  setViewMode(tab.mode);
                  setSelectedAlbum(null);
                  setPage(1);
                }}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
                  active
                    ? "bg-amber-400"
                    : "bg-neutral-900 border border-neutral-800"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-sm ${
                    active ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {tab.icon}
                </Text>
                <Text
                  className={`text-sm font-semibold ${
                    active ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Content ──────────────────────────────────────────────────── */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#fbbf24" size="large" />
            <Text className="text-neutral-600 text-sm mt-3">
              Loading assets…
            </Text>
          </View>
        ) : viewMode === "albums" && !selectedAlbum ? (
          <AlbumsView
            albums={albums}
            client={client}
            onSelectAlbum={(album) => {
              setSelectedAlbum(album);
              setPage(1);
            }}
          />
        ) : (
          <FlatList
            data={filteredAssets}
            keyExtractor={keyExtractor}
            numColumns={gridSize}
            key={gridSize} // re-mount when grid changes
            renderItem={renderAsset}
            ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
            columnWrapperStyle={gridSize > 1 ? { gap: GAP } : undefined}
            contentContainerStyle={{ paddingBottom: 24 }}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fbbf24"
              />
            }
            ListHeaderComponent={
              selectedAlbum ? (
                <TouchableOpacity
                  className="flex-row items-center gap-2 px-4 py-3"
                  onPress={() => setSelectedAlbum(null)}
                >
                  <Text className="text-amber-400">← Back to albums</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-24">
                <Text className="text-neutral-600 text-5xl mb-4">🖼</Text>
                <Text className="text-neutral-500 text-base">
                  {searchQuery ? "No results found" : "No assets here"}
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-6 items-center">
                  <ActivityIndicator color="#fbbf24" size="small" />
                </View>
              ) : null
            }
          />
        )}

        {/* ── Asset count badge ─────────────────────────────────────────── */}
        {!loading && filteredAssets.length > 0 && (
          <View className="absolute bottom-4 right-4 bg-neutral-900/90 border border-neutral-800 rounded-full px-3 py-1.5">
            <Text className="text-neutral-400 text-xs">
              {filteredAssets.length.toLocaleString()} item
              {filteredAssets.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <DetailModal
        asset={selectedAsset}
        client={client}
        onClose={() => setSelectedAsset(null)}
        onFavoriteToggle={handleFavoriteToggle}
      />
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(duration: string): string {
  try {
    const parts = duration.split(":");
    if (parts.length < 3) return "";
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const s = Math.floor(parseFloat(parts[2]));
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function ImmichGallery() {
  const [config, setConfig] = useState<ImmichConfig | null>(null);

  if (!config) {
    return <SetupScreen onConnect={setConfig} />;
  }

  return (
    <GalleryScreen config={config} onDisconnect={() => setConfig(null)} />
  );
}