import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStoreContext';
import { RecordStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { MediaAttachment } from '../types';
import { sortSessionsByDateAsc } from '../utils/sessionUtils';
import { formatTag, parseTagsFromText, uniqueTags } from '../utils/tagUtils';
import { MediaAttachmentsEditor } from '../components/MediaAttachmentsEditor';
import { PrimaryButton } from '../components/PrimaryButton';
import { EffortLevel } from '../xp';

type Props = NativeStackScreenProps<RecordStackParamList, 'SessionDetail'>;

const quickDurations = [10, 20, 30, 40];

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
    completePlannedSession,
    deleteTrainingSession,
  } = useAppStore();

  const child = getChildById(childId);
  const session = sessions.find((s) => s.id === sessionId);
  const activity = session ? activities.find((a) => a.id === session.activityId) : undefined;
  const [noteDraft, setNoteDraft] = useState(session?.note ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>(session?.tags ?? []);
  const [attachments, setAttachments] = useState<MediaAttachment[]>(session?.mediaAttachments ?? []);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeDurationText, setCompleteDurationText] = useState('20');
  const [completeEffortLevel, setCompleteEffortLevel] = useState<EffortLevel>(2);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setNoteDraft(session?.note ?? '');
  }, [session?.note]);

  useEffect(() => {
    setTagsDraft(session?.tags ?? []);
  }, [session?.tags]);

  useEffect(() => {
    setAttachments(session?.mediaAttachments ?? []);
  }, [session?.mediaAttachments]);

  useEffect(() => {
    if (!session || session.status !== 'planned') return;
    setCompleteDurationText(session.durationMinutes > 0 ? String(session.durationMinutes) : '20');
    if (session.effortLevel >= 1 && session.effortLevel <= 3) {
      setCompleteEffortLevel(session.effortLevel as EffortLevel);
    }
  }, [session]);

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

  const isPlanned = session.status === 'planned';
  const sessionsForActivity = getSessionsForChild(childId).filter((s) => s.activityId === session.activityId);
  const sortedAsc = sortSessionsByDateAsc(sessionsForActivity);
  const idx = sortedAsc.findIndex((s) => s.id === session.id);
  const prevSession = idx > 0 ? sortedAsc[idx - 1] : undefined;
  const nextSession = idx >= 0 && idx < sortedAsc.length - 1 ? sortedAsc[idx + 1] : undefined;

  const streakInfo = streakByChildId[childId];
  const hasVideo = attachments.some((item) => item.type === 'video');

  const effortStars = session.effortLevel > 0 ? '★'.repeat(session.effortLevel) : '未入力';

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
    const title = isPlanned ? '予定を削除' : '記録を削除';
    const message = isPlanned
      ? 'この予定を削除します。よろしいですか？'
      : 'この記録を削除します。獲得したXP/コイン/進捗も取り消されます。よろしいですか？';

    Alert.alert(title, message, [
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
    ]);
  };

  const handleCompletePlanned = () => {
    const durationMinutes = Number(completeDurationText) || 0;
    if (durationMinutes <= 0) {
      Alert.alert('時間を入力してください', '1分以上を入力してください。');
      return;
    }
    setCompleting(true);
    const result = completePlannedSession(sessionId, {
      durationMinutes,
      effortLevel: completeEffortLevel,
      note: noteDraft.trim(),
      tags: tagsDraft,
      mediaAttachments: attachments,
    });
    setCompleting(false);
    if (!result) {
      Alert.alert('確定できませんでした', '入力内容を確認してもう一度お試しください。');
      return;
    }
    setShowCompleteModal(false);
    Alert.alert('記録として確定しました', `XP +${result.buddyXpGained} / コイン進捗 +${result.skinCoinsGained}`);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{activity.name}</Text>
          {isPlanned && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>予定</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>セッション概要</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>日付</Text>
            <Text style={styles.summaryValue}>{formatDate(session.date)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>時間</Text>
            <Text style={styles.summaryValue}>{isPlanned ? '未確定' : `${session.durationMinutes}分`}</Text>
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

        {isPlanned && (
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>予定</Text>
            <Text style={styles.planText}>あとで写真・コメントを追加し、「記録として確定」ができます。</Text>
            <PrimaryButton title="記録として確定" onPress={() => setShowCompleteModal(true)} />
          </View>
        )}

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
          <Text style={styles.noteLabel}>メモ</Text>
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

        {!isPlanned && (
          <View style={styles.compareNavCard}>
            <View style={styles.compareButtonsRow}>
              <Pressable
                onPress={() =>
                  prevSession && navigation.push('SessionDetail', { childId, sessionId: prevSession.id })
                }
                disabled={!prevSession}
                style={[styles.navButton, styles.navButtonLeft, !prevSession && styles.navButtonDisabled]}
              >
                <Text style={styles.navButtonText}>＜ 前の{activity.name}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  nextSession && navigation.push('SessionDetail', { childId, sessionId: nextSession.id })
                }
                disabled={!nextSession}
                style={[styles.navButton, styles.navButtonRight, !nextSession && styles.navButtonDisabled]}
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
        )}

        <Pressable style={styles.deleteButton} onPress={handleDeleteSession}>
          <Text style={styles.deleteButtonText}>{isPlanned ? '予定を削除' : 'この記録を削除'}</Text>
        </Pressable>

        {!isPlanned && (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>もらったXP/コイン</Text>
            <Text style={styles.statusText}>
              XP +{session.xpGained} / コイン +{session.coinsGained}
            </Text>
            {streakInfo && <Text style={styles.statusText}>ストリーク：{streakInfo.current}日</Text>}
            {hasVideo && <Text style={styles.statusText}>動画も追加されたよ！</Text>}
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={showCompleteModal} animationType="fade" onRequestClose={() => setShowCompleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>記録として確定</Text>
            <Text style={styles.modalText}>時間・がんばり度を入力して確定します。</Text>

            <Text style={styles.modalLabel}>時間（分）</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={completeDurationText}
              onChangeText={setCompleteDurationText}
              placeholder="20"
              placeholderTextColor={theme.colors.textDisabled}
            />

            <View style={styles.quickButtonsRow}>
              {quickDurations.map((duration) => {
                const selected = Number(completeDurationText) === duration;
                return (
                  <Pressable
                    key={duration}
                    style={[styles.quickButton, selected && styles.quickButtonSelected]}
                    onPress={() => setCompleteDurationText(String(duration))}
                  >
                    <Text style={[styles.quickButtonText, selected && styles.quickButtonTextSelected]}>{duration}分</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, styles.modalLabelSpacing]}>がんばり度</Text>
            <View style={styles.optionRow}>
              {[1, 2, 3].map((level) => {
                const selected = completeEffortLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setCompleteEffortLevel(level as EffortLevel)}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{level}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryButton} onPress={() => setShowCompleteModal(false)}>
                <Text style={styles.modalSecondaryText}>キャンセル</Text>
              </Pressable>
              <PrimaryButton
                title={completing ? '確定中...' : '確定する'}
                onPress={handleCompletePlanned}
                disabled={completing}
                style={styles.modalPrimaryButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  headerBadge: {
    marginLeft: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  headerBadgeText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textSub,
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
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  planTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  planText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  modalText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
  },
  modalLabel: {
    ...theme.typography.label,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  modalLabelSpacing: {
    marginTop: theme.spacing.sm,
  },
  modalInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textMain,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  quickButton: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  quickButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickButtonText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  quickButtonTextSelected: {
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipUnselected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderSoft,
  },
  chipText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  modalActions: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  modalSecondaryText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  modalPrimaryButton: {
    minWidth: 120,
  },
});
