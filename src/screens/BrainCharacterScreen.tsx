import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuddyStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { getSkinById, isSkinSelectableBuddy } from '../characterSkinsConfig';
import { BuddyAvatar } from '../components/BuddyAvatar';
import { CelebrationEffects } from '../components/effects/CelebrationEffects';
import { theme } from '../theme';
import {
  canEvolveBuddy,
  findEvolutionLineByFormId,
  getBuddyForm,
  getEvolutionRequirementLevel,
  getNextEvolutionStage,
} from '../characterEvolutionConfig';
import { safeSelection } from '../utils/haptics';

// Buddy screen
type Props = NativeStackScreenProps<BuddyStackParamList, 'Buddy'>;

type EvolutionPreview = {
  before: ReturnType<typeof getBuddyForm>;
  after: ReturnType<typeof getBuddyForm>;
};

export function BrainCharacterScreen({ navigation, route }: Props) {
  const {
    selectedChildId,
    getChildById,
    getOwnedSkinsForChild,
    getActiveBuddyKeyForChild,
    getBuddyProgressForChild,
    setActiveBuddyForChild,
    evolveActiveBuddyForChild,
    settings,
  } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;
  const ownedSkins = child ? getOwnedSkinsForChild(child.id) : [];
  const [evolutionPreview, setEvolutionPreview] = useState<EvolutionPreview | null>(null);
  const [pendingBuddyKey, setPendingBuddyKey] = useState<string | null>(null);
  const [pendingEvolution, setPendingEvolution] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const afterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const handler = (enabled: boolean) => setReduceMotionEnabled(enabled);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', handler);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

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
    !settings.enableMemeSkins && activeSkin && activeSkin.category !== 'default'
      ? defaultBuddyKey
      : activeBuddyKey;
  const activeProgress = getBuddyProgressForChild(child.id, displayBuddyKey) ?? {
    level: 1,
    xp: 0,
    mood: 80,
    stageIndex: 0,
  };
  const activeForm = getBuddyForm(displayBuddyKey, activeProgress.stageIndex);
  const levelInfo = getLevelProgress(activeProgress.level, activeProgress.xp);
  const evolutionRequirement = getEvolutionRequirementLevel(displayBuddyKey, activeProgress);
  const isEvolvable = canEvolveBuddy(displayBuddyKey, activeProgress);
  const nextEvolutionStage = getNextEvolutionStage(displayBuddyKey, activeProgress);
  const hasEvolutionLine = Boolean(findEvolutionLineByFormId(displayBuddyKey));
  const remainingLevels =
    evolutionRequirement === null ? null : Math.max(0, evolutionRequirement - activeProgress.level);

  useEffect(() => {
    if (!evolutionPreview) {
      afterScale.setValue(1);
      return;
    }
    if (reduceMotionEnabled) {
      afterScale.setValue(1);
      return;
    }
    afterScale.setValue(0.9);
    Animated.spring(afterScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 160,
    }).start();
  }, [evolutionPreview, reduceMotionEnabled, afterScale]);

  const handleSelectBuddy = (buddyKey: string) => {
    if (buddyKey === activeBuddyKey) return;
    const skin = getSkinById(buddyKey);
    if (!settings.enableMemeSkins && skin && skin.category !== 'default') {
      Alert.alert('このキャラは非表示になっています');
      return;
    }
    setPendingBuddyKey(buddyKey);
  };

  const handleConfirmBuddySwitch = () => {
    if (!pendingBuddyKey) return;
    setActiveBuddyForChild(child.id, pendingBuddyKey);
    setPendingBuddyKey(null);
  };

  const handleEvolve = () => {
    void safeSelection();
    if (!nextEvolutionStage) {
      Alert.alert('進化できません');
      return;
    }
    if (!isEvolvable) {
      Alert.alert('レベルが足りません', `Lv.${evolutionRequirement ?? '?'}で進化できます`);
      return;
    }
    setPendingEvolution(true);
  };

  const handleConfirmEvolve = () => {
    if (!nextEvolutionStage) {
      setPendingEvolution(false);
      return;
    }
    const beforeForm = getBuddyForm(displayBuddyKey, activeProgress.stageIndex);
    const res = evolveActiveBuddyForChild(child.id);
    setPendingEvolution(false);
    if (res.result === 'ok') {
      setEvolutionPreview({ before: beforeForm, after: nextEvolutionStage });
      return;
    }
    Alert.alert('進化できません');
  };

  const ownedBuddyCards = ownedSkins.map((skin) => {
    const progress = getBuddyProgressForChild(child.id, skin.id) ?? {
      level: 1,
      xp: 0,
      mood: 80,
      stageIndex: 0,
    };
    const form = getBuddyForm(skin.id, progress.stageIndex);
    return { skin, progress, form };
  });
  const pendingBuddySkin = pendingBuddyKey ? getSkinById(pendingBuddyKey) : undefined;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>相棒</Text>
          <Pressable
            style={({ pressed }) => [styles.encyclopediaButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Encyclopedia', { childId: child.id })}
          >
            <Text style={styles.encyclopediaButtonText}>図鑑</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <BuddyAvatar
            formId={activeForm.formId}
            size={180}
            variant="full"
            backgroundColor={getSkinColor(displayBuddyKey)}
            showFrame
            showStageBadge
            style={styles.heroImage}
          />
          <Text style={styles.heroName}>{activeForm.displayName}</Text>
          <Text style={styles.heroLevel}>Lv.{levelInfo.level}</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(levelInfo.progressPercent * 100)}%` }]} />
          </View>
          <Text style={styles.heroSub}>XP {levelInfo.xpIntoLevel} / {levelInfo.xpForNext}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>進化</Text>
          {!hasEvolutionLine ? (
            <Text style={styles.cardText}>この相棒は進化しないよ（準備中）</Text>
          ) : nextEvolutionStage ? (
            isEvolvable ? (
              <Pressable style={styles.evolveButton} onPress={handleEvolve}>
                <Text style={styles.evolveButtonText}>進化する</Text>
              </Pressable>
            ) : (
              <>
                <Text style={styles.cardText}>Lv.{evolutionRequirement}で進化できるよ</Text>
                {remainingLevels !== null && (
                  <Text style={styles.cardSubText}>あと {remainingLevels} Lv</Text>
                )}
              </>
            )
          ) : (
            <Text style={styles.cardText}>これ以上進化できないよ</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>相棒を変える</Text>
          {ownedBuddyCards.filter((buddy) => isSkinSelectableBuddy(buddy.skin)).map((buddy) => {
            const selected = buddy.skin.id === displayBuddyKey;
            return (
              <Pressable
                key={buddy.skin.id}
                style={({ pressed }) => [styles.buddyRow, selected && styles.buddyRowSelected, pressed && styles.pressed]}
                onPress={() => handleSelectBuddy(buddy.skin.id)}
              >
                <BuddyAvatar
                  formId={buddy.form.formId}
                  size={54}
                  backgroundColor={getSkinColor(buddy.skin.id)}
                  showFrame
                  showStageBadge
                  style={styles.buddyThumb}
                />
                <View style={styles.buddyInfo}>
                  <Text style={styles.buddyName}>{buddy.form.displayName}</Text>
                  <Text style={styles.buddyMeta}>Lv.{buddy.progress.level}</Text>
                </View>
                {selected && <Text style={styles.selectedBadge}>いまの相棒</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(evolutionPreview)} animationType="fade" onRequestClose={() => setEvolutionPreview(null)}>
        {evolutionPreview && (
          <View style={styles.modalOverlay}>
            <CelebrationEffects visible={Boolean(evolutionPreview)} kind="evolution" />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{evolutionPreview.after.displayName}は しんかした！</Text>
              <View style={styles.modalRow}>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Before</Text>
                  <BuddyAvatar
                    formId={evolutionPreview.before.formId}
                    size={120}
                    variant="full"
                    backgroundColor={getSkinColor(displayBuddyKey)}
                    showFrame
                    showStageBadge={false}
                    style={styles.modalImage}
                  />
                  <Text style={styles.modalName}>{evolutionPreview.before.displayName}</Text>
                </View>
                <Animated.View style={[styles.modalItem, { transform: [{ scale: afterScale }] }]}>
                  <Text style={styles.modalLabel}>After</Text>
                  <BuddyAvatar
                    formId={evolutionPreview.after.formId}
                    size={120}
                    variant="full"
                    backgroundColor={getSkinColor(displayBuddyKey)}
                    showFrame
                    showStageBadge
                    style={styles.modalImage}
                  />
                  <Text style={styles.modalName}>{evolutionPreview.after.displayName}</Text>
                </Animated.View>
              </View>
              <Pressable style={styles.modalButton} onPress={() => setEvolutionPreview(null)}>
                <Text style={styles.modalButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      <Modal transparent visible={pendingEvolution} animationType="fade" onRequestClose={() => setPendingEvolution(false)}>
        {pendingEvolution && (
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.modalTitle}>進化する？</Text>
              <Text style={styles.confirmText}>進化すると前の姿には戻れないよ。</Text>
              <Text style={styles.confirmText}>図鑑には思い出として残るよ。</Text>
              <Text style={styles.confirmText}>進化する？</Text>
              <View style={styles.confirmRow}>
                <Pressable style={styles.confirmButtonGhost} onPress={() => setPendingEvolution(false)}>
                  <Text style={styles.confirmButtonGhostText}>キャンセル</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={handleConfirmEvolve}>
                  <Text style={styles.confirmButtonText}>進化する</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal transparent visible={Boolean(pendingBuddyKey)} animationType="fade" onRequestClose={() => setPendingBuddyKey(null)}>
        {pendingBuddyKey && (
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.modalTitle}>相棒を切り替える？</Text>
              <Text style={styles.confirmText}>
                これからのXPは「{pendingBuddySkin?.name ?? 'このキャラ'}」に入るよ。
              </Text>
              <Text style={styles.confirmText}>前の相棒の成長は消えないよ。</Text>
              <View style={styles.confirmRow}>
                <Pressable style={styles.confirmButtonGhost} onPress={() => setPendingBuddyKey(null)}>
                  <Text style={styles.confirmButtonGhostText}>キャンセル</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={handleConfirmBuddySwitch}>
                  <Text style={styles.confirmButtonText}>切り替える</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  encyclopediaButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  encyclopediaButtonText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  heroImage: {
    width: 180,
    height: 180,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  heroName: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  heroLevel: {
    ...theme.typography.label,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  xpTrack: {
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
    marginVertical: theme.spacing.sm,
    width: '100%',
  },
  xpFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  heroSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  cardText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  cardSubText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  evolveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  evolveButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  buddyRowSelected: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
  },
  buddyThumb: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
  },
  buddyInfo: {
    flex: 1,
  },
  buddyName: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  buddyMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  selectedBadge: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  modalTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  modalItem: {
    alignItems: 'center',
    flex: 1,
  },
  modalLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.xs,
  },
  modalImage: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  modalName: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  modalButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  confirmText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  confirmRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: theme.spacing.md,
  },
  confirmButtonGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  confirmButtonGhostText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  confirmButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
});
