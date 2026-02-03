import type { AppStoreState } from '../../store/AppStoreContext';

export type BackupManifest = {
  schemaVersion: number;
  backupFormatVersion: number;
  exportedAtISO: string;
  appName: string;
  appVersion: string;
  childrenCount: number;
  sessionsCount: number;
  mediaCount: {
    image: number;
    video: number;
  };
  mediaFiles?: Array<{
    path: string;
    bytes: number;
    type: 'image' | 'video';
  }>;
  missingMediaCount: number;
  missingMediaPaths?: string[];
  totalMediaBytes: number;
};

export type BackupData = {
  state: Partial<AppStoreState>;
};

export type BackupStats = {
  childrenCount: number;
  sessionsCount: number;
  attachmentsCount: number;
  imageCount: number;
  videoCount: number;
  totalMediaBytes: number;
  missingMediaCount?: number;
  missingMediaUris?: string[];
};

export type BackupCreateResult = {
  uri?: string;
  data?: Uint8Array;
  fileName: string;
  sizeBytes: number;
  exportedAtISO: string;
  stats: BackupStats;
};

export type BackupInspectResult = {
  manifest: BackupManifest;
  dataState: Partial<AppStoreState>;
  stats: BackupStats;
  missingMediaPaths?: string[];
  expectedMediaPaths?: string[];
};

export type BackupRestoreResult = {
  state: Partial<AppStoreState>;
  stats: BackupStats;
};
