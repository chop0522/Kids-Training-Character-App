import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStoreContext';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { MediaType } from '../types';
import { PrimaryButton } from '../components/PrimaryButton';
import { captureWithCamera, pickFromLibrary, requestMediaPermissions } from '../media/mediaService';
import { copyIntoAppStorage, deleteFromAppStorageIfOwned } from '../media/localMediaStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

export function SessionDetailScreen({ route, navigation }: Props) {
  const { childId, sessionId } = route.params;
  const {
    activities,
    sessions,
    streakByChildId,
    getChildById,
    getMediaForSession,
    addMediaToSession,
    removeMedia,
    updateSessionNote,
  } = useAppStore();

  const child = getChildById(childId);
  const session = sessions.find((s) => s.id === sessionId);
  const activity = session ? activities.find((a) => a.id === session.activityId) : undefined;
  const media = useMemo(() => getMediaForSession(sessionId), [getMediaForSession, sessionId, sessions]);

  const [selectedMediaId, setSelectedMediaId] = useState<string | undefined>(undefined);
  const [noteDraft, setNoteDraft] = useState(session?.note ?? '');

  useEffect(() => {
    if (media.length === 0) {
      setSelectedMediaId(undefined);
      return;
    }
    const video = media.find((m) => m.type === 'video');
    const firstMedia = video ?? media[0];
    setSelectedMediaId((prev) => prev ?? firstMedia.id);
  }, [media]);

  useEffect(() => {
    setNoteDraft(session?.note ?? '');
  }, [session?.note]);

  if (!child || !session || !activity) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.content, styles.centered]}>
          <Text style={styles.headerTitle}>セッションが見つかりませんでした</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selectedMedia = media.find((m) => m.id === selectedMediaId);
  const hasVideo = media.some((m) => m.type === 'video');

  const itemsForSession = media;
  const photoCount = itemsForSession.filter((m) => m.type === 'photo').length;
  const videoCount = itemsForSession.filter((m) => m.type === 'video').length;

  const streakInfo = streakByChildId[childId];

  const handleMediaAction = async (source: 'camera' | 'library', type: MediaType) => {
    const permission = await requestMediaPermissions(source);
    if (!permission.ok) {
      Alert.alert('権限が必要です', permission.reason ?? '権限がありません。');
      return;
    }

    const picked =
      source === 'camera' ? await captureWithCamera(type) : await pickFromLibrary(type);
    if (!picked) return;

    const stored = await copyIntoAppStorage({
      sessionId,
      type,
      originalUri: picked.originalUri,
      filenameHint: picked.filename,
    });

    const result = addMediaToSession({ sessionId, type, localUri: stored.storedUri });
    if (!result.ok) {
      const message =
        result.reason === 'photo_limit'
          ? '写真は1セッションにつき最大4枚までだよ'
          : '動画は1セッションにつき最大2本までだよ';
      Alert.alert('追加できません', message);
      if (stored.storedUri !== picked.originalUri) {
        deleteFromAppStorageIfOwned(stored.storedUri).catch(() => {});
      }
      return;
    }

    setSelectedMediaId(result.mediaId);
  };

  const handleAddMedia = () => {
    Alert.alert('写真・動画を追加', '追加方法を選んでください', [
      { text: '写真を撮る', onPress: () => handleMediaAction('camera', 'photo') },
      { text: '写真を選ぶ', onPress: () => handleMediaAction('library', 'photo') },
      { text: '動画を撮る', onPress: () => handleMediaAction('camera', 'video') },
      { text: '動画を選ぶ', onPress: () => handleMediaAction('library', 'video') },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const effortStars = '★'.repeat(session.effortLevel);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{activity.name}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>セッション概要</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>日付</Text>
            <Text style={styles.summaryValue}>{formatDate(session.date)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>時間</Text>
            <Text style={styles.summaryValue}>{session.durationMinutes}分</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>がんばり度</Text>
            <Text style={styles.summaryValue}>{effortStars}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>XP / コイン</Text>
            <Text style={styles.summaryValue}>
              XP +{session.xpGained} / コイン +{session.coinsGained}
            </Text>
          </View>
        </View>

        <View style={styles.mainMediaContainer}>
          {selectedMedia ? (
            selectedMedia.type === 'photo' ? (
              <Image source={{ uri: selectedMedia.localUri }} style={styles.mainImage} />
            ) : (
              <Video
                source={{ uri: selectedMedia.localUri }}
                style={styles.mainVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            )
          ) : (
            <View style={styles.mainMediaPlaceholder}>
              <Text style={styles.mainMediaPlaceholderText}>まだ写真・動画がありません</Text>
            </View>
          )}
          <PrimaryButton title="写真・動画を追加する" onPress={handleAddMedia} />
          <Text style={styles.mediaLimitText}>
            写真 {photoCount}/4 · 動画 {videoCount}/2
          </Text>
        </View>

        <View style={styles.thumbnailStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailScroll}>
            {media.map((item) => {
              const isSelected = item.id === selectedMediaId;
              const isVideo = item.type === 'video';
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedMediaId(item.id)}
                  onLongPress={() => removeMedia(item.id)}
                  style={[styles.thumbnailItem, isSelected && styles.thumbnailItemSelected]}
                >
                  {isVideo ? (
                    <View style={styles.videoThumb}>
                      <Text style={styles.videoIcon}>▶</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: item.localUri }} style={styles.thumbnailImage} />
                  )}
                  <Pressable style={styles.removeBadge} onPress={() => removeMedia(item.id)}>
                    <Text style={styles.removeBadgeText}>×</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>今日のメモ</Text>
          <TextInput
            style={styles.noteInput}
            multiline
            placeholder="気づきや感想をメモしよう"
            placeholderTextColor={theme.colors.textDisabled}
            value={noteDraft}
            onChangeText={setNoteDraft}
            onBlur={() => updateSessionNote(sessionId, noteDraft.trim())}
          />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>もらったXP/コイン</Text>
          <Text style={styles.statusText}>
            XP +{session.xpGained} / コイン +{session.coinsGained}
          </Text>
          {streakInfo && <Text style={styles.statusText}>ストリーク：{streakInfo.current}日</Text>}
          {hasVideo && <Text style={styles.statusText}>動画も追加されたよ！</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(dateIso: string) {
  try {
    const d = new Date(dateIso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch (e) {
    return dateIso;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  backIcon: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  backText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  summaryTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  summaryValue: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  mainMediaContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
    gap: theme.spacing.xs,
  },
  mainMediaPlaceholder: {
    height: 200,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainMediaPlaceholderText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  mainImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  mainVideo: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  videoIcon: {
    fontSize: 24,
    color: theme.colors.textMain,
  },
  mediaLimitText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  thumbnailStrip: {
    marginBottom: theme.spacing.md,
  },
  thumbnailScroll: {
    flexDirection: 'row',
  },
  thumbnailItem: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  thumbnailItemSelected: {
    borderColor: theme.colors.accent,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  noteLabel: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  noteInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    color: theme.colors.textMain,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  statusTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
});
