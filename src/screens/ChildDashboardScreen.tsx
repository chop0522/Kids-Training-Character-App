import React from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { BuddyAvatar } from '../components/BuddyAvatar';
import { getBuddyForm } from '../characterEvolutionConfig';
import { getSkinById } from '../characterSkinsConfig';
import { createInitialTreasureState, getTreasureKind, TREASURE_KIND_LABELS } from '../treasureConfig';
import { useParentalGate } from '../hooks/useParentalGate';

// Home screen (Duolingo-style entry point)
type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

type LevelInfo = ReturnType<typeof getLevelProgress>;

export function ChildDashboardScreen({ navigation, route }: Props) {
  const {
    selectedChildId,
    getChildById,
    getActiveBuddyKeyForChild,
    getBuddyProgressForChild,
    settings,
    appState,
  } = useAppStore();

  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;

  const treasure = appState?.treasure ?? createInitialTreasureState();
  const treasureKind = getTreasureKind(treasure.chestIndex);
  const treasureRemaining = Math.max(0, treasure.target - treasure.progress);
  const treasureCompleted = Math.min(treasure.progress, treasure.target);
  const treasurePercent =
    treasure.target === 0 ? 0 : Math.min(100, Math.round((treasureCompleted / treasure.target) * 100));
  const { requestParentalGate, ParentalGate } = useParentalGate();

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>子どもが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeBuddyKey = getActiveBuddyKeyForChild(child.id);
  const defaultBuddyKey = 'boneca_sd_pixel_v2';
  const activeSkin = getSkinById(activeBuddyKey);
  const displayBuddyKey =
    !settings.enableMemeSkins && activeSkin && activeSkin.category !== 'default' ? defaultBuddyKey : activeBuddyKey;
  const buddyProgress = getBuddyProgressForChild(child.id, displayBuddyKey) ?? {
    level: 1,
    xp: 0,
    mood: 80,
    stageIndex: 0,
  };
  const buddyForm = getBuddyForm(displayBuddyKey, buddyProgress.stageIndex);
  const buddyLevelInfo: LevelInfo = getLevelProgress(buddyProgress.level, buddyProgress.xp);
  const moodLabel = getMoodLabel(buddyProgress.mood);

  const openSettings = () => {
    const parent = navigation.getParent();
    if (parent) {
      (parent.getParent() ?? parent).navigate('SettingsStack' as never);
    }
  };

  const openChildSwitch = async () => {
    const ok = await requestParentalGate();
    if (!ok) return;
    const doReset = () => {
      const root = navigation.getParent()?.getParent() ?? navigation.getParent();
      if (root) {
        root.reset({ index: 0, routes: [{ name: 'FamilySelection' as never }] });
      }
    };
    if (Platform.OS === 'web') {
      doReset();
      return;
    }
    Alert.alert('子どもを切り替えますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '切り替える', onPress: doReset },
    ]);
  };

  const openBuddyTab = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('BuddyTab' as never);
    }
  };

  const openRewardsTab = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('RewardsTab' as never);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ParentalGate}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{child.name}のきょう</Text>
            <Text style={styles.headerSub}>まずはトレーニングを記録しよう</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={openChildSwitch} style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}>
              <Text style={styles.switchButtonText}>子ども切替</Text>
            </Pressable>
            <Pressable onPress={openSettings} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={openBuddyTab} style={({ pressed }) => [styles.buddyCard, pressed && styles.pressed]}>
          <View style={styles.buddyImageWrap}>
            <BuddyAvatar
              formId={buddyForm.formId}
              size={96}
              backgroundColor={getSkinColor(displayBuddyKey)}
              showFrame
              showStageBadge
            />
          </View>
          <View style={styles.buddyInfo}>
            <Text style={styles.buddyName}>{buddyForm.displayName}</Text>
            <Text style={styles.buddyLevel}>Lv.{buddyLevelInfo.level}</Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(buddyLevelInfo.progressPercent * 100)}%` }]} />
            </View>
            <Text style={styles.buddyMood}>{moodLabel.emoji} {moodLabel.label}</Text>
            <Text style={styles.buddyLink}>キャラをひらく ›</Text>
          </View>
        </Pressable>

        <PrimaryButton
          title="⭐ トレーニングを記録する"
          onPress={() => navigation.navigate('TrainingLog', { childId: child.id })}
          style={styles.primaryButton}
        />

        <Pressable
          style={({ pressed }) => [styles.treasureCard, pressed && styles.pressed]}
          onPress={openRewardsTab}
        >
          <View style={styles.treasureHeader}>
            <Text style={styles.treasureTitle}>宝箱（{TREASURE_KIND_LABELS[treasureKind]}）まであと</Text>
            <Text style={styles.treasureCount}>{treasureRemaining}回</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${treasurePercent}%` }]} />
          </View>
          <Text style={styles.treasureSub}>
            {treasureCompleted} / {treasure.target} 回
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function getLevelProgress(level: number, xp: number) {
  const xpForNext = Math.max(100, level * 100);
  const xpIntoLevel = Math.min(xp, xpForNext);
  return {
    level,
    xpIntoLevel,
    xpForNext,
    progressPercent: xpForNext === 0 ? 0 : xpIntoLevel / xpForNext,
  };
}

function getMoodLabel(mood: number): { label: string; emoji: string } {
  if (mood >= 80) return { label: 'とってもごきげん！', emoji: '😄' };
  if (mood >= 50) return { label: 'ふつうのきぶん', emoji: '🙂' };
  if (mood >= 30) return { label: 'ちょっとつかれぎみ', emoji: '😕' };
  return { label: 'げんきがないかも…', emoji: '😢' };
}

function getSkinColor(skinId: string) {
  const skin = getSkinById(skinId);
  switch (skin?.category) {
    case 'study':
      return '#E6F3FF';
    case 'exercise':
      return '#E8F8EE';
    case 'default':
    default:
      return '#FFE5EC';
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.95,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  headerSub: {
    ...theme.typography.label,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  settingsIcon: {
    fontSize: 20,
  },
  switchButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  switchButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
  buddyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  buddyImageWrap: {
    marginRight: theme.spacing.md,
  },
  buddyInfo: {
    flex: 1,
  },
  buddyName: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  buddyLevel: {
    ...theme.typography.label,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  xpTrack: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
    marginVertical: theme.spacing.xs,
  },
  xpFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  buddyMood: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  buddyLink: {
    ...theme.typography.label,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  primaryButton: {
    marginBottom: theme.spacing.lg,
  },
  treasureCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  treasureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  treasureTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  treasureCount: {
    ...theme.typography.heading1,
    color: theme.colors.accent,
  },
  progressTrack: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  treasureSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.sm,
  },
});
