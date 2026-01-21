import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStoreContext';
import { RecordStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Media, TrainingSession } from '../types';
import { effortStars, formatDateYmd, pickDefaultMainMedia } from '../utils/sessionUtils';

type Props = NativeStackScreenProps<RecordStackParamList, 'SessionCompare'>;

type SessionPanelProps = {
  label: string;
  session: TrainingSession;
  media: Media[];
  selectedMediaId?: string;
  onSelectMedia: (mediaId: string) => void;
};

export function SessionCompareScreen({ route, navigation }: Props) {
  const { activityId, beforeSessionId, afterSessionId } = route.params;
  const { activities, sessions, getMediaForSession } = useAppStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const activity = activities.find((item) => item.id === activityId);
  const before = sessions.find((item) => item.id === beforeSessionId);
  const after = sessions.find((item) => item.id === afterSessionId);

  const beforeMedia = useMemo(
    () => getMediaForSession(beforeSessionId),
    [getMediaForSession, beforeSessionId, sessions]
  );
  const afterMedia = useMemo(
    () => getMediaForSession(afterSessionId),
    [getMediaForSession, afterSessionId, sessions]
  );

  const [beforeMainId, setBeforeMainId] = useState<string | undefined>(undefined);
  const [afterMainId, setAfterMainId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (beforeMedia.length === 0) {
      setBeforeMainId(undefined);
      return;
    }
    setBeforeMainId((prev) => {
      if (prev && beforeMedia.some((item) => item.id === prev)) return prev;
      return pickDefaultMainMedia(beforeMedia)?.id;
    });
  }, [beforeMedia]);

  useEffect(() => {
    if (afterMedia.length === 0) {
      setAfterMainId(undefined);
      return;
    }
    setAfterMainId((prev) => {
      if (prev && afterMedia.some((item) => item.id === prev)) return prev;
      return pickDefaultMainMedia(afterMedia)?.id;
    });
  }, [afterMedia]);

  if (!before || !after || !activity) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.content, styles.centered]}>
          <Text style={styles.headerTitle}>くらべる記録が見つかりません</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const durationDiff = after.durationMinutes - before.durationMinutes;
  const effortDiff = after.effortLevel - before.effortLevel;
  const xpDiff = after.xpGained - before.xpGained;
  const coinsDiff = after.coinsGained - before.coinsGained;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{activity.name ?? 'くらべる'}</Text>
        </View>
        <Text style={styles.headerSubtitle}>前と今を見くらべよう</Text>

        <View style={[styles.panelRow, isWide && styles.panelRowWide]}>
          <View style={[styles.panelColumn, isWide && styles.panelColumnWide, isWide && styles.panelColumnLeft]}>
            <SessionPanel
              label="前"
              session={before}
              media={beforeMedia}
              selectedMediaId={beforeMainId}
              onSelectMedia={setBeforeMainId}
            />
          </View>
          <View style={[styles.panelColumn, isWide && styles.panelColumnWide]}>
            <SessionPanel
              label="いま"
              session={after}
              media={afterMedia}
              selectedMediaId={afterMainId}
              onSelectMedia={setAfterMainId}
            />
          </View>
        </View>

        <View style={styles.diffCard}>
          <Text style={styles.diffTitle}>差分</Text>
          <View style={styles.diffRow}>
            <Text style={styles.diffLabel}>時間</Text>
            <Text style={styles.diffValue}>{formatSigned(durationDiff, '分')}</Text>
          </View>
          <View style={styles.diffRow}>
            <Text style={styles.diffLabel}>がんばり度</Text>
            <Text style={styles.diffValue}>{formatSigned(effortDiff, '')}</Text>
          </View>
          <View style={styles.diffRow}>
            <Text style={styles.diffLabel}>XP</Text>
            <Text style={styles.diffValue}>{formatSigned(xpDiff, '')}</Text>
          </View>
          <View style={styles.diffRow}>
            <Text style={styles.diffLabel}>コイン</Text>
            <Text style={styles.diffValue}>{formatSigned(coinsDiff, '')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionPanel({ label, session, media, selectedMediaId, onSelectMedia }: SessionPanelProps) {
  const selected = media.find((item) => item.id === selectedMediaId);
  const note = session.note?.trim() ? session.note.trim() : 'メモなし';

  return (
    <View style={styles.panelCard}>
      <Text style={styles.panelTitle}>
        {label}（{formatDateYmd(session.date)}）
      </Text>
      <View style={styles.panelMetaRow}>
        <Text style={styles.panelMetaText}>時間: {session.durationMinutes}分</Text>
        <Text style={styles.panelMetaText}>がんばり度: {effortStars(session.effortLevel)}</Text>
      </View>

      {selected ? (
        selected.type === 'photo' ? (
          <Image source={{ uri: selected.localUri }} style={styles.mainImage} />
        ) : (
          <Video
            source={{ uri: selected.localUri }}
            style={styles.mainVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
          />
        )
      ) : (
        <View style={styles.mainMediaPlaceholder}>
          <Text style={styles.mainMediaPlaceholderText}>メディアなし</Text>
        </View>
      )}

      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {media.map((item) => {
            const isSelected = item.id === selectedMediaId;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectMedia(item.id)}
                style={[styles.thumbItem, isSelected && styles.thumbSelected]}
              >
                {item.type === 'photo' ? (
                  <Image source={{ uri: item.localUri }} style={styles.thumbImage} />
                ) : (
                  <View style={styles.thumbVideo}>
                    <Text style={styles.thumbVideoIcon}>▶</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>{note}</Text>
      </View>
    </View>
  );
}

function formatSigned(value: number, suffix: string) {
  const signed = value > 0 ? `+${value}` : value < 0 ? `${value}` : '0';
  return `${signed}${suffix}`;
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
    marginBottom: theme.spacing.xs,
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
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.md,
  },
  panelRow: {
    flexDirection: 'column',
  },
  panelRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panelColumn: {},
  panelColumnWide: {
    flex: 1,
  },
  panelColumnLeft: {
    marginRight: theme.spacing.md,
  },
  panelCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  panelTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  panelMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  panelMetaText: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  mainMediaPlaceholder: {
    height: 220,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
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
  thumbRow: {
    flexDirection: 'row',
  },
  thumbItem: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbVideoIcon: {
    fontSize: 18,
    color: theme.colors.textMain,
  },
  noteBox: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  noteText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  diffCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  diffTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  diffLabel: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  diffValue: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
});
