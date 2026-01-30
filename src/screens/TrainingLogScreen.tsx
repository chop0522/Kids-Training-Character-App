import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { MediaAttachmentsEditor } from '../components/MediaAttachmentsEditor';
import { calculateCoins, calculateXp, EffortLevel } from '../xp';
import type { MediaAttachment, TrainingResult } from '../types';
import { buildTagFrequency, formatTag, normalizeTag, normalizeTags, parseTagsFromText, uniqueTags } from '../utils/tagUtils';
import { nanoid } from 'nanoid/non-secure';

type TrainingLogParamList = {
  TrainingLog: { childId: string };
};

type Props = NativeStackScreenProps<TrainingLogParamList, 'TrainingLog'>;

const quickDurations = [5, 10, 20, 30];

export function TrainingLogScreen({ navigation, route }: Props) {
  const { getChildById, getActivitiesForFamily, getSessionsForChild, logTrainingSession } = useAppStore();
  const childId = route.params.childId;
  const child = getChildById(childId);
  const activities = child ? getActivitiesForFamily(child.familyId) : [];

  const [activityId, setActivityId] = useState<string | undefined>(activities[0]?.id);
  const [durationText, setDurationText] = useState('20');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>(2);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [rewardResult, setRewardResult] = useState<TrainingResult | null>(null);
  const draftSessionIdRef = useRef<string>(nanoid(10));

  useEffect(() => {
    if (activities.length > 0 && !activityId) {
      setActivityId(activities[0].id);
    }
  }, [activities, activityId]);

  const durationMinutes = useMemo(() => Number(durationText) || 0, [durationText]);
  const xpPreview = useMemo(() => calculateXp(durationMinutes, effortLevel), [durationMinutes, effortLevel]);
  const coinPreview = useMemo(() => calculateCoins(durationMinutes, effortLevel), [durationMinutes, effortLevel]);
  const canSave = Boolean(activityId) && durationMinutes > 0 && !saving;
  const childSessions = useMemo(() => (child ? getSessionsForChild(child.id) : []), [child, getSessionsForChild]);
  const recentSessions = useMemo(
    () => [...childSessions].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 30),
    [childSessions]
  );
  const fixedTagSuggestions = useMemo(
    () => normalizeTags(['リフティング', '体幹', '宿題', '子供チャレンジ']),
    []
  );
  const frequentTags = useMemo(() => buildTagFrequency(recentSessions, 10), [recentSessions]);
  const suggestionTags = useMemo(() => {
    const merged = uniqueTags([...fixedTagSuggestions, ...frequentTags]);
    const current = new Set(tags.map((tag) => tag.toLowerCase()));
    return merged.filter((tag) => !current.has(tag.toLowerCase()));
  }, [fixedTagSuggestions, frequentTags, tags]);

  const handleAddTagsFromInput = () => {
    const parsed = parseTagsFromText(tagInput);
    if (parsed.length === 0) return;
    setTags((prev) => uniqueTags([...prev, ...parsed]));
    setTagInput('');
  };

  const handleAddTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    setTags((prev) => uniqueTags([...prev, normalized]));
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleSave = () => {
    if (!child || !activityId || !canSave) return;
    setSaving(true);
    const finalTags = uniqueTags([...tags, ...parseTagsFromText(tagInput)]);
    const result = logTrainingSession({
      childId: child.id,
      activityId,
      durationMinutes,
      effortLevel,
      note: note.trim() || undefined,
      tags: finalTags,
      mediaAttachments: attachments,
      sessionId: draftSessionIdRef.current,
    });
    setSaving(false);
    if (!result) {
      showAlert('エラー', '保存に失敗しました');
      return;
    }
    setRewardResult(result);
    setAttachments([]);
    draftSessionIdRef.current = nanoid(10);
  };

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.label}>子どもの情報が見つかりませんでした。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{child.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childSub}>トレーニングを記録</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>種目</Text>
            <View style={styles.optionRow}>
              {activities.map((activity) => {
                const selected = activity.id === activityId;
                return (
                  <Pressable
                    key={activity.id}
                    onPress={() => setActivityId(activity.id)}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {activity.iconKey} {activity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>時間（分）</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={durationText}
              onChangeText={setDurationText}
              placeholder="数字を入力"
              placeholderTextColor={theme.colors.textDisabled}
            />
            <View style={styles.quickButtonsRow}>
              {quickDurations.map((d) => {
                const selected = durationMinutes === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDurationText(String(d))}
                    style={[styles.quickButton, selected && styles.quickButtonSelected]}
                  >
                    <Text style={[styles.quickButtonText, selected && styles.quickButtonTextSelected]}>{d} 分</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>がんばり度</Text>
            <View style={styles.optionRow}>
              {[1, 2, 3].map((level) => {
                const selected = effortLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setEffortLevel(level as EffortLevel)}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{level}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helperText}>1 = ふつう / 2 = がんばった / 3 = すごくがんばった</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>タグ</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.textInput, styles.tagInput]}
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
            {tags.length > 0 && (
              <View style={styles.tagList}>
                {tags.map((tag) => (
                  <Pressable key={tag} style={styles.tagChip} onPress={() => handleRemoveTag(tag)}>
                    <Text style={styles.tagChipText}>{formatTag(tag)}</Text>
                    <Text style={styles.tagRemoveText}>×</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {suggestionTags.length > 0 && (
              <View style={styles.tagSuggestions}>
                {suggestionTags.map((tag) => (
                  <Pressable key={tag} style={styles.tagSuggestion} onPress={() => handleAddTag(tag)}>
                    <Text style={styles.tagSuggestionText}>{formatTag(tag)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.helperText}>スペース区切りでまとめて入力できます</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>メモ（任意）</Text>
            <TextInput
              style={[styles.textInput, styles.noteInput]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="感じたこと、できたことなど"
              placeholderTextColor={theme.colors.textDisabled}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>写真・動画</Text>
            <MediaAttachmentsEditor
              attachments={attachments}
              onChange={setAttachments}
              context="create"
              storageSessionId={draftSessionIdRef.current}
            />
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>今回の報酬</Text>
            <Text style={styles.previewValue}>XP +{xpPreview} / コイン +{coinPreview}</Text>
          </View>

          <PrimaryButton title={saving ? '保存中...' : '保存する'} onPress={handleSave} disabled={!canSave} />
          <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={Boolean(rewardResult)}
        animationType="fade"
        onRequestClose={() => setRewardResult(null)}
      >
        {rewardResult && (
          <View style={styles.rewardOverlay}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardTitle}>おつかれさま！</Text>
              <Text style={styles.rewardSubtitle}>がんばりが たまったよ</Text>
              <View style={styles.rewardLines}>
                <Text style={styles.rewardLine}>相棒XP +{rewardResult.buddyXpGained}</Text>
                <Text style={styles.rewardLine}>
                  {rewardResult.skinCategory === 'study' ? '勉強' : '運動'}コイン +{rewardResult.skinCoinsGained}
                </Text>
                <Text style={styles.rewardLine}>
                  チケット進捗 +1（あと{Math.max(0, rewardResult.ticketProgressMax - rewardResult.ticketProgress)}で+1）
                </Text>
                {rewardResult.ticketsGained > 0 && (
                  <Text style={styles.rewardBonus}>チケット +{rewardResult.ticketsGained}</Text>
                )}
              </View>
              <PrimaryButton
                title="OK"
                onPress={() => {
                  setRewardResult(null);
                  navigation.goBack();
                }}
                style={styles.rewardButton}
              />
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}${message ? `\n${message}` : ''}`);
    } else {
      console.log(title, message);
    }
  } else {
    Alert.alert(title, message);
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
    paddingBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  avatarText: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  headerText: {
    flex: 1,
  },
  childName: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  childSub: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textMain,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tagInput: {
    flex: 1,
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
  tagSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagSuggestion: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  tagSuggestionText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
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
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
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
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  previewLabel: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  previewValue: {
    ...theme.typography.heading2,
    color: theme.colors.primary,
  },
  cancelButton: {
    marginTop: theme.spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  rewardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  rewardCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  rewardTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  rewardSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  rewardLines: {
    width: '100%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  rewardLine: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  rewardBonus: {
    ...theme.typography.label,
    color: theme.colors.accent,
  },
  rewardButton: {
    alignSelf: 'stretch',
  },
});
