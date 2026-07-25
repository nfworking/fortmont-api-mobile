"use client";
/**
 * Vault – StorageScreen.tsx
 * React Native + NativeWind v4
 *
 * Drop this file into your screens/ or components/storage/ folder.
 *
 * Props
 *   token   – bearer token forwarded from your Auth context / session
 *   baseUrl – your API base, e.g. "https://vault.example.com"
 *
 * API surface (mirrors your Next.js routes):
 *   GET  /api/users                          → AccountResponse
 *   POST /api/storage/upload-url             → { uploadUrl, uploadId }
 *   POST /api/storage/complete-upload        → { fileId }
 *   GET  /api/storage/download?fileId=…      → { downloadUrl }
 *   DEL  /api/storage/delete/file/:id
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
// expo-file-system v19+ (SDK 54+) moved uploadAsync / cacheDirectory / FileSystemUploadType
// to the legacy subpath. Import from there so the types resolve correctly.
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "../lib/useAppTheme";

// ─── types ────────────────────────────────────────────────────────────────────

export interface FileOwner {
  id: string;
  username: string;
}

export interface StorageFile {
  id: string;
  owner: FileOwner;
  bucket: string;
  objectKey: string;
  name: string;
  size: number;
  createdAt?: string;
  contentType?: string;
}

export interface StorageUsage {
  quotaBytes: number;
  usedBytes: number;
}

export interface AccountResponse {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  files: StorageFile[];
  storage?: StorageUsage | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "mkv", "avi"];

function isImage(name: string) {
  return IMAGE_EXTS.includes(getFileExtension(name));
}
function isVideo(name: string) {
  return VIDEO_EXTS.includes(getFileExtension(name));
}

type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "app"
  | "other";

const EXT_MAP: Record<string, FileCategory> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  svg: "image", heic: "image", avif: "image",
  mp4: "video", mov: "video", mkv: "video", webm: "video", avi: "video",
  mp3: "audio", wav: "audio", flac: "audio", m4a: "audio",
  pdf: "document", doc: "document", docx: "document", txt: "document",
  md: "document", xls: "document", xlsx: "document", csv: "document",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  js: "code", ts: "code", tsx: "code", json: "code", py: "code",
};

function getFileCategory(name: string): FileCategory {
  return EXT_MAP[getFileExtension(name)] ?? "other";
}

// ─── file type icon (emoji-based, no dependency) ──────────────────────────────

function FileTypeEmoji({ name }: { name: string }) {
  const cat = getFileCategory(name);
  const map: Record<FileCategory, string> = {
    image: "🖼️",
    video: "🎬",
    audio: "🎵",
    document: "📄",
    archive: "🗜️",
    code: "💻",
    app: "📦",
    other: "📎",
  };
  return (
    <Text className="text-2xl" style={{ lineHeight: 32 }}>
      {map[cat]}
    </Text>
  );
}

// ─── API layer ────────────────────────────────────────────────────────────────

async function apiGet<T>(
  url: string,
  token: string,
): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function fetchFiles(
  baseUrl: string,
  token: string,
): Promise<StorageFile[]> {
  const data = await apiGet<AccountResponse>(`${baseUrl}/api/users`, token);
  return Array.isArray(data.files) ? data.files : [];
}

async function getSignedUrl(
  baseUrl: string,
  token: string,
  fileId: string,
): Promise<string> {
  const data = await apiGet<{ downloadUrl?: string; url?: string }>(
    `${baseUrl}/api/storage/download?fileId=${encodeURIComponent(fileId)}`,
    token,
  );
  const url = data.downloadUrl ?? data.url;
  if (!url) throw new Error("No download URL returned");
  return url;
}

async function deleteFile(
  baseUrl: string,
  token: string,
  fileId: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/storage/delete/file/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

type UploadStage = "requesting" | "uploading" | "finalizing";

async function uploadFile(
  baseUrl: string,
  token: string,
  file: { name: string; uri: string; mimeType?: string; size?: number },
  onStage?: (stage: UploadStage) => void,
): Promise<{ fileId: string }> {
  // 1 — request presigned URL
  onStage?.("requesting");
  const uploadUrlRes = await fetch(`${baseUrl}/api/storage/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.mimeType ?? "application/octet-stream",
      fileSize: file.size ?? 0,
      ticketId: null,
    }),
  });
  if (!uploadUrlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadUrl, uploadId } = await uploadUrlRes.json();

  // 2 — upload raw bytes
  onStage?.("uploading");
  const uploadRes = await FileSystem.uploadAsync(uploadUrl, file.uri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    mimeType: file.mimeType ?? "application/octet-stream",
  });
  if (uploadRes.status >= 300) {
    throw new Error(`Upload failed: ${uploadRes.status}`);
  }

  // 3 — finalize
  onStage?.("finalizing");
  const completeRes = await fetch(`${baseUrl}/api/storage/complete-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uploadId }),
  });
  if (!completeRes.ok) throw new Error("Failed to finalize upload");
  return completeRes.json();
}

// ─── upload progress sheet ────────────────────────────────────────────────────

function UploadProgressSheet({
  stage,
  filename,
}: {
  stage: UploadStage | null;
  filename: string;
}) {
  if (!stage) return null;

  const labels: Record<UploadStage, string> = {
    requesting: "Preparing upload…",
    uploading: "Uploading file…",
    finalizing: "Finalizing…",
  };
  const progress: Record<UploadStage, number> = {
    requesting: 0.15,
    uploading: 0.6,
    finalizing: 0.9,
  };

  return (
    <View
      className="absolute bottom-6 left-4 right-4 rounded-2xl border border-white/10 bg-zinc-900 p-4"
      style={{ shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 }}
    >
      <Text className="mb-1 text-xs font-medium text-zinc-400" numberOfLines={1}>
        {filename}
      </Text>
      <Text className="mb-3 text-sm font-semibold text-white">{labels[stage]}</Text>
      {/* progress bar */}
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
        <View
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${progress[stage] * 100}%` }}
        />
      </View>
    </View>
  );
}

// ─── image preview modal ───────────────────────────────────────────────────────

function ImagePreviewModal({
  file,
  baseUrl,
  token,
  onClose,
}: {
  file: StorageFile | null;
  baseUrl: string;
  token: string;
  onClose: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!file) return;
    setImgUrl(null);
    getSignedUrl(baseUrl, token, file.id)
      .then(setImgUrl)
      .catch(() => {});
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [file]);

  if (!file) return null;

  return (
    <Modal
      visible={!!file}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/90">
        <TouchableOpacity
          className="absolute right-5 top-12 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/10"
          onPress={onClose}
        >
          <Text className="text-lg text-white">✕</Text>
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeAnim }} className="w-full px-4">
          {imgUrl ? (
            <Image
              source={{ uri: imgUrl }}
              className="w-full rounded-xl"
              style={{ height: Dimensions.get("window").height * 0.7 }}
              resizeMode="contain"
            />
          ) : (
            <ActivityIndicator color="#6366f1" size="large" />
          )}
          <Text className="mt-3 text-center text-sm text-zinc-400" numberOfLines={1}>
            {file.name}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── file action menu ──────────────────────────────────────────────────────────

function FileActionsSheet({
  file,
  baseUrl,
  token,
  onClose,
  onDeleted,
}: {
  file: StorageFile | null;
  baseUrl: string;
  token: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  if (!file) return null;

  const handleDownload = async () => {
    try {
      setBusy(true);
      const url = await getSignedUrl(baseUrl, token, file.id);
      const dest = `${FileSystem.cacheDirectory}${file.name}`;
      const dl = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri);
      } else {
        Alert.alert("Downloaded", dl.uri);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete file",
      `"${file.name}" will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFile(baseUrl, token, file.id);
              onDeleted(file.id);
              onClose();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  const actions: { label: string; icon: string; onPress: () => void; danger?: boolean }[] = [
    { label: "Download", icon: "⬇️", onPress: handleDownload },
    { label: "Delete", icon: "🗑️", onPress: handleDelete, danger: true },
  ];

  return (
    <Modal visible={!!file} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View
        className="rounded-t-2xl border-t border-white/10 bg-zinc-900 px-4 pb-10 pt-3"
        style={{ shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 }}
      >
        {/* drag handle */}
        <View className="mb-4 items-center">
          <View className="h-1 w-10 rounded-full bg-zinc-600" />
        </View>

        {/* file info */}
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
            <FileTypeEmoji name={file.name} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white" numberOfLines={1}>
              {file.name}
            </Text>
            <Text className="text-xs text-zinc-400">{formatBytes(file.size)}</Text>
          </View>
        </View>

        <View className="h-px bg-white/10 mb-2" />

        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            className="flex-row items-center gap-3 rounded-xl px-1 py-3.5 active:bg-white/5"
            onPress={a.onPress}
            disabled={busy}
          >
            <Text className="w-7 text-center text-lg">{a.icon}</Text>
            <Text
              className={`text-sm font-medium ${a.danger ? "text-red-400" : "text-white"}`}
            >
              {a.label}
            </Text>
            {busy && a.label === "Download" && (
              <ActivityIndicator size="small" color="#6366f1" className="ml-auto" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

// ─── grid card ────────────────────────────────────────────────────────────────

function FileCard({
  file,
  baseUrl,
  token,
  onLongPress,
  onImagePress,
}: {
  file: StorageFile;
  baseUrl: string;
  token: string;
  onLongPress: () => void;
  onImagePress: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const image = isImage(file.name);

  useEffect(() => {
    if (!image) return;
    getSignedUrl(baseUrl, token, file.id)
      .then(setImgUrl)
      .catch(() => {});
  }, [file.id, image]);

  const ext = getFileExtension(file.name) || "file";

  return (
    <TouchableOpacity
      className="m-1.5 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      style={{ maxWidth: "46%" }}
      onPress={image ? onImagePress : undefined}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* thumbnail */}
      <View className="aspect-square w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        {image && imgUrl ? (
          <Image
            source={{ uri: imgUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <FileTypeEmoji name={file.name} />
        )}

        {/* video badge */}
        {isVideo(file.name) && (
          <View className="absolute inset-0 items-center justify-center bg-black/40">
            <Text className="text-3xl">▶️</Text>
          </View>
        )}
      </View>

      {/* meta */}
      <View className="px-2.5 py-2">
        <Text className="text-xs font-semibold text-zinc-900 dark:text-white" numberOfLines={1}>
          {file.name}
        </Text>
        <View className="mt-0.5 flex-row items-center justify-between">
          <Text className="font-mono text-[10px] uppercase text-zinc-500 dark:text-zinc-400">{ext}</Text>
          <Text className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{formatBytes(file.size)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── list row ─────────────────────────────────────────────────────────────────

function FileRow({
  file,
  onLongPress,
  onImagePress,
  baseUrl,
  token,
}: {
  file: StorageFile;
  onLongPress: () => void;
  onImagePress: () => void;
  baseUrl: string;
  token: string;
}) {
  return (
    <TouchableOpacity
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:active:bg-zinc-900"
      onPress={isImage(file.name) ? onImagePress : undefined}
      onLongPress={onLongPress}
    >
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
        <FileTypeEmoji name={file.name} />
      </View>
      <View className="flex-1 overflow-hidden">
        <Text className="text-sm font-medium text-zinc-900 dark:text-white" numberOfLines={1}>
          {file.name}
        </Text>
        <Text className="font-mono text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
          {file.objectKey}
        </Text>
      </View>
      <Text className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{formatBytes(file.size)}</Text>
    </TouchableOpacity>
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query, onUpload }: { query: string; onUpload: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
        <Text className="text-3xl">{query ? "🔍" : "📂"}</Text>
      </View>
      <Text className="text-center text-base font-semibold text-zinc-900 dark:text-white">
        {query ? "No files match your search" : "No files yet"}
      </Text>
      <Text className="mt-1.5 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {query
          ? "Try a different keyword or clear the search."
          : "Upload your first file to get started."}
      </Text>
      {!query && (
        <TouchableOpacity
          className="mt-5 rounded-xl bg-zinc-900 px-6 py-3 active:opacity-80 dark:bg-white"
          onPress={onUpload}
        >
          <Text className="text-sm font-semibold text-white dark:text-zinc-900">Upload file</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── storage usage bar ────────────────────────────────────────────────────────

function StorageBar({ storage }: { storage: StorageUsage }) {
  const used = storage.usedBytes;
  const quota = storage.quotaBytes;
  const pct = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

  return (
    <View className="mb-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Storage used</Text>
        <Text className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
          {formatBytes(used)} / {formatBytes(quota)}
        </Text>
      </View>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <View
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#22c55e",
          }}
        />
      </View>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export interface StorageScreenProps {
  token: string;
  baseUrl: string;
}

export function StorageScreen({ token, baseUrl }: StorageScreenProps) {
  const { isDark } = useAppTheme();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"name" | "size">("name");

  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);

  const [uploadStage, setUploadStage] = useState<UploadStage | null>(null);
  const [uploadFilename, setUploadFilename] = useState("");

  // ── data loading ────────────────────────────────────────────────────────────

  const load = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setIsLoading(true);
        setError(null);

        const data = await apiGet<AccountResponse>(`${baseUrl}/api/users`, token);
        setFiles(Array.isArray(data.files) ? data.files : []);
        setStorage(data.storage ?? null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [baseUrl, token],
  );

  useEffect(() => {
    load();
  }, [load]);

  // ── filtered + sorted list ──────────────────────────────────────────────────

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? files.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.objectKey.toLowerCase().includes(q),
        )
      : files;
    return [...filtered].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : b.size - a.size,
    );
  }, [files, query, sort]);

  // ── upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setUploadFilename(asset.name);
    try {
      await uploadFile(baseUrl, token, asset, setUploadStage);
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploadStage(null);
      setUploadFilename("");
    }
  };

  // ── delete callback ─────────────────────────────────────────────────────────

  const handleDeleted = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── render ──────────────────────────────────────────────────────────────────

  const numCols = view === "grid" ? 2 : 1;

  return (
    <View className="flex-1 bg-transparent">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── header ── */}
      <View className="mb-4 rounded-3xl border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-950">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">Storage</Text>
            <Text className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Vault</Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 active:opacity-80 dark:bg-white"
            onPress={handleUpload}
            disabled={!!uploadStage}
          >
            {uploadStage ? (
              <ActivityIndicator size="small" color={isDark ? "#18181b" : "#ffffff"} />
            ) : (
              <Text className="text-lg leading-none text-white dark:text-zinc-900">⬆</Text>
            )}
            <Text className="text-sm font-semibold text-white dark:text-zinc-900">Upload</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── storage bar ── */}
      {!isLoading && !error && storage && (
        <View>
          <StorageBar storage={storage} />
        </View>
      )}

      {/* ── search + controls ── */}
      <View className="mb-2 flex-row items-center gap-2 pb-3">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
          <Text className="text-zinc-500 dark:text-zinc-400">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search files…"
            placeholderTextColor="#52525b"
            className="flex-1 text-sm text-zinc-900 dark:text-white"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* sort */}
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          onPress={() => setSort((s) => (s === "name" ? "size" : "name"))}
        >
          <Text className="text-sm">{sort === "name" ? "🔤" : "📏"}</Text>
        </TouchableOpacity>

        {/* view toggle */}
        <View className="flex-row overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          {(["grid", "list"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              className={`h-10 w-10 items-center justify-center ${
                view === v ? "bg-zinc-900 dark:bg-white" : "bg-white dark:bg-zinc-950"
              }`}
              onPress={() => setView(v)}
            >
              <Text className={`text-sm ${view === v ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"}`}>
                {v === "grid" ? "⊞" : "≡"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── content ── */}
      {error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-4xl mb-3">⚠️</Text>
          <Text className="text-center text-base font-semibold text-zinc-900 dark:text-white">
            Couldn't load your files
          </Text>
          <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-xl bg-zinc-900 px-5 py-2.5 dark:bg-white"
            onPress={() => load()}
          >
            <Text className="text-sm font-medium text-white dark:text-zinc-900">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? "#ffffff" : "#18181b"} size="large" />
          <Text className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Loading files…</Text>
        </View>
      ) : visible.length === 0 ? (
        <EmptyState query={query} onUpload={handleUpload} />
      ) : view === "grid" ? (
        <FlatList
          data={visible}
          keyExtractor={(f) => f.id}
          numColumns={2}
          key="grid"
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={isDark ? "#ffffff" : "#18181b"}
            />
          }
          renderItem={({ item }) => (
            <FileCard
              file={item}
              baseUrl={baseUrl}
              token={token}
              onLongPress={() => setSelectedFile(item)}
              onImagePress={() => setPreviewFile(item)}
            />
          )}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(f) => f.id}
          key="list"
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={isDark ? "#ffffff" : "#18181b"}
            />
          }
          ListHeaderComponent={
            <View className="mx-4 mb-1 mt-1 overflow-hidden rounded-t-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              {/* rendered by FlatList items; header just provides container start */}
            </View>
          }
          renderItem={({ item }) => (
            <FileRow
              file={item}
              baseUrl={baseUrl}
              token={token}
              onLongPress={() => setSelectedFile(item)}
              onImagePress={() => setPreviewFile(item)}
            />
          )}
        />
      )}

      {/* ── upload progress ── */}
      <UploadProgressSheet stage={uploadStage} filename={uploadFilename} />

      {/* ── image preview modal ── */}
      <ImagePreviewModal
        file={previewFile}
        baseUrl={baseUrl}
        token={token}
        onClose={() => setPreviewFile(null)}
      />

      {/* ── file actions sheet ── */}
      <FileActionsSheet
        file={selectedFile}
        baseUrl={baseUrl}
        token={token}
        onClose={() => setSelectedFile(null)}
        onDeleted={handleDeleted}
      />
    </View>
  );
}

export default StorageScreen;