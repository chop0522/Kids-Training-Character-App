import * as FileSystem from 'expo-file-system';

export type StoredMedia = {
  storedUri: string;
  storedPath?: string;
};

const MEDIA_ROOT = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}media/` : null;

export async function ensureSessionMediaDir(sessionId: string): Promise<string> {
  if (!MEDIA_ROOT) return '';
  const dir = `${MEDIA_ROOT}${sessionId}`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch (e) {
    console.warn('Failed to ensure media directory', e);
  }
  return dir;
}

export function guessExtension(uri: string, fallback: string): string {
  const cleaned = uri.split('?')[0];
  const filename = cleaned.split('/').pop() ?? '';
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (match?.[1]) return match[1].toLowerCase();
  return fallback.toLowerCase();
}

export async function copyIntoAppStorage(input: {
  sessionId: string;
  type: 'photo' | 'video';
  originalUri: string;
  filenameHint?: string;
}): Promise<StoredMedia> {
  if (!MEDIA_ROOT || !FileSystem.documentDirectory) {
    return { storedUri: input.originalUri };
  }

  const dir = await ensureSessionMediaDir(input.sessionId);
  if (!dir) {
    return { storedUri: input.originalUri };
  }

  const ext = guessExtension(input.filenameHint ?? input.originalUri, input.type === 'photo' ? 'jpg' : 'mp4');
  const filename = `${Date.now()}_${input.type}.${ext}`;
  const destUri = `${dir}/${filename}`;

  try {
    await FileSystem.copyAsync({ from: input.originalUri, to: destUri });
    const storedPath = destUri.startsWith('file://') ? destUri.replace('file://', '') : destUri;
    return { storedUri: destUri, storedPath };
  } catch (e) {
    console.warn('Failed to copy media into app storage', e);
    return { storedUri: input.originalUri };
  }
}

export async function deleteFromAppStorageIfOwned(storedUri: string): Promise<void> {
  if (!MEDIA_ROOT) return;
  if (!storedUri.startsWith(MEDIA_ROOT)) return;
  try {
    await FileSystem.deleteAsync(storedUri, { idempotent: true });
  } catch (e) {
    console.warn('Failed to delete media file', e);
  }
}
