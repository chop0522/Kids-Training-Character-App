import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { createInitialTreasureState, getTreasureKind, TREASURE_KIND_LABELS } from '../treasureConfig';
import type { TreasureReward } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'TreasureProgress'>;

export function TreasureProgressScreen({ navigation, route }: Props) {
  const { selectedChildId, getChildById, appState } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;

  const treasure = appState?.treasure ?? createInitialTreasureState();
  const kind = getTreasureKind(treasure.chestIndex);
  const progressPercent =
    treasure.target === 0 ? 0 : Math.min(100, Math.round((treasure.progress / treasure.target) * 100));
  const remaining = Math.max(0, treasure.target - treasure.progress);
  const openRewardsTab = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('RewardsTab' as never);
    }
  };

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>子どもが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>宝箱の進み具合</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>次の宝箱（{TREASURE_KIND_LABELS[kind]}）</Text>
          <Text style={styles.heroCount}>あと {remaining} 回で開けられるよ</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.heroSub}>
            {Math.min(treasure.progress, treasure.target)} / {treasure.target} 回
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>宝箱をひらく</Text>
          <Text style={styles.cardText}>宝箱の開封は「ごほうび」でできるよ</Text>
          <Pressable style={styles.openButton} onPress={openRewardsTab}>
            <Text style={styles.openButtonText}>ごほうびへ</Text>
          </Pressable>
          <Text style={styles.cardHint}>あと {remaining} 回で宝箱</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>これまでの宝箱</Text>
          {treasure.history.length === 0 && <Text style={styles.cardText}>宝箱の記録がありません</Text>}
          {treasure.history.map((item) => (
            <View key={`${item.index}-${item.openedAtISO}`} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyTitle}>宝箱 #{item.index + 1}</Text>
                <Text style={styles.historyDate}>{formatDate(item.openedAtISO)}</Text>
              </View>
              <Text style={styles.historySummary}>{formatRewards(item.rewards)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CATEGORY_LABELS: Record<'study' | 'exercise', string> = {
  study: '勉強',
  exercise: '運動',
};

function formatRewards(rewards: TreasureReward[]): string {
  return rewards.map((reward) => formatRewardLine(reward)).join(' / ');
}

function formatRewardLine(reward: TreasureReward): string {
  if (reward.type === 'buddyXp') {
    return `相棒XP +${reward.amount}`;
  }
  const categoryLabel = reward.category ? CATEGORY_LABELS[reward.category] : '';
  const itemLabel = reward.type === 'coins' ? 'コイン' : 'チケット';
  return `${categoryLabel}${itemLabel} +${reward.amount}`;
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString();
  } catch (e) {
    return iso;
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
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  heroTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  heroCount: {
    ...theme.typography.heading1,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  heroSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  progressTrack: {
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
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
    marginBottom: theme.spacing.xs,
  },
  cardText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
  },
  openButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  openButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  cardHint: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  historyLeft: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  historyTitle: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  historyDate: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  historySummary: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
    textAlign: 'right',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
});
