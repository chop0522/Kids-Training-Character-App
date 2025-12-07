import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { useAppStore, StreakInfo } from '../store/AppStoreContext';
import { theme } from '../theme';
import { XPBar } from '../components/XPBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { BrainCharacter, ChildProfile, MapNode, TrainingSession } from '../types';
import { computeStreaks } from '../utils/progress';
import { getStageName } from '../mapConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildDashboard'>;

type MapProgress = {
  stageName: string;
  completedNodes: number;
  totalNodes: number;
};

type StreakData = {
  current: number;
  best: number;
  recentDays: { date: string; hasSession: boolean }[];
};

type TodayQuest = {
  title: string;
  description?: string;
  completed: boolean;
  progress: number;
  total: number;
};

type BadgesPreview = {
  unlockedCount: number;
  totalCount: number;
  icons: string[];
};

type DashboardProps = {
  child: ChildProfile;
  brainCharacter: BrainCharacter;
  mapProgress: MapProgress;
  streak: StreakData;
  todayQuest: TodayQuest;
  badges: BadgesPreview;
  activitiesUsedByChild: Activity[];
  todayComment?: string;
  onPressSettings: () => void;
  onPressLogTraining: () => void;
  onPressOpenCharacter: () => void;
  onPressOpenMap: () => void;
  onPressOpenBadges: () => void;
  onPressOpenTimeline: (activityId: string) => void;
  onPressEditComment: () => void;
};

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
type LevelInfo = ReturnType<typeof getLevelProgress>;

export function ChildDashboardScreen({ navigation, route }: Props) {
  const {
    children,
    streakByChildId,
    brainCharacters,
    isLoading,
    selectedChildId,
    getSessionsForChild,
    getMapNodesForChild,
    getCurrentMapNodeForChild,
    getAchievementsForChild,
    getUnlockedAchievementCountForChild,
    getActivitiesForFamily,
  } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const [todayComment, setTodayComment] = useState<string | undefined>(undefined);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const child = children.find((c) => c.id === childId) ?? null;
  if (!child) {
    return (
      <View style={styles.loading}>
        <Text>子どもが見つかりません。家族画面に戻ってください。</Text>
        <PrimaryButton title="家族を選ぶ" onPress={() => navigation.navigate('FamilySelection')} />
      </View>
    );
  }

  const brainCharacter =
    brainCharacters.find((b) => b.childId === child.id) ??
    ({
      id: 'brain-fallback',
      childId: child.id,
      level: child.level,
      xp: child.xp,
      mood: 70,
      skinId: 'default',
      createdAt: new Date().toISOString(),
    } as BrainCharacter);

  const sessionsForChild = useMemo(() => getSessionsForChild(child.id), [getSessionsForChild, child.id]);
  const childMapNodes = useMemo(() => getMapNodesForChild(child.id), [getMapNodesForChild, child.id]);
  const currentMapNode = useMemo(
    () => getCurrentMapNodeForChild(child.id),
    [getCurrentMapNodeForChild, child.id, childMapNodes]
  );

  const mapProgress = useMemo(() => buildMapProgress(childMapNodes), [childMapNodes]);
  const streak = useMemo(
    () => buildStreakData(sessionsForChild, streakByChildId[child.id], child.id),
    [sessionsForChild, streakByChildId, child.id]
  );
  const todayQuest = useMemo(
    () => buildTodayQuest(sessionsForChild, currentMapNode),
    [sessionsForChild, currentMapNode]
  );
  const achievementsForChild = useMemo(() => getAchievementsForChild(child.id), [getAchievementsForChild, child.id]);
  const badges: BadgesPreview = useMemo(() => {
    const unlocked = achievementsForChild.filter((a) => a.unlocked);
    const icons = unlocked.slice(0, 4).map((a) => a.achievement.iconEmoji);
    const unlockedCount = getUnlockedAchievementCountForChild(child.id);
    return {
      unlockedCount,
      totalCount: achievementsForChild.length,
      icons,
    };
  }, [achievementsForChild, child.id, getUnlockedAchievementCountForChild]);
  const activitiesForFamily = useMemo(
    () => getActivitiesForFamily(child.familyId),
    [getActivitiesForFamily, child.familyId]
  );
  const activitiesUsedByChild = useMemo(() => {
    const ids = new Set(sessionsForChild.map((s) => s.activityId));
    return activitiesForFamily.filter((a) => ids.has(a.id)).slice(0, 3);
  }, [activitiesForFamily, sessionsForChild]);
  const levelInfo = useMemo(() => getLevelProgress(child.level, child.xp), [child.level, child.xp]);

  const openCommentEditor = () => {
    setCommentDraft(todayComment ?? '');
    setCommentModalVisible(true);
  };

  const saveComment = () => {
    const trimmed = commentDraft.trim();
    setTodayComment(trimmed.length > 0 ? trimmed : undefined);
    setCommentModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ChildDashboardContent
          child={child}
          brainCharacter={brainCharacter}
          mapProgress={mapProgress}
          streak={streak}
          todayQuest={todayQuest}
          badges={badges}
          activitiesUsedByChild={activitiesUsedByChild}
          todayComment={todayComment}
          onPressSettings={() => navigation.navigate('ParentSettings')}
          onPressLogTraining={() => navigation.navigate('TrainingLog', { childId: child.id })}
          onPressOpenCharacter={() => navigation.navigate('BrainCharacter', { childId: child.id })}
          onPressOpenMap={() => navigation.navigate('Map', { childId: child.id })}
          onPressOpenBadges={() => navigation.navigate('Achievements', { childId: child.id })}
          onPressOpenTimeline={(activityId) =>
            navigation.navigate('ActivityTimeline', { childId: child.id, activityId })
          }
          onPressEditComment={openCommentEditor}
          levelInfo={levelInfo}
        />
      </ScrollView>

      <Modal visible={commentModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>今日のひとこと</Text>
            <Text style={styles.modalSubtitle}>今日のがんばりに一言おくろう！</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="例：すごく集中していたね！"
              placeholderTextColor={theme.colors.textDisabled}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="キャンセル"
                variant="ghost"
                onPress={() => setCommentModalVisible(false)}
                style={styles.inlineButton}
              />
              <PrimaryButton
                title="保存する"
                onPress={saveComment}
                variant="secondary"
                style={styles.inlineButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ChildDashboardContent({
  child,
  brainCharacter,
  mapProgress,
  streak,
  todayQuest,
  badges,
  activitiesUsedByChild,
  todayComment,
  onPressSettings,
  onPressLogTraining,
  onPressOpenCharacter,
  onPressOpenMap,
  onPressOpenBadges,
  onPressOpenTimeline,
  onPressEditComment,
  levelInfo,
}: DashboardProps & { levelInfo: LevelInfo }) {
  return (
    <>
      <Header child={child} onPressSettings={onPressSettings} />
      <CharacterStatusCard
        child={child}
        brainCharacter={brainCharacter}
        levelInfo={levelInfo}
        onPressOpenCharacter={onPressOpenCharacter}
      />
      <TodayQuestCard quest={todayQuest} onPressLogTraining={onPressLogTraining} />
      <MapPreviewCard mapProgress={mapProgress} onPressOpenMap={onPressOpenMap} />
      <StreakAndHistoryCard streak={streak} />
      <BadgesPreviewCard badges={badges} onPressOpenBadges={onPressOpenBadges} />
      <GrowthCard activities={activitiesUsedByChild} onPressOpenTimeline={onPressOpenTimeline} />
      <TodayCommentCard comment={todayComment} onPressEditComment={onPressEditComment} />
    </>
  );
}

function Header({ child, onPressSettings }: { child: ChildProfile; onPressSettings: () => void }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <View style={styles.childAvatar}>
          <Text style={styles.childAvatarText}>{child.name.slice(0, 1)}</Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.name}ちゃん</Text>
          <Text style={styles.childSub}>きょうのようすをチェックしてね</Text>
        </View>
      </View>
      <Pressable onPress={onPressSettings} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
        <Text style={styles.settingsIcon}>⚙️</Text>
      </Pressable>
    </View>
  );
}

function CharacterStatusCard({
  child,
  brainCharacter,
  levelInfo,
  onPressOpenCharacter,
}: {
  child: ChildProfile;
  brainCharacter: BrainCharacter;
  levelInfo: LevelInfo;
  onPressOpenCharacter: () => void;
}) {
  const moodFill = Math.min(4, Math.max(0, Math.round((brainCharacter.mood / 100) * 4)));

  return (
    <View style={styles.characterCard}>
      <Pressable onPress={onPressOpenCharacter} style={({ pressed }) => [styles.characterImageWrap, pressed && styles.pressed]}>
        <View style={styles.characterImage}>
          <Text style={styles.brainEmoji}>🧠</Text>
        </View>
        <Text style={styles.openLink}>キャラをひらく ›</Text>
        </Pressable>
        <View style={styles.characterInfo}>
          <View style={styles.coinBadge}>
            <Text style={styles.coinText}>🪙</Text>
            <Text style={styles.coinValue}>{child.coins}</Text>
          </View>
          <Text style={styles.levelText}>Lv.{levelInfo.level}</Text>
          <Text style={styles.levelSubText}>次のレベルまで {levelInfo.xpForNext - levelInfo.xpIntoLevel} XP</Text>
          <XPBar label="XP" progress={levelInfo.progressPercent} current={levelInfo.xpIntoLevel} target={levelInfo.xpForNext} />
        <View style={styles.moodRow}>
          <Text style={styles.moodLabel}>きぶん</Text>
          <View style={styles.moodFaces}>
            {[0, 1, 2, 3].map((index) => {
              const active = index < moodFill;
              return (
                <View
                  key={index}
                  style={[
                    styles.moodFace,
                    active ? styles.moodFaceActive : styles.moodFaceInactive,
                  ]}
                >
                  <Text style={[styles.moodFaceText, active && styles.moodFaceTextActive]}>
                    {active ? '😊' : '😶'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function TodayQuestCard({ quest, onPressLogTraining }: { quest: TodayQuest; onPressLogTraining: () => void }) {
  const progressPercent = Math.min(100, Math.round((quest.progress / quest.total) * 100));
  return (
    <View style={[styles.todayQuestCard, quest.completed && styles.todayQuestCompleted]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>今日のクエスト</Text>
        {quest.completed && (
          <View style={styles.questBadge}>
            <Text style={styles.questBadgeText}>✅ 達成！</Text>
          </View>
        )}
      </View>
      <Text style={styles.todayQuestTitle}>{quest.title}</Text>
      {quest.description ? <Text style={styles.todayQuestText}>{quest.description}</Text> : null}
      <Text style={styles.todayQuestProgressText}>
        {quest.progress} / {quest.total}（{progressPercent}%）
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <PrimaryButton
        title="トレーニングを記録する"
        onPress={onPressLogTraining}
        icon="⭐️"
        style={styles.primaryButton}
      />
    </View>
  );
}

function MapPreviewCard({ mapProgress, onPressOpenMap }: { mapProgress: MapProgress; onPressOpenMap: () => void }) {
  const pathSegments = 5;
  const progressRatio = mapProgress.totalNodes === 0 ? 0 : mapProgress.completedNodes / mapProgress.totalNodes;
  const completedCount = Math.min(pathSegments, Math.floor(progressRatio * pathSegments));
  const isStageCleared = progressRatio >= 1;

  return (
    <Pressable onPress={onPressOpenMap} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.mapHeaderRow}>
        <Text style={styles.mapTitle}>マップ</Text>
        <Text style={styles.mapOpenText}>ひらく ›</Text>
      </View>
      <View style={styles.mapBody}>
        <Text style={styles.mapProgressText}>
          今は「{mapProgress.stageName}」 {mapProgress.completedNodes} / {mapProgress.totalNodes} マス進行中
        </Text>
      </View>
      <View style={styles.mapPath}>
        {Array.from({ length: pathSegments }).map((_, index) => {
          const isCompleted = isStageCleared ? true : index < completedCount;
          const isCurrent = !isStageCleared && index === completedCount;
          const connectorCompleted = isStageCleared ? true : index < completedCount - 1;

          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.mapNode,
                  isCompleted && styles.mapNodeCompleted,
                  isCurrent && styles.mapNodeCurrent,
                  !isCompleted && !isCurrent && styles.mapNodeLocked,
                ]}
              />
              {index < pathSegments - 1 && (
                <View
                  style={[
                    styles.mapConnector,
                    connectorCompleted ? styles.mapConnectorCompleted : styles.mapConnectorPending,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </Pressable>
  );
}

function BadgesPreviewCard({ badges, onPressOpenBadges }: { badges: BadgesPreview; onPressOpenBadges: () => void }) {
  const placeholders = badges.icons.length === 0 ? ['🔒', '🔒', '🔒'] : [];
  const iconsToShow = badges.icons.length > 0 ? badges.icons : placeholders;

  return (
    <Pressable onPress={onPressOpenBadges} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.badgeTitleRow}>
        <Text style={styles.badgeTitle}>バッジ</Text>
        <Text style={styles.badgeCountText}>
          {badges.unlockedCount} / {badges.totalCount} こ 解除済み
        </Text>
      </View>
      <View style={styles.badgeIconRow}>
        {iconsToShow.map((icon, idx) => (
          <Text key={`${icon}-${idx}`} style={styles.badgeIcon}>
            {icon}
          </Text>
        ))}
      </View>
      <View style={styles.badgeCardFooter}>
        <Text style={styles.badgeMoreText}>もっとみる ›</Text>
      </View>
    </Pressable>
  );
}

function GrowthCard({
  activities,
  onPressOpenTimeline,
}: {
  activities: Activity[];
  onPressOpenTimeline: (activityId: string) => void;
}) {
  return (
    <View style={styles.growthCard}>
      <View style={styles.growthHeaderRow}>
        <Text style={styles.growthTitle}>成長を見る</Text>
        {activities.length > 0 && <Text style={styles.growthSubtitle}>{activities.length}種類のきろく</Text>}
      </View>
      {activities.length === 0 ? (
        <Text style={styles.growthEmptyText}>まだ写真・動画つきのきろくがありません</Text>
      ) : (
        <View style={styles.growthChipsRow}>
          {activities.map((activity) => (
            <Pressable
              key={activity.id}
              style={({ pressed }) => [styles.growthChip, pressed && styles.pressed]}
              onPress={() => onPressOpenTimeline(activity.id)}
            >
              <Text style={styles.growthChipText}>{activity.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function StreakAndHistoryCard({ streak }: { streak: StreakData }) {
  return (
    <View style={styles.card}>
      <View style={styles.streakRow}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakText}>ストリーク：{streak.current}日連続！</Text>
        <Text style={styles.streakBest}>ベスト {streak.best} 日</Text>
      </View>
      <View style={styles.miniCalendarRow}>
        {streak.recentDays.map((day) => {
          const dateObj = new Date(day.date);
          const dayNumber = dateObj.getDate();
          const weekday = weekdayLabels[dateObj.getDay()];
          const active = day.hasSession;
          return (
            <View key={day.date} style={styles.miniCalendarDay}>
              <View style={active ? styles.miniCalendarCircleActive : styles.miniCalendarCircleInactive}>
                <Text style={[styles.miniCalendarDayText, active && styles.miniCalendarDayTextActive]}>
                  {dayNumber}
                </Text>
              </View>
              <Text style={styles.miniCalendarLabelText}>{weekday}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TodayCommentCard({ comment, onPressEditComment }: { comment?: string; onPressEditComment: () => void }) {
  return (
    <Pressable onPress={onPressEditComment} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.sectionHeader, styles.commentHeader]}>
        <Text style={styles.commentTitle}>今日のひとこと（パパ／ママから）</Text>
        <Text style={styles.linkText}>✏️ 編集</Text>
      </View>
      <Text style={comment ? styles.commentBody : styles.commentPlaceholder}>
        {comment ?? '今日の頑張りに一言コメントしてあげましょう'}
      </Text>
    </Pressable>
  );
}

function buildStreakData(
  sessions: TrainingSession[],
  streakInfo: StreakInfo | undefined,
  childId: string
): StreakData {
  const fallback = computeStreaks(sessions, childId);
  const computed = streakInfo ?? {
    current: fallback.currentStreak,
    best: fallback.bestStreak,
    lastSessionDate: undefined,
  };
  return {
    current: computed.current,
    best: computed.best,
    recentDays: buildRecentDays(sessions, childId),
  };
}

function sortNodesByPath(nodes: MapNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.stageIndex !== b.stageIndex) {
      return a.stageIndex - b.stageIndex;
    }
    return a.nodeIndex - b.nodeIndex;
  });
}

function buildMapProgress(nodes: MapNode[]): MapProgress {
  if (nodes.length === 0) {
    return { stageName: getStageName(0), completedNodes: 0, totalNodes: 5 };
  }
  const sorted = sortNodesByPath(nodes);
  const currentStageIndex =
    sorted.find((n) => !n.isCompleted)?.stageIndex ?? sorted[sorted.length - 1].stageIndex;
  const currentStageNodes = sorted.filter((n) => n.stageIndex === currentStageIndex);
  return {
    stageName: getStageName(currentStageIndex),
    completedNodes: currentStageNodes.filter((n) => n.isCompleted).length,
    totalNodes: currentStageNodes.length || 5,
  };
}

function buildTodayQuest(sessions: TrainingSession[], currentNode?: MapNode): TodayQuest {
  const todayKey = toDateKey(new Date());
  const hasSessionToday = sessions.some((s) => toDateKey(new Date(s.date)) === todayKey);
  const total = 1;

  return {
    title: currentNode ? 'いまのマスを すこし進めよう' : 'きょうも なにか うんどうしよう',
    description: currentNode
      ? `トレーニングを1回すると「${getStageName(currentNode.stageIndex)}」のマスが進むよ`
      : undefined,
    completed: hasSessionToday,
    progress: hasSessionToday ? 1 : 0,
    total,
  };
}

function buildRecentDays(sessions: TrainingSession[], childId: string, days = 7) {
  const today = new Date();
  const recent: { date: string; hasSession: boolean }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = toDateKey(date);
    const hasSession = sessions.some(
      (s) => s.childId === childId && toDateKey(new Date(s.date)) === key
    );
    recent.push({ date: key, hasSession });
  }
  return recent;
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

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

const cardBase = {
  backgroundColor: theme.colors.surface,
  borderRadius: theme.radius.md,
  padding: theme.spacing.md,
  marginBottom: theme.spacing.md,
  ...theme.shadows.card,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl + theme.spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  childAvatarText: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  childInfo: {},
  childName: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  childSub: {
    ...theme.typography.label,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  settingsButton: {
    padding: theme.spacing.sm,
    minWidth: 40,
    minHeight: 40,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  settingsIcon: {
    fontSize: 20,
  },
  card: cardBase,
  characterCard: {
    ...cardBase,
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterImageWrap: {
    width: 110,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  characterImage: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainEmoji: {
    fontSize: 44,
  },
  openLink: {
    ...theme.typography.label,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  characterInfo: {
    flex: 1,
  },
  coinBadge: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  coinText: {
    ...theme.typography.label,
    color: '#FFFFFF',
  },
  coinValue: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
  levelText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  levelSubText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  moodLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginRight: theme.spacing.xs,
  },
  moodFaces: {
    flexDirection: 'row',
  },
  moodFace: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  moodFaceActive: {
    backgroundColor: theme.colors.primary,
  },
  moodFaceInactive: {
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  moodFaceText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  moodFaceTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  todayQuestCard: {
    ...cardBase,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  todayQuestCompleted: {
    borderColor: theme.colors.success,
  },
  questBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.lg,
  },
  questBadgeText: {
    ...theme.typography.label,
    color: '#FFFFFF',
  },
  todayQuestTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  todayQuestText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
  },
  todayQuestProgressText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
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
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  mapTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  mapBody: {
    marginBottom: theme.spacing.sm,
  },
  mapProgressText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  mapPath: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  mapNode: {
    width: 18,
    height: 18,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNodeCompleted: {
    backgroundColor: theme.colors.primary,
  },
  mapNodeCurrent: {
    backgroundColor: theme.colors.accent,
  },
  mapNodeLocked: {
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
  },
  mapConnector: {
    height: 4,
    width: 22,
    borderRadius: theme.radius.full,
    marginHorizontal: theme.spacing.xs,
  },
  mapConnectorCompleted: {
    backgroundColor: theme.colors.primary,
  },
  mapConnectorPending: {
    backgroundColor: theme.colors.borderSoft,
  },
  mapOpenText: {
    ...theme.typography.label,
    color: theme.colors.accent,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  badgeTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  badgeCountText: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  badgeIconRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
  },
  badgeIcon: {
    marginRight: theme.spacing.xs,
    fontSize: 20,
  },
  badgeCardFooter: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  badgeMoreText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  growthCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  growthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  growthTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  growthSubtitle: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  growthEmptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  growthChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  growthChip: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  growthChipText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  streakIcon: {
    marginRight: theme.spacing.xs,
  },
  streakText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
    flex: 1,
  },
  streakBest: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  miniCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniCalendarDay: {
    alignItems: 'center',
    flex: 1,
  },
  miniCalendarCircleActive: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  miniCalendarCircleInactive: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  miniCalendarDayText: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
  miniCalendarDayTextActive: {
    color: '#FFFFFF',
  },
  miniCalendarLabelText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  commentHeader: {
    marginBottom: 0,
  },
  commentTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  commentBody: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  commentPlaceholder: {
    ...theme.typography.body,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
  linkText: {
    ...theme.typography.label,
    color: theme.colors.accent,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  modalTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  modalSubtitle: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  modalInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.textMain,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inlineButton: {
    flex: 1,
  },
});
