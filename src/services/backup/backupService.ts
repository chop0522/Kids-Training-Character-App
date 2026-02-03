import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { nanoid } from 'nanoid';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { buildSharePackage } from '../../sharing/sharePackage';
import type { AppStoreState } from '../../store/AppStoreContext';
import type { MediaAttachment } from '../../types';
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SCHEMA_VERSION,
  buildBackupFileName,
  buildStatsSummary,
  ensureDir,
  getFileSizeBytes,
  getMediaFileExtension,
  makeMediaZipPath,
  readUriAsUint8Array,
  sanitizeState,
  writeBytesToFile,
} from './backupUtils';
import type { BackupCreateResult, BackupInspectResult, BackupManifest, BackupRestoreResult } from './backupTypes';

const ZIP_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}backup/`;
const MEDIA_RESTORE_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}media/` : null;

function getAppName(): string {
  return Constants.expoConfig?.name ?? 'gambari-album';
}

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function getSanitizedState(state: AppStoreState): Partial<AppStoreState> {
  return sanitizeState(buildSharePackage({ state }).state);
}

function normalizeAttachments(attachments: MediaAttachment[] | undefined): MediaAttachment[] {
  if (!attachments || attachments.length === 0) return [];
  return attachments.map((attachment) => ({
    ...attachment,
    id: attachment.id || nanoid(),
    createdAtISO: attachment.createdAtISO || new Date().toISOString(),
  }));
}

export async function estimateBackupMediaBytes(state: AppStoreState): Promise<number> {
  const sanitized = getSanitizedState(state);
  const sessions = sanitized.sessions ?? [];
  let total = 0;
  for (const session of sessions) {
    const attachments = normalizeAttachments(session.mediaAttachments);
    for (const attachment of attachments) {
      total += await getFileSizeBytes(attachment.uri);
    }
  }
  return total;
}

export async function createBackupZip(input: {
  state: AppStoreState;
  includeMedia: boolean;
}): Promise<BackupCreateResult> {
  const exportedAtISO = new Date().toISOString();
  const fileName = buildBackupFileName(new Date(exportedAtISO));
  const sanitized = getSanitizedState(input.state);
  const stateCopy = JSON.parse(JSON.stringify(sanitized)) as Partial<AppStoreState>;
  const sessions = stateCopy.sessions ?? [];

  const filesMap: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify({})),
  };

  let attachmentsCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  let totalMediaBytes = 0;
  let missingMediaCount = 0;
  const missingMediaUris: string[] = [];
  const missingMediaPaths: string[] = [];
  const mediaFiles: BackupManifest['mediaFiles'] = [];

  if (input.includeMedia) {
    for (const session of sessions) {
      const normalized = normalizeAttachments(session.mediaAttachments);
      const nextAttachments: MediaAttachment[] = [];
      for (const attachment of normalized) {
        try {
          const extension = getMediaFileExtension(attachment);
          const zipPath = makeMediaZipPath(attachment.id, extension);
          let originalBytes = 0;
          if (attachment.uri?.startsWith('file://')) {
            const info = await FileSystem.getInfoAsync(attachment.uri, { size: true });
            if (!info.exists) {
              missingMediaCount += 1;
              missingMediaUris.push(attachment.uri);
              missingMediaPaths.push(zipPath);
              continue;
            }
            if (typeof info.size === 'number') {
              originalBytes = info.size;
              if (info.size >= 50 * 1024 * 1024) {
                missingMediaCount += 1;
                missingMediaUris.push(attachment.uri);
                missingMediaPaths.push(zipPath);
                continue;
              }
            }
          }
          const bytes = await readUriAsUint8Array(attachment.uri);
          const fileBytes = originalBytes > 0 ? originalBytes : bytes.byteLength;
          if (fileBytes >= 50 * 1024 * 1024) {
            missingMediaCount += 1;
            missingMediaUris.push(attachment.uri);
            missingMediaPaths.push(zipPath);
            continue;
          }
          filesMap[zipPath] = bytes;
          attachmentsCount += 1;
          if (attachment.type === 'video') {
            videoCount += 1;
          } else {
            imageCount += 1;
          }
          totalMediaBytes += fileBytes;
          mediaFiles?.push({
            path: zipPath,
            bytes: fileBytes,
            type: attachment.type,
          });
          nextAttachments.push({
            ...attachment,
            uri: zipPath,
          });
        } catch (e) {
          // Skip attachment if reading fails
          missingMediaCount += 1;
          if (attachment.uri) missingMediaUris.push(attachment.uri);
          if (attachment.id) {
            const extension = getMediaFileExtension(attachment);
            missingMediaPaths.push(makeMediaZipPath(attachment.id, extension));
          }
        }
      }
      session.mediaAttachments = nextAttachments;
    }
  } else {
    for (const session of sessions) {
      session.mediaAttachments = [];
    }
  }

  const dataPayload = { state: stateCopy };
  filesMap['data.json'] = strToU8(JSON.stringify(dataPayload));
  const manifest: BackupManifest = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    exportedAtISO,
    appName: getAppName(),
    appVersion: getAppVersion(),
    childrenCount: stateCopy.children?.length ?? 0,
    sessionsCount: stateCopy.sessions?.length ?? 0,
    mediaCount: { image: imageCount, video: videoCount },
    mediaFiles: mediaFiles?.length ? mediaFiles : undefined,
    missingMediaCount,
    missingMediaPaths: missingMediaPaths.length ? missingMediaPaths : undefined,
    totalMediaBytes,
  };
  filesMap['manifest.json'] = strToU8(JSON.stringify(manifest));

  const zipped = zipSync(filesMap, { level: 6 });
  let uri: string | undefined;
  if (Platform.OS !== 'web') {
    if (!ZIP_DIR) {
      throw new Error('backup_directory_unavailable');
    }
    await ensureDir(ZIP_DIR);
    const outPath = `${ZIP_DIR}${fileName}`;
    await writeBytesToFile(outPath, zipped);
    uri = outPath;
  }

  const stats = buildStatsSummary(stateCopy, {
    attachmentsCount,
    imageCount,
    videoCount,
    totalMediaBytes,
  });
  if (__DEV__ && missingMediaCount > 0) {
    console.warn('Missing media excluded from backup', missingMediaCount, missingMediaUris);
  }

  return {
    uri,
    data: Platform.OS === 'web' ? zipped : undefined,
    fileName,
    sizeBytes: zipped.byteLength,
    exportedAtISO,
    stats: {
      ...stats,
      missingMediaCount,
      missingMediaUris,
    },
  };
}

export async function inspectBackupZip(input: { uri?: string; data?: Uint8Array }): Promise<BackupInspectResult> {
  const bytes = input.data ?? (input.uri ? await readUriAsUint8Array(input.uri) : null);
  if (!bytes) {
    throw new Error('backup_bytes_missing');
  }
  const entries = unzipSync(bytes);
  const manifestRaw = entries['manifest.json'];
  const dataRaw = entries['data.json'];
  if (!manifestRaw || !dataRaw) {
    throw new Error('backup_missing_files');
  }
  const manifest = JSON.parse(strFromU8(manifestRaw)) as BackupManifest;
  if (manifest.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error('backup_version_mismatch');
  }
  const parsed = JSON.parse(strFromU8(dataRaw));
  const state = sanitizeState((parsed?.state ?? parsed) as Partial<AppStoreState>);

  let attachmentsCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  const sessions = state.sessions ?? [];
  const expectedMediaPaths = new Set<string>();
  for (const session of sessions) {
    const normalized = normalizeAttachments(session.mediaAttachments);
    for (const attachment of normalized) {
      attachmentsCount += 1;
      if (attachment.type === 'video') {
        videoCount += 1;
      } else {
        imageCount += 1;
      }
      if (attachment.uri?.startsWith('media/')) {
        expectedMediaPaths.add(attachment.uri);
      }
    }
  }

  const actualMediaPaths = Object.keys(entries).filter((path) => path.startsWith('media/'));
  const missingMediaPaths = Array.from(expectedMediaPaths).filter((path) => !actualMediaPaths.includes(path));

  const stats = buildStatsSummary(state, {
    attachmentsCount,
    imageCount,
    videoCount,
    totalMediaBytes: manifest.totalMediaBytes ?? 0,
  });

  return {
    manifest,
    dataState: state,
    stats: { ...stats, missingMediaCount: missingMediaPaths.length },
    missingMediaPaths,
    expectedMediaPaths: Array.from(expectedMediaPaths),
  };
}

export async function restoreBackupZip(input: {
  uri?: string;
  data?: Uint8Array;
  mode?: 'replace' | 'merge';
}): Promise<BackupRestoreResult> {
  const bytes = input.data ?? (input.uri ? await readUriAsUint8Array(input.uri) : null);
  if (!bytes) {
    throw new Error('backup_bytes_missing');
  }
  const entries = unzipSync(bytes);
  const manifestRaw = entries['manifest.json'];
  const dataRaw = entries['data.json'];
  if (!manifestRaw || !dataRaw) {
    throw new Error('backup_missing_files');
  }
  const manifest = JSON.parse(strFromU8(manifestRaw)) as BackupManifest;
  if (manifest.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error('backup_version_mismatch');
  }
  const parsed = JSON.parse(strFromU8(dataRaw));
  const state = sanitizeState((parsed?.state ?? parsed) as Partial<AppStoreState>);

  let attachmentsCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  const sessions = state.sessions ?? [];

  if (MEDIA_RESTORE_DIR) {
    await ensureDir(MEDIA_RESTORE_DIR);
  }

  for (const session of sessions) {
    const normalized = normalizeAttachments(session.mediaAttachments);
    const nextAttachments: MediaAttachment[] = [];
    for (const attachment of normalized) {
      const uri = attachment.uri;
      if (uri && uri.startsWith('media/')) {
        const entry = entries[uri];
        if (!entry) continue;
        let nextUri = uri;
        if (MEDIA_RESTORE_DIR) {
          const filename = uri.replace('media/', '');
          nextUri = `${MEDIA_RESTORE_DIR}${filename}`;
          await writeBytesToFile(nextUri, entry);
        } else if (Platform.OS === 'web') {
          const blob = new Blob([entry], { type: attachment.mimeType ?? 'application/octet-stream' });
          nextUri = URL.createObjectURL(blob);
        }
        nextAttachments.push({
          ...attachment,
          uri: nextUri,
        });
        attachmentsCount += 1;
        if (attachment.type === 'video') {
          videoCount += 1;
        } else {
          imageCount += 1;
        }
      } else {
        nextAttachments.push(attachment);
        attachmentsCount += 1;
        if (attachment.type === 'video') {
          videoCount += 1;
        } else {
          imageCount += 1;
        }
      }
    }
    session.mediaAttachments = nextAttachments;
  }

  const stats = buildStatsSummary(state, {
    attachmentsCount,
    imageCount,
    videoCount,
    totalMediaBytes: 0,
  });

  return { state: sanitizeState(state), stats: { ...stats, missingMediaCount: manifest.missingMediaCount ?? 0 } };
}
