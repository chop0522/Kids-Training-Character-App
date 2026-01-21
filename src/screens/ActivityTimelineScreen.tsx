import React, { useMemo } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStoreContext';
import { RecordStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { TrainingSession, Media } from '../types';

type Props = NativeStackScreenProps<RecordStackParamList, 'ActivityTimeline'>;

export function ActivityTimelineScreen({ route, navigation }: Props) {
  const { childId, activityId } = route.params;
  const { getChildById, activities, getSessionsForChild, getMediaForSession } = useAppStore();

  const child = getChildById(childId);
  const activity = activities.find((a) => a.id === activityId);
  const sessions = useMemo(() => {
    const list = getSessionsForChild(childId).filter((s) => s.activityId === activityId);
    return list.sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [getSessionsForChild, childId, activityId]);

  const summary = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return { count: sessions.length, totalMinutes };
  }, [sessions]);

  if (!child || !activity) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.content, styles.centered]}>
          <Text style={styles.headerTitle}>データが見つかりません</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{activity.name}のきろく</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            合計 {summary.count}回 / {summary.totalMinutes}分
          </Text>
        </View>

        {sessions.map((session) => {
          const media = getMediaForSession(session.id);
          const thumb = pickThumbnail(media);
          const snippet = makeSnippet(session);
          return (
            <Pressable
              key={session.id}
              style={styles.sessionCard}
              onPress={() => navigation.navigate('SessionDetail', { childId, sessionId: session.id })}
            >
              <View style={styles.thumbBox}>
                {thumb ? (
                  thumb.type === 'photo' ? (
                    <Image source={{ uri: thumb.localUri }} style={styles.thumbImage} />
                  ) : (
                    <View style={styles.thumbVideo}>
                      <Text style={styles.thumbVideoIcon}>▶</Text>
                    </View>
                  )
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbPlaceholderText}>なし</Text>
                  </View>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                <Text style={styles.sessionMeta}>
                  {session.durationMinutes}分 / {'★'.repeat(session.effortLevel)}
                </Text>
                {snippet.length > 0 && <Text style={styles.sessionNote}>{snippet}</Text>}
              </View>
            </Pressable>
          );
        })}

        {sessions.length === 0 && <Text style={styles.emptyText}>まだ記録がありません</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function pickThumbnail(media: Media[]) {
  const video = media.find((m) => m.type === 'video');
  if (video) return video;
  return media[0];
}

function makeSnippet(session: TrainingSession) {
  if (!session.note) return '';
  const trimmed = session.note.trim();
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}…` : trimmed;
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
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  thumbBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 20,
    color: theme.colors.textMain,
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionDate: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  sessionMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  sessionNote: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
});
