import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStoreContext';
import { BuddyStackParamList } from '../navigation/types';
import { theme } from '../theme';

type Props = NativeStackScreenProps<BuddyStackParamList, 'Achievements'>;

export function AchievementsScreen({ route, navigation }: Props) {
  const { selectedChildId, getChildById, getAchievementsForChild } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? '';
  const child = getChildById(childId);

  const items = useMemo(() => {
    const list = getAchievementsForChild(childId);
    return list.sort((a, b) => {
      if (a.unlocked === b.unlocked) {
        return a.achievement.id.localeCompare(b.achievement.id);
      }
      return a.unlocked ? -1 : 1;
    });
  }, [childId, getAchievementsForChild]);

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.content, styles.centered]}>
          <Text style={styles.headerTitle}>子どもが見つかりません</Text>
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
          <Text style={styles.headerTitle}>バッジ</Text>
        </View>
        <Text style={styles.childNameText}>{child.name}ちゃんのバッジ</Text>

        <View style={styles.listContainer}>
          {items.map((item) => {
            const cardStyles = [styles.achievementCard, !item.unlocked && styles.achievementCardLocked];
            const iconOpacity = item.unlocked ? 1 : 0.4;
            const statusText = item.unlocked ? '解除済み' : 'まだ';
            return (
              <View key={item.achievement.id} style={cardStyles}>
                <View style={[styles.achievementIconContainer, { opacity: iconOpacity }]}>
                  <Text style={styles.achievementIconText}>{item.achievement.iconEmoji}</Text>
                </View>
                <View style={styles.achievementTextContainer}>
                  <Text style={styles.achievementTitle}>{item.achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{item.achievement.description}</Text>
                  <Text
                    style={[
                      styles.achievementStatus,
                      item.unlocked ? styles.achievementStatusUnlocked : styles.achievementStatusLocked,
                    ]}
                  >
                    {statusText}
                  </Text>
                  {item.unlockedAt && <Text style={styles.achievementDate}>{formatDate(item.unlockedAt)}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(iso: string) {
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
  childNameText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.md,
  },
  listContainer: {},
  achievementCard: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  achievementCardLocked: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.borderSoft,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  achievementIconText: {
    fontSize: 24,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  achievementDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.xs,
  },
  achievementStatus: {
    ...theme.typography.caption,
  },
  achievementStatusUnlocked: {
    color: theme.colors.success,
  },
  achievementStatusLocked: {
    color: theme.colors.textDisabled,
  },
  achievementDate: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
});
