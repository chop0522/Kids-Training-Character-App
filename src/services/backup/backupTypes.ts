import type { AppStoreState } from '../../store/AppStoreContext';

export type BackupManifest = {
  schemaVersion: number;
  backupFormatVersion: number;
  exportedAtISO: string;
  appName: string;
  appVersion: string;
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
};

export type BackupRestoreResult = {
  state: Partial<AppStoreState>;
  stats: BackupStats;
};
