import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStoreContext';
import { RecordStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { MediaAttachment } from '../types';
import { sortSessionsByDateAsc } from '../utils/sessionUtils';
import { formatTag, parseTagsFromText, uniqueTags } from '../utils/tagUtils';
import { MediaAttachmentsEditor } from '../components/MediaAttachmentsEditor';

type Props = NativeStackScreenProps<RecordStackParamList, 'SessionDetail'>;

export function SessionDetailScreen({ route, navigation }: Props) {
  const { childId, sessionId } = route.params;
  const {
    activities,
    sessions,
    streakByChildId,
    getChildById,
    getSessionsForChild,
    updateSessionNote,
    updateSessionTags,
    updateSessionAttachments,
    deleteTrainingSession,
  } = useAppStore();

  const child = getChildById(childId);
  const session = sessions.find((s) => s.id === sessionId);
  const activity = session ? activities.find((a) => a.id === session.activityId) : undefined;
  const [noteDraft, setNoteDraft] = useState(session?.note ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>(session?.tags ?? []);
  const [attachments, setAttachments] = useState<MediaAttachment[]>(session?.mediaAttachments ?? []);

  useEffect(() => {
    setNoteDraft(session?.note ?? '');
  }, [session?.note]);

  useEffect(() => {
    setTagsDraft(session?.tags ?? []);
  }, [session?.tags]);

  useEffect(() => {
    setAttachments(session?.mediaAttachments ?? []);
  }, [session?.mediaAttachments]);

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

  const sessionsForActivity = getSessionsForChild(childId).filter((s) => s.activityId === session.activityId);
  const sortedAsc = sortSessionsByDateAsc(sessionsForActivity);
  const idx = sortedAsc.findIndex((s) => s.id === session.id);
  const prevSession = idx > 0 ? sortedAsc[idx - 1] : undefined;
  const nextSession = idx >= 0 && idx < sortedAsc.length - 1 ? sortedAsc[idx + 1] : undefined;

  const streakInfo = streakByChildId[childId];
  const hasVideo = attachments.some((item) => item.type === 'video');

  const effortStars = '★'.repeat(session.effortLevel);

  const handleAddTagsFromInput = () => {
    const parsed = parseTagsFromText(tagInput);
    if (parsed.length === 0) return;
    const nextTags = uniqueTags([...tagsDraft, ...parsed]);
    setTagsDraft(nextTags);
    updateSessionTags(sessionId, nextTags);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const nextTags = tagsDraft.filter((item) => item !== tag);
    setTagsDraft(nextTags);
    updateSessionTags(sessionId, nextTags);
  };

  const handleAttachmentsChange = (next: MediaAttachment[]) => {
    setAttachments(next);
    updateSessionAttachments(sessionId, next);
  };

  const handleDeleteSession = () => {
    Alert.alert(
      '記録を削除',
      'この記録を削除します。獲得したXP/コイン/進捗も取り消されます。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            const res = deleteTrainingSession(sessionId);
            if (res.ok) {
              navigation.goBack();
            } else {
              Alert.alert('削除できませんでした');
            }
          },
        },
      ]
    );
  };

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

        <View style={styles.tagCard}>
          <Text style={styles.tagTitle}>タグ</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInput, styles.tagInputField]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="#体幹 #宿題 など"
              placeholderTextColor={theme.colors.textDisabled}
              onSubmitEditing={handleAddTagsFromInput}
              returnKeyType="done"
            />
            <Pressable style={styles.tagAddButton} onPress={handleAddTagsFromInput}>
              <Text style={styles.tagAddButtonText}>追加</Text>
            </Pressable>
          </View>
          {tagsDraft.length > 0 ? (
            <View style={styles.tagList}>
              {tagsDraft.map((tag) => (
                <Pressable key={tag} style={styles.tagChip} onPress={() => handleRemoveTag(tag)}>
                  <Text style={styles.tagChipText}>{formatTag(tag)}</Text>
                  <Text style={styles.tagRemoveText}>×</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.tagEmpty}>タグがまだありません</Text>
          )}
        </View>

        <View style={styles.mediaCard}>
          <Text style={styles.mediaTitle}>写真・動画</Text>
          <MediaAttachmentsEditor
            attachments={attachments}
            onChange={handleAttachmentsChange}
            context="detail"
            storageSessionId={sessionId}
          />
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

        <View style={styles.compareNavCard}>
          <View style={styles.compareButtonsRow}>
            <Pressable
              onPress={() =>
                prevSession && navigation.push('SessionDetail', { childId, sessionId: prevSession.id })
              }
              disabled={!prevSession}
              style={[
                styles.navButton,
                styles.navButtonLeft,
                !prevSession && styles.navButtonDisabled,
              ]}
            >
              <Text style={styles.navButtonText}>＜ 前の{activity.name}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                nextSession && navigation.push('SessionDetail', { childId, sessionId: nextSession.id })
              }
              disabled={!nextSession}
              style={[
                styles.navButton,
                styles.navButtonRight,
                !nextSession && styles.navButtonDisabled,
              ]}
            >
              <Text style={styles.navButtonText}>次の{activity.name} ＞</Text>
            </Pressable>
          </View>
          {prevSession ? (
            <Pressable
              onPress={() =>
                navigation.navigate('SessionCompare', {
                  childId,
                  activityId: session.activityId,
                  beforeSessionId: prevSession.id,
                  afterSessionId: session.id,
                })
              }
              style={styles.comparePrimaryButton}
            >
              <Text style={styles.comparePrimaryButtonText}>前回と比べる</Text>
            </Pressable>
          ) : (
            <Text style={styles.compareHintText}>前回の記録がまだありません</Text>
          )}
        </View>

        <Pressable style={styles.deleteButton} onPress={handleDeleteSession}>
          <Text style={styles.deleteButtonText}>この記録を削除</Text>
        </Pressable>

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
  tagCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  tagTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tagInput: {
    flex: 1,
  },
  tagInputField: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textMain,
  },
  tagAddButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tagAddButtonText: {
    ...theme.typography.label,
    color: '#FFFFFF',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    gap: theme.spacing.xs,
  },
  tagChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
  tagRemoveText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  tagEmpty: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.sm,
  },
  mediaCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  mediaTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
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
  compareNavCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  compareButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  navButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  navButtonLeft: {
    marginRight: theme.spacing.sm,
  },
  navButtonRight: {
    marginLeft: theme.spacing.sm,
  },
  navButtonText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  comparePrimaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparePrimaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compareHintText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  deleteButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
});
