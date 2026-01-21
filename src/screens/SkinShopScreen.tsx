import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RewardsStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { getAllSkins, isSkinGachaVisible, isSkinShopVisible } from '../characterSkinsConfig';
import { getSkinFullAsset, getSkinThumbAsset, hasSkinAsset } from '../assets/skinAssets';
import { createInitialTreasureState, getTreasureKind, TREASURE_KIND_LABELS } from '../treasureConfig';
import { getCategoryLevelInfoFromCount } from '../categoryLevel';
import { CelebrationEffects } from '../components/effects/CelebrationEffects';
import { safeSelection } from '../utils/haptics';
import type { CharacterSkin, SkinCategory, TreasureReward } from '../types';

type Props = NativeStackScreenProps<RewardsStackParamList, 'Rewards'>;

type GachaResult = {
  skin: CharacterSkin;
  isNew: boolean;
  duplicateCoins: number;
  category: 'study' | 'exercise';
};

const CATEGORY_LABELS: Record<'study' | 'exercise', string> = {
  study: '勉強',
  exercise: '運動',
};

const EMPTY_WALLET_CATEGORY = { coins: 0, tickets: 0, ticketProgress: 0, pity: 0 };
const EMPTY_CATEGORY_TRAINING_COUNT = { study: 0, exercise: 0 };
const TICKET_PROGRESS_MAX = 3;
const GACHA_UNLOCK_LEVEL = 2;
const PITY_THRESHOLD = 10;

export function SkinShopScreen({ route, navigation }: Props) {
  const {
    selectedChildId,
    settings,
    getChildById,
    getOwnedSkinsForChild,
    purchaseSkin,
    rollSkinGacha,
    openTreasureChest,
    appState,
  } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;
  const ownedSkins = childId ? getOwnedSkinsForChild(childId) : [];
  const ownedIds = new Set(ownedSkins.map((s) => s.id));
  const [selectedCategory, setSelectedCategory] = useState<'study' | 'exercise'>('study');
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [treasureReward, setTreasureReward] = useState<{
    rewards: TreasureReward[];
    kind: string;
    index: number;
  } | null>(null);

  const wallet = appState?.wallet;
  const walletCategory = wallet?.[selectedCategory] ?? EMPTY_WALLET_CATEGORY;
  const categoryTrainingCount = appState?.categoryTrainingCount ?? EMPTY_CATEGORY_TRAINING_COUNT;
  const categoryLevelInfo = getCategoryLevelInfoFromCount(categoryTrainingCount[selectedCategory] ?? 0);
  const categoryLevel = categoryLevelInfo.level;
  const categoryProgressText = `${categoryLevelInfo.progress}/${categoryLevelInfo.required}`;
  const ticketProgressRemaining = TICKET_PROGRESS_MAX - walletCategory.ticketProgress;
  const isGachaUnlocked = categoryLevel >= GACHA_UNLOCK_LEVEL;
  const treasure = appState?.treasure ?? createInitialTreasureState();
  const treasureKind = getTreasureKind(treasure.chestIndex);
  const treasureRemaining = Math.max(0, treasure.target - treasure.progress);
  const treasureProgress = Math.min(treasure.progress, treasure.target);
  const treasureProgressPercent =
    treasure.target === 0 ? 0 : Math.min(100, Math.round((treasureProgress / treasure.target) * 100));
  const canOpenTreasure = treasure.progress >= treasure.target;

  const allSkins = useMemo(() => (settings.enableMemeSkins ? getAllSkins(true) : []), [settings.enableMemeSkins]);
  const categorySkins = allSkins.filter((skin) => skin.category === selectedCategory);
  const shopSkins = categorySkins.filter((skin) => skin.unlockMethod === 'shop' && isSkinShopVisible(skin));
  const gachaSkins = categorySkins.filter((skin) => skin.unlockMethod === 'gacha' && isSkinGachaVisible(skin));
  const gachaPool = gachaSkins.filter((skin) => (skin.minLevel ? skin.minLevel <= categoryLevel : true));
  const pityRemaining = Math.max(0, PITY_THRESHOLD - 1 - walletCategory.pity);

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.headerTitle}>子どもが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePurchase = (skinId: string) => {
    if (!childId) return;
    const res = purchaseSkin({ childId, skinId });
    switch (res) {
      case 'ok':
        showAlert('交換しました！', 'スキンが追加されました');
        break;
      case 'not_enough_coins':
        showAlert('コインが足りません');
        break;
      case 'already_owned':
        showAlert('すでに持っています');
        break;
      case 'locked':
        showAlert('レベルが足りません');
        break;
      case 'not_available':
        showAlert('このスキンは交換できません');
        break;
      default:
        showAlert('交換に失敗しました');
        break;
    }
  };

  const handleGacha = () => {
    if (!childId) return;
    const res = rollSkinGacha({ childId, category: selectedCategory });
    if (res.result === 'not_enough_tickets') {
      showAlert('チケットが足りません');
      return;
    }
    if (res.result === 'gacha_disabled') {
      showAlert('ガチャは無効化されています');
      return;
    }
    if (res.result === 'not_available') {
      showAlert('ガチャを利用できません');
      return;
    }
    setGachaResult(res);
  };

  const handleOpenTreasure = () => {
    if (!childId) return;
    void safeSelection();
    const res = openTreasureChest({ childId });
    if (res.result === 'ok') {
      setTreasureReward({
        rewards: res.rewards,
        kind: TREASURE_KIND_LABELS[res.kind],
        index: res.index,
      });
      return;
    }
    if (res.result === 'not_ready') {
      showAlert('宝箱はまだ開けられないよ');
      return;
    }
    showAlert('宝箱が見つかりません');
  };

  const openTreasureDetail = () => {
    if (!childId) return;
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('HomeTab' as never, { screen: 'TreasureProgress', params: { childId } } as never);
    }
  };

  const canGacha =
    settings.enableGacha &&
    settings.enableMemeSkins &&
    isGachaUnlocked &&
    walletCategory.tickets > 0 &&
    gachaPool.length > 0;
  const gachaLineupText = isGachaUnlocked
    ? `ラインナップ: ${gachaPool.length}種類`
    : `ラインナップ: Lv${GACHA_UNLOCK_LEVEL}で公開`;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>ごほうび</Text>
        </View>

        <View style={styles.treasureCard}>
          <View style={styles.treasureHeader}>
            <Text style={styles.treasureTitle}>宝箱（{TREASURE_KIND_LABELS[treasureKind]}）</Text>
            <Text style={styles.treasureCount}>
              {treasureProgress}/{treasure.target}
            </Text>
          </View>
          <Text style={styles.treasureSub}>あと {treasureRemaining} 回で宝箱</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${treasureProgressPercent}%` }]} />
          </View>
          <Pressable
            style={[styles.openButton, !canOpenTreasure && styles.openButtonDisabled]}
            disabled={!canOpenTreasure}
            onPress={handleOpenTreasure}
          >
            <Text style={styles.openButtonText}>宝箱をひらく</Text>
          </Pressable>
          <Text style={styles.treasureHint}>{canOpenTreasure ? '開けられるよ！' : `あと ${treasureRemaining} 回`}</Text>
          <Pressable onPress={openTreasureDetail} style={styles.treasureLink}>
            <Text style={styles.treasureLinkText}>宝箱の履歴/進み具合を見る</Text>
          </Pressable>
        </View>

        {!settings.enableMemeSkins && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>親設定でスキン表示が無効です</Text>
          </View>
        )}

        {settings.enableMemeSkins && (
          <>
            <View style={styles.categoryTabs}>
              {(Object.keys(CATEGORY_LABELS) as Array<'study' | 'exercise'>).map((category) => {
                const selected = category === selectedCategory;
                return (
                  <Pressable
                    key={category}
                    style={[styles.categoryTab, selected && styles.categoryTabSelected]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.categoryTabText, selected && styles.categoryTabTextSelected]}>
                      {CATEGORY_LABELS[category]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.walletCard}>
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>{CATEGORY_LABELS[selectedCategory]}コイン</Text>
                <Text style={styles.walletValue}>{walletCategory.coins}</Text>
              </View>
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>{CATEGORY_LABELS[selectedCategory]}チケット</Text>
                <Text style={styles.walletValue}>{walletCategory.tickets}</Text>
              </View>
              <View style={styles.walletRow}>
                <Text style={styles.walletSubText}>チケット進捗</Text>
                <Text style={styles.walletSubText}>
                  {walletCategory.ticketProgress}/{TICKET_PROGRESS_MAX}（あと{ticketProgressRemaining}で+1）
                </Text>
              </View>
              <View style={styles.walletRow}>
                <Text style={styles.walletSubText}>カテゴリLv</Text>
                <Text style={styles.walletSubText}>Lv.{categoryLevel}</Text>
              </View>
              <View style={styles.walletRow}>
                <Text style={styles.walletSubText}>Lvアップまで</Text>
                <Text style={styles.walletSubText}>あと {categoryLevelInfo.remaining} 回でLvアップ</Text>
              </View>
              <View style={styles.walletRow}>
                <Text style={styles.walletSubText}>進捗</Text>
                <Text style={styles.walletSubText}>{categoryProgressText}</Text>
              </View>
              <View style={styles.levelTrack}>
                <View
                  style={[
                    styles.levelFill,
                    { width: `${Math.min(100, Math.round((categoryLevelInfo.progress / categoryLevelInfo.required) * 100))}%` },
                  ]}
                />
              </View>
              <Text style={styles.walletHint}>トレーニング回数でLvが上がります</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CATEGORY_LABELS[selectedCategory]}ショップ</Text>
              {shopSkins.map((skin) => {
                const owned = ownedIds.has(skin.id) || skin.unlockMethod === 'default';
                const hasAsset = hasSkinAsset(skin.assetKey);
                const locked = skin.minLevel ? skin.minLevel > categoryLevel : false;
                return (
                  <View key={skin.id} style={styles.skinRow}>
                    <View style={[styles.skinThumb, { backgroundColor: getSkinColorByCategory(skin.category) }]}>
                      {hasAsset ? (
                        <Image source={getSkinThumbAsset(skin.assetKey)} style={styles.skinThumbImage} resizeMode="contain" />
                      ) : (
                        <Text style={styles.skinEmoji}>🧠</Text>
                      )}
                    </View>
                    <View style={styles.skinInfo}>
                      <Text style={styles.skinName}>{skin.name}</Text>
                      <Text style={styles.skinMeta}>
                        {skin.rarity} / {skin.shopCost ?? '-'}コイン
                        {skin.minLevel ? ` / Lv.${skin.minLevel}〜` : ''}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.buyButton, (owned || locked) && styles.buyButtonDisabled]}
                      onPress={() => handlePurchase(skin.id)}
                      disabled={owned || locked}
                    >
                      <Text style={styles.buyButtonText}>
                        {owned ? '入手済み' : locked ? `Lv.${skin.minLevel}` : '交換'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              {shopSkins.length === 0 && <Text style={styles.emptyText}>交換できるスキンがありません</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CATEGORY_LABELS[selectedCategory]}ガチャ</Text>
              {settings.enableGacha ? (
                <>
                  <Text style={styles.gachaNote}>
                    Lv{GACHA_UNLOCK_LEVEL}でガチャ解放（チケットはLv1から貯まります）
                  </Text>
                  {!isGachaUnlocked && (
                    <Text style={styles.gachaNote}>
                      ガチャはカテゴリLv{GACHA_UNLOCK_LEVEL}で解放されます（現在Lv.{categoryLevel}）。
                    </Text>
                  )}
                  <Pressable
                    style={[styles.gachaButton, !canGacha && styles.gachaButtonDisabled]}
                    onPress={handleGacha}
                    disabled={!canGacha}
                  >
                    <Text style={styles.gachaButtonText}>チケットで回す</Text>
                  </Pressable>
                  <Text style={styles.gachaNote}>{gachaLineupText}</Text>
                  {isGachaUnlocked && gachaPool.length === 0 && (
                    <Text style={styles.gachaNote}>ガチャ候補がありません</Text>
                  )}
                  {isGachaUnlocked ? (
                    <Text style={styles.gachaNote}>天井まであと {pityRemaining} 回</Text>
                  ) : (
                    <Text style={styles.gachaNote}>カテゴリLvが上がるとラインナップが追加されます</Text>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>親設定でガチャが無効化されています</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(gachaResult)} animationType="fade" onRequestClose={() => setGachaResult(null)}>
        <View style={styles.gachaOverlay}>
          <View style={styles.gachaModal}>
            <Text style={styles.gachaTitle}>スキンゲット！</Text>
            {gachaResult && (
              <>
                <View style={[styles.gachaImageFrame, { backgroundColor: getSkinColorByCategory(gachaResult.skin.category) }]}>
                  {hasSkinAsset(gachaResult.skin.assetKey) ? (
                    <Image
                      source={getSkinFullAsset(gachaResult.skin.assetKey)}
                      style={styles.gachaImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.gachaEmoji}>🧠</Text>
                  )}
                </View>
                <Text style={styles.gachaSkinName}>{gachaResult.skin.name}</Text>
                <Text style={styles.gachaResultNote}>
                  {gachaResult.isNew ? '（あたらしく手に入れたよ）' : '（すでに持っているスキンでした）'}
                </Text>
                {!gachaResult.isNew && gachaResult.duplicateCoins > 0 && (
                  <Text style={styles.gachaResultBonus}>ダブり → +{gachaResult.duplicateCoins}コイン</Text>
                )}
              </>
            )}
            <Pressable style={styles.gachaCloseButton} onPress={() => setGachaResult(null)}>
              <Text style={styles.gachaCloseButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={Boolean(treasureReward)}
        animationType="fade"
        onRequestClose={() => setTreasureReward(null)}
      >
        {treasureReward && (
          <View style={styles.treasureOverlay}>
            <CelebrationEffects visible={Boolean(treasureReward)} kind="chest" />
            <View style={styles.treasureModal}>
              <Text style={styles.treasureModalTitle}>宝箱をひらいた！</Text>
              <Text style={styles.treasureModalSub}>
                宝箱{treasureReward.kind} #{treasureReward.index + 1}
              </Text>
              <View style={styles.treasureRewardList}>
                {treasureReward.rewards.map((reward, idx) => (
                  <Text key={`${reward.type}-${idx}`} style={styles.treasureRewardLine}>
                    {formatTreasureRewardLine(reward)}
                  </Text>
                ))}
              </View>
              <Pressable style={styles.treasureModalButton} onPress={() => setTreasureReward(null)}>
                <Text style={styles.treasureModalButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function getSkinColorByCategory(category: SkinCategory) {
  switch (category) {
    case 'study':
      return '#E6F3FF';
    case 'exercise':
      return '#E8F8EE';
    case 'default':
    default:
      return '#FFE5EC';
  }
}

const TREASURE_CATEGORY_LABELS: Record<'study' | 'exercise', string> = {
  study: '勉強',
  exercise: '運動',
};

function formatTreasureRewardLine(reward: TreasureReward): string {
  if (reward.type === 'buddyXp') {
    return `相棒XP +${reward.amount}`;
  }
  const categoryLabel = reward.category ? TREASURE_CATEGORY_LABELS[reward.category] : '';
  const itemLabel = reward.type === 'coins' ? 'コイン' : 'チケット';
  return `${categoryLabel}${itemLabel} +${reward.amount}`;
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  treasureCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  treasureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  treasureTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  treasureCount: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  treasureSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  openButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  openButtonDisabled: {
    opacity: 0.5,
  },
  openButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  treasureHint: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.sm,
  },
  treasureLink: {
    marginTop: theme.spacing.xs,
  },
  treasureLinkText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  categoryTabSelected: {
    backgroundColor: theme.colors.primary,
  },
  categoryTabText: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  categoryTabTextSelected: {
    color: '#fff',
  },
  walletCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  walletLabel: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  walletValue: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  walletSubText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  levelTrack: {
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
  },
  levelFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  walletHint: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
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
  skinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  skinThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  skinThumbImage: {
    width: '100%',
    height: '100%',
  },
  skinEmoji: {
    fontSize: 24,
  },
  skinInfo: {
    flex: 1,
  },
  skinName: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  skinMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  buyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  buyButtonDisabled: {
    backgroundColor: theme.colors.borderSoft,
  },
  buyButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  gachaButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  gachaButtonDisabled: {
    backgroundColor: theme.colors.borderSoft,
  },
  gachaButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  gachaNote: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  gachaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  gachaModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  gachaTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  gachaImageFrame: {
    width: 160,
    height: 160,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  gachaImage: {
    width: '100%',
    height: '100%',
  },
  gachaEmoji: {
    fontSize: 64,
  },
  gachaSkinName: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    fontWeight: '600',
  },
  gachaResultNote: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.xs,
  },
  gachaResultBonus: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  gachaCloseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  gachaCloseButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  treasureOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  treasureModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  treasureModalTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  treasureModalSub: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
  },
  treasureRewardList: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  treasureRewardLine: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  treasureModalButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  treasureModalButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
});

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
