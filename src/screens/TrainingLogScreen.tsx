import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { calculateCoins, calculateXp, EffortLevel } from '../xp';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingLog'>;

const quickDurations = [5, 10, 20, 30];

export function TrainingLogScreen({ navigation, route }: Props) {
  const { getChildById, getActivitiesForFamily, logTrainingSession } = useAppStore();
  const childId = route.params.childId;
  const child = getChildById(childId);
  const activities = child ? getActivitiesForFamily(child.familyId) : [];

  const [activityId, setActivityId] = useState<string | undefined>(activities[0]?.id);
  const [durationText, setDurationText] = useState('20');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>(2);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activities.length > 0 && !activityId) {
      setActivityId(activities[0].id);
    }
  }, [activities, activityId]);

  const durationMinutes = useMemo(() => Number(durationText) || 0, [durationText]);
  const xpPreview = useMemo(() => calculateXp(durationMinutes, effortLevel), [durationMinutes, effortLevel]);
  const coinPreview = useMemo(() => calculateCoins(durationMinutes, effortLevel), [durationMinutes, effortLevel]);
  const canSave = Boolean(activityId) && durationMinutes > 0 && !saving;

  const handleSave = () => {
    if (!child || !activityId || !canSave) return;
    setSaving(true);
    const result = logTrainingSession({
      childId: child.id,
      activityId,
      durationMinutes,
      effortLevel,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (!result) {
      showAlert('エラー', '保存に失敗しました');
      return;
    }
    if (result.levelUps > 0) {
      showAlert('レベルアップ！', 'レベルが上がったよ！');
    }
    if (result.completedNodes.some((n) => n.type === 'treasure')) {
      showAlert('宝箱マスクリア！', 'ごほうびコインをゲット！');
    }
    if (result.unlockedAchievements.length > 0) {
      const a = result.unlockedAchievements[0];
      showAlert('バッジをてにいれた！', a.title);
    }
    navigation.navigate('ChildDashboard', { childId: child.id });
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
});
