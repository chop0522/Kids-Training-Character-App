import React from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { nanoid } from 'nanoid/non-secure';
import { MediaAttachment } from '../types';
import { theme } from '../theme';
import { pickMediaFilesWeb } from '../utils/webFilePicker';
import { captureWithCamera, pickFromLibrary, requestMediaPermissions } from '../media/mediaService';
import { copyIntoAppStorage, deleteFromAppStorageIfOwned } from '../media/localMediaStorage';

type Props = {
  attachments: MediaAttachment[];
  onChange: (next: MediaAttachment[]) => void;
  maxImages?: number;
  maxVideos?: number;
  allowCamera?: boolean;
  context?: 'create' | 'detail';
  storageSessionId?: string;
};

export function MediaAttachmentsEditor({
  attachments,
  onChange,
  maxImages = 4,
  maxVideos = 2,
  allowCamera = true,
  context = 'detail',
  storageSessionId = '',
}: Props) {
  const imageCount = attachments.filter((item) => item.type === 'image').length;
  const videoCount = attachments.filter((item) => item.type === 'video').length;

  const canAddImage = imageCount < maxImages;
  const canAddVideo = videoCount < maxVideos;

  const handleRemove = async (target: MediaAttachment) => {
    if (Platform.OS === 'web' && target.uri.startsWith('blob:')) {
      URL.revokeObjectURL(target.uri);
    } else {
      await deleteFromAppStorageIfOwned(target.uri);
    }
    onChange(attachments.filter((item) => item.id !== target.id));
  };

  const appendAttachment = (item: MediaAttachment) => {
    onChange([...attachments, item]);
  };

  const appendAttachments = (items: MediaAttachment[]) => {
    if (items.length === 0) return;
    onChange([...attachments, ...items]);
  };

  const showLimitAlert = (type: 'image' | 'video') => {
    Alert.alert('上限に達しました', type === 'image' ? `写真は最大${maxImages}枚までです` : `動画は最大${maxVideos}本までです`);
  };

  const handleAddFromWeb = async () => {
    if (!canAddImage && !canAddVideo) {
      showLimitAlert('image');
      return;
    }
    const files = await pickMediaFilesWeb({ accept: 'image/*,video/*', multiple: true });
    if (files.length === 0) return;
    const nextItems: MediaAttachment[] = [];
    let nextImageCount = imageCount;
    let nextVideoCount = videoCount;
    files.forEach((file) => {
      const isVideo = file.type.startsWith('video');
      if (isVideo && nextVideoCount >= maxVideos) return;
      if (!isVideo && nextImageCount >= maxImages) return;
      const uri = URL.createObjectURL(file);
      const item: MediaAttachment = {
        id: nanoid(12),
        type: isVideo ? 'video' : 'image',
        uri,
        mimeType: file.type,
        createdAtISO: new Date().toISOString(),
        source: 'file',
        fileName: file.name,
      };
      nextItems.push(item);
      if (isVideo) nextVideoCount += 1;
      else nextImageCount += 1;
    });
    if (nextItems.length === 0) {
      showLimitAlert(canAddImage ? 'video' : 'image');
      return;
    }
    appendAttachments(nextItems);
  };

  const persistNativeAsset = async (input: { type: 'photo' | 'video'; originalUri: string; filename?: string }) => {
    if (!storageSessionId) {
      return { storedUri: input.originalUri };
    }
    return copyIntoAppStorage({
      sessionId: storageSessionId,
      type: input.type,
      originalUri: input.originalUri,
      filenameHint: input.filename,
    });
  };

  const handleAddNative = async (type: 'photo' | 'video', source: 'camera' | 'library') => {
    if (type === 'photo' && !canAddImage) {
      showLimitAlert('image');
      return;
    }
    if (type === 'video' && !canAddVideo) {
      showLimitAlert('video');
      return;
    }
    const permission = await requestMediaPermissions(source);
    if (!permission.ok) {
      Alert.alert('権限が必要です', permission.reason ?? '権限がありません。');
      return;
    }
    const picked =
      source === 'camera' ? await captureWithCamera(type) : await pickFromLibrary(type);
    if (!picked) return;
    const stored = await persistNativeAsset({
      type,
      originalUri: picked.originalUri,
      filename: picked.filename,
    });
    appendAttachment({
      id: nanoid(12),
      type: type === 'photo' ? 'image' : 'video',
      uri: stored.storedUri,
      createdAtISO: new Date().toISOString(),
      source: source === 'camera' ? 'camera' : 'library',
      fileName: picked.filename,
    });
  };

  const openAddMenu = () => {
    if (Platform.OS === 'web') {
      void handleAddFromWeb();
      return;
    }
    Alert.alert('写真・動画を追加', '追加方法を選んでください', [
      allowCamera ? { text: '写真を撮る', onPress: () => void handleAddNative('photo', 'camera') } : undefined,
      { text: '写真を選ぶ', onPress: () => void handleAddNative('photo', 'library') },
      allowCamera ? { text: '動画を撮る', onPress: () => void handleAddNative('video', 'camera') } : undefined,
      { text: '動画を選ぶ', onPress: () => void handleAddNative('video', 'library') },
      { text: 'キャンセル', style: 'cancel' },
    ].filter(Boolean) as { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[]);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.list}>
        {attachments.map((item) => (
          <View key={item.id} style={styles.thumbCard}>
            {item.type === 'image' ? (
              <Image source={{ uri: item.uri }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <Video
                source={{ uri: item.uri }}
                style={styles.thumbImage}
                resizeMode={ResizeMode.COVER}
                isMuted
                shouldPlay={false}
              />
            )}
            <Pressable style={styles.removeButton} onPress={() => void handleRemove(item)}>
              <Text style={styles.removeButtonText}>×</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.addButton} onPress={openAddMenu}>
        <Text style={styles.addButtonText}>写真・動画を追加する</Text>
      </Pressable>
      <Text style={styles.countText}>
        写真 {imageCount}/{maxImages} ・ 動画 {videoCount}/{maxVideos}
      </Text>
      {Platform.OS === 'web' && context === 'create' && (
        <Text style={styles.webNote}>※ Webでは再起動で表示が消える場合があります</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  list: {
    marginBottom: theme.spacing.sm,
  },
  thumbCard: {
    width: 90,
    height: 90,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  addButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  countText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  webNote: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
});
