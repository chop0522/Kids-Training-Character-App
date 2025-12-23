import * as ImagePicker from 'expo-image-picker';

export type MediaPickType = 'photo' | 'video';

export type PickedMedia = {
  type: MediaPickType;
  originalUri: string;
  filename?: string;
};

export async function requestMediaPermissions(
  source: 'camera' | 'library' = 'library'
): Promise<{ ok: boolean; reason?: string }> {
  try {
    if (source === 'camera') {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      if (!result.granted) {
        return { ok: false, reason: 'カメラへのアクセス許可が必要です。' };
      }
      return { ok: true };
    }

    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      return { ok: false, reason: 'フォトライブラリへのアクセス許可が必要です。' };
    }
    return { ok: true };
  } catch (e) {
    console.warn('Failed to request media permissions', e);
    return { ok: false, reason: '権限の確認に失敗しました。' };
  }
}

export async function pickFromLibrary(type: MediaPickType): Promise<PickedMedia | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset?.uri) return null;
    return { type, originalUri: asset.uri, filename: asset.fileName };
  } catch (e) {
    console.warn('Failed to pick media from library', e);
    return null;
  }
}

export async function captureWithCamera(type: MediaPickType): Promise<PickedMedia | null> {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset?.uri) return null;
    return { type, originalUri: asset.uri, filename: asset.fileName };
  } catch (e) {
    console.warn('Failed to capture media with camera', e);
    return null;
  }
}
