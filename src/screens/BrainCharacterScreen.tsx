import React, { useMemo } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { CharacterSkin } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BrainCharacter'>;

const AVAILABLE_SKINS: CharacterSkin[] = [
  {
    id: 'default_pink',
    name: 'ピンクブレイン',
    type: 'original',
    isPremium: false,
    assetKey: 'brain_default_pink',
  },
  {
    id: 'cool_blue',
    name: 'クールブルー',
    type: 'original',
    isPremium: false,
    assetKey: 'brain_cool_blue',
  },
];

export function BrainCharacterScreen({ navigation, route }: Props) {
  const { getChildById, getBrainCharacterForChild, petBrainCharacter, feedBrainCharacter, setBrainCharacterSkin } =
    useAppStore();
  const childId = route.params.childId;
  const child = getChildById(childId);
  const brain = getBrainCharacterForChild(childId);

  const xpProgress = useMemo(() => {
    if (!brain) return { percent: 0, current: 0, target: 100 };
    const target = Math.max(100, brain.level * 100);
    const current = Math.min(brain.xp, target);
    return {
      percent: target === 0 ? 0 : current / target,
      current,
      target,
    };
  }, [brain]);

  const moodLabel = getMoodLabel(brain?.mood ?? 0);
  const skinList = AVAILABLE_SKINS;
  const activeSkinId = brain?.skinId ?? skinList[0].id;

  if (!child || !brain) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.headerTitle}>キャラ情報が見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePet = () => petBrainCharacter(childId);
  const handleFeed = () => {
    if (child.coins < 10) {
      Alert.alert('コインが足りません', '10コイン以上でごちそうをあげられます');
      return;
    }
    feedBrainCharacter(childId);
  };
  const handleSelectSkin = (skinId: string) => setBrainCharacterSkin(childId, skinId);

  const xpPercentWidth = `${Math.min(100, Math.max(0, Math.round(xpProgress.percent * 100)))}%`;
  const moodPercentWidth = `${Math.min(100, Math.max(0, brain.mood))}%`;

  const skinColor = getSkinColor(activeSkinId);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{child.name}のキャラ</Text>
        </View>

        <View style={styles.characterCard}>
          <View style={[styles.characterImage, { backgroundColor: skinColor }]}>
            <Text style={styles.brainEmoji}>🧠</Text>
          </View>
          <Text style={styles.levelText}>Lv.{brain.level}</Text>
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: xpPercentWidth }]} />
          </View>
          <Text style={styles.levelSub}>
            XP {xpProgress.current} / {xpProgress.target}
          </Text>

          <View style={styles.moodRow}>
            <View style={styles.moodBarBackground}>
              <View style={[styles.moodBarFill, { width: moodPercentWidth }]} />
            </View>
            <View style={styles.moodLabelRow}>
              <Text style={styles.moodLabelEmoji}>{moodLabel.emoji}</Text>
              <Text style={styles.moodLabelText}>{moodLabel.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={handlePet} style={[styles.actionButton, styles.actionButtonFirst]}>
            <Text style={styles.actionButtonTitle}>なでる</Text>
            <Text style={styles.actionButtonSub}>気分 +5</Text>
          </Pressable>
          <Pressable onPress={handleFeed} style={[styles.actionButton, styles.actionButtonLast]}>
            <Text style={styles.actionButtonTitle}>ごちそうをあげる</Text>
            <Text style={styles.actionButtonSub}>10コイン消費 / 気分 +20</Text>
          </Pressable>
        </View>
        <Text style={styles.coinText}>所持コイン: {child.coins}</Text>

        <View style={styles.skinsCard}>
          <Text style={styles.skinsTitle}>きせかえ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skinsScroll}>
            {skinList.map((skin) => {
              const selected = skin.id === activeSkinId;
              return (
                <Pressable
                  key={skin.id}
                  onPress={() => handleSelectSkin(skin.id)}
                  style={[styles.skinButton, selected && styles.skinButtonSelected]}
                >
                  <View style={[styles.skinThumbnail, { backgroundColor: getSkinColor(skin.id) }]}>
                    <Text style={styles.brainEmojiSmall}>🧠</Text>
                  </View>
                  <Text style={styles.skinName}>{skin.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getMoodLabel(mood: number): { label: string; emoji: string } {
  if (mood >= 80) return { label: 'とってもごきげん！', emoji: '😄' };
  if (mood >= 50) return { label: 'ふつうのきぶん', emoji: '🙂' };
  if (mood >= 30) return { label: 'ちょっとつかれぎみ', emoji: '😕' };
  return { label: 'げんきがないかも…', emoji: '😢' };
}

function getSkinColor(skinId: string) {
  switch (skinId) {
    case 'cool_blue':
      return '#DCEFFF';
    case 'default_pink':
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
  backText: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  characterCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  characterImage: {
    width: 160,
    height: 160,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainEmoji: {
    fontSize: 64,
  },
  brainEmojiSmall: {
    fontSize: 36,
  },
  levelText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  levelSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  xpBarBackground: {
    width: '100%',
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: '#F0E4D5',
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  moodRow: {
    width: '100%',
    marginTop: theme.spacing.sm,
  },
  moodBarBackground: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: '#F0E4D5',
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  moodBarFill: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
  },
  moodLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabelEmoji: {
    fontSize: 18,
  },
  moodLabelText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    marginLeft: theme.spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  actionButtonFirst: {
    marginRight: theme.spacing.sm,
  },
  actionButtonLast: {
    marginLeft: theme.spacing.sm,
  },
  actionButtonTitle: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    fontWeight: '600',
  },
  actionButtonSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  coinText: {
    ...theme.typography.label,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.md,
    textAlign: 'right',
  },
  skinsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  skinsTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  skinsScroll: {
    flexDirection: 'row',
  },
  skinButton: {
    width: 110,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
  },
  skinButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceAlt,
  },
  skinThumbnail: {
    width: 70,
    height: 70,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinName: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
    textAlign: 'center',
  },
});
