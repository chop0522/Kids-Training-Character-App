import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { fromByteArray, toByteArray } from 'base64-js';
import type { AppStoreState } from '../../store/AppStoreContext';
import type { MediaAttachment } from '../../types';

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_FORMAT_VERSION = 2;
export const ZIP_MIME_TYPE = 'application/zip';

const DEFAULT_IMAGE_EXT = 'jpg';
const DEFAULT_VIDEO_EXT = 'mp4';

export function buildBackupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `gambari-album-backup_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours()
  )}-${pad(date.getMinutes())}.zip`;
}

export function normalizeMediaExtension(ext: string): string {
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!cleaned) return '';
  if (cleaned === 'jpeg') return 'jpg';
  if (cleaned === 'quicktime') return 'mov';
  return cleaned;
}

export function getMediaFileExtension(attachment: MediaAttachment): string {
  if (attachment.mimeType) {
    const parts = attachment.mimeType.split('/');
    if (parts[1]) {
      const normalized = normalizeMediaExtension(parts[1]);
      if (normalized) return normalized;
    }
  }
  if (attachment.fileName) {
    const match = attachment.fileName.match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) {
      const normalized = normalizeMediaExtension(match[1]);
      if (normalized) return normalized;
    }
  }
  if (attachment.uri) {
    const clean = attachment.uri.split('?')[0];
    const match = clean.match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) {
      const normalized = normalizeMediaExtension(match[1]);
      if (normalized) return normalized;
    }
  }
  return attachment.type === 'video' ? DEFAULT_VIDEO_EXT : DEFAULT_IMAGE_EXT;
}

export function makeMediaZipPath(id: string, extension: string): string {
  return `media/${id}.${extension}`;
}

export function isLikelyWebUri(uri: string): boolean {
  return uri.startsWith('blob:') || uri.startsWith('http://') || uri.startsWith('https://');
}

export async function readUriAsUint8Array(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web' || isLikelyWebUri(uri)) {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return toByteArray(base64);
}

export async function writeBytesToFile(uri: string, bytes: Uint8Array): Promise<void> {
  const base64 = fromByteArray(bytes);
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
}

export async function ensureDir(path: string): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  } catch (e) {
    // ignore if already exists
  }
}

export async function getFileSizeBytes(uri: string): Promise<number> {
  if (!uri.startsWith('file://')) return 0;
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && typeof info.size === 'number' ? info.size : 0;
  } catch (e) {
    return 0;
  }
}

export function downloadBytesAsFile(bytes: Uint8Array, fileName: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([bytes], { type: ZIP_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildStatsSummary(state: { children?: unknown[]; sessions?: unknown[] }, stats: {
  attachmentsCount: number;
  imageCount: number;
  videoCount: number;
  totalMediaBytes: number;
}): { childrenCount: number; sessionsCount: number } & typeof stats {
  return {
    childrenCount: state.children?.length ?? 0,
    sessionsCount: state.sessions?.length ?? 0,
    attachmentsCount: stats.attachmentsCount,
    imageCount: stats.imageCount,
    videoCount: stats.videoCount,
    totalMediaBytes: stats.totalMediaBytes,
  };
}

export function sanitizeState(state: Partial<AppStoreState>): Partial<AppStoreState> {
  const children = state.children ?? [];
  const validIds = new Set(children.map((child) => child.id));
  const filterByChildId = <T extends Record<string, unknown>>(input: T | undefined) => {
    if (!input) return input;
    const next: Record<string, unknown> = {};
    Object.keys(input).forEach((key) => {
      if (validIds.has(key)) {
        next[key] = input[key];
      }
    });
    return next as T;
  };
  return {
    ...state,
    activeBuddyKeyByChildId: filterByChildId(state.activeBuddyKeyByChildId),
    buddyProgressByChildId: filterByChildId(state.buddyProgressByChildId),
    discoveredFormIdsByChildId: filterByChildId(state.discoveredFormIdsByChildId),
    streakByChildId: filterByChildId(state.streakByChildId),
  };
}
