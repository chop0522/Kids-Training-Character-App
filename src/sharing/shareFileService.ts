import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { SharePackage, isValidSharePackage } from './sharePackage';

const BASE_DIR = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
const DIR = `${BASE_DIR}family_share/`;

const makeDir = async () => {
  if (!BASE_DIR) return;
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
};

function safeFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `family_share_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
}

export async function writeShareFile(pkg: SharePackage): Promise<string> {
  if (!BASE_DIR) {
    throw new Error('cache_directory_unavailable');
  }
  await makeDir();
  const path = `${DIR}${safeFileName()}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(pkg, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return path;
}

export async function shareFile(path: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;
  await Sharing.shareAsync(path, { mimeType: 'application/json' });
}

export async function pickShareFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return null;
  const uri = res.assets?.[0]?.uri;
  return uri ?? null;
}

export async function readSharePackageFromUri(uri: string): Promise<SharePackage | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(raw);
    if (!isValidSharePackage(parsed)) return null;
    return parsed;
  } catch (e) {
    console.warn('Failed to read share package', e);
    return null;
  }
}
