import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid/non-secure';
import {
  Activity,
  AppState,
  ChildProfile,
  EffortLevel,
  TrainingSession,
} from '../types';
import { loadAppState, saveAppState } from '../storage/appStorage';
import { calculateCoins, calculateXp, computeStreaks, getLevelFromXp } from '../utils/progress';
import { createInitialTreasureState } from '../treasureConfig';
import { fromDateKey } from '../utils/dateKey';
import { getLocalDateKey } from '../utils/sessionUtils';
import { normalizeTags } from '../utils/tagUtils';

type AddTrainingPayload = {
  childId: string;
  activityId: string;
  durationMinutes: number;
  effortLevel: EffortLevel;
  note?: string;
  tags?: string[];
};

type AppDataContextValue = {
  state: AppState | null;
  selectedChildId: string | null;
  isLoading: boolean;
  selectChild: (id: string) => void;
  addTrainingSession: (payload: AddTrainingPayload) => Promise<TrainingSession | null>;
  addChild: (name: string) => Promise<ChildProfile | null>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const starterNodeTypes: Array<'normal' | 'treasure' | 'boss'> = ['normal', 'treasure', 'normal', 'boss'];
const emptyWallet = {
  study: { coins: 0, tickets: 0, ticketProgress: 0, pity: 0 },
  exercise: { coins: 0, tickets: 0, ticketProgress: 0, pity: 0 },
};
const emptyProgress = {
  study: { completedCount: 0 },
  exercise: { completedCount: 0 },
};
const emptyCategoryTrainingCount = {
  study: 0,
  exercise: 0,
};

function normalizeSessions(sessions: TrainingSession[]): TrainingSession[] {
  return sessions.map((session) => {
    const dateKey = session.dateKey ?? getLocalDateKey(new Date(session.date));
    const status = session.status === 'planned' ? 'planned' : 'completed';
    return {
      ...session,
      dateKey,
      date: fromDateKey(dateKey).toISOString(),
      tags: normalizeTags(Array.isArray(session.tags) ? session.tags : []),
      note: typeof session.note === 'string' ? session.note : '',
      status,
      durationMinutes: status === 'planned' ? 0 : session.durationMinutes,
      effortLevel: status === 'planned' ? 0 : session.effortLevel,
      xpGained: status === 'planned' ? 0 : session.xpGained,
      coinsGained: status === 'planned' ? 0 : session.coinsGained,
    };
  });
}

function buildStarterNodes(childId: string) {
  return starterNodeTypes.map((type, index) => ({
    id: nanoid(8),
    childId,
    stageIndex: 0,
    nodeIndex: index,
    type,
    requiredSessions: index === starterNodeTypes.length - 1 ? 3 : 2,
    progress: 0,
    isCompleted: false,
    rewardXp: type === 'boss' ? 200 : 100,
    rewardCoins: type === 'treasure' ? 30 : 10,
  }));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const loaded = await loadAppState();
      const normalizedSessions = normalizeSessions(loaded.sessions ?? []);
      setState({
        ...loaded,
        sessions: normalizedSessions,
        mediaItems: loaded.mediaItems ?? loaded.media ?? [],
        media: loaded.mediaItems ?? loaded.media ?? [],
        wallet: loaded.wallet ?? emptyWallet,
        progress: loaded.progress ?? emptyProgress,
        categoryTrainingCount: loaded.categoryTrainingCount ?? emptyCategoryTrainingCount,
        activeBuddyKeyByChildId: loaded.activeBuddyKeyByChildId ?? {},
        buddyProgressByChildId: loaded.buddyProgressByChildId ?? {},
        discoveredFormIdsByChildId: loaded.discoveredFormIdsByChildId ?? {},
        treasure: loaded.treasure ?? createInitialTreasureState(),
        lastActivityCategory: loaded.lastActivityCategory ?? 'study',
        openedTreasureNodeIds: loaded.openedTreasureNodeIds ?? [],
      });
      if (loaded.children.length > 0) {
        setSelectedChildId(loaded.children[0].id);
      }
      setIsLoading(false);
    })();
  }, []);

  const selectChild = (id: string) => setSelectedChildId(id);

  const persistState = async (nextState: AppState) => {
    setState(nextState);
    await saveAppState(nextState);
  };

  const addChild = async (name: string): Promise<ChildProfile | null> => {
    if (!state || state.families.length === 0) return null;
    const familyId = state.families[0].id;
    const newChild: ChildProfile = {
      id: nanoid(8),
      familyId,
      name,
      avatarType: 'spark',
      xp: 0,
      level: 1,
      coins: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalMinutes: 0,
    };

    const defaultSkinId =
      state.characterSkins.find((skin) => skin.isDefault)?.id ?? state.characterSkins[0]?.id ?? 'boneca_sd_pixel_v2';
    const nextState: AppState = {
      ...state,
      children: [...state.children, newChild],
      mediaItems: state.mediaItems ?? state.media ?? [],
      media: state.media ?? state.mediaItems ?? [],
      brainCharacters: [
        ...state.brainCharacters,
        {
          id: nanoid(8),
          childId: newChild.id,
          level: 1,
          xp: 0,
          mood: 80,
          skinId: defaultSkinId,
          createdAt: new Date().toISOString(),
        },
      ],
      mapNodes: [
        ...state.mapNodes,
        ...buildStarterNodes(newChild.id),
      ],
      activeBuddyKeyByChildId: {
        ...(state.activeBuddyKeyByChildId ?? {}),
        [newChild.id]: defaultSkinId,
      },
      buddyProgressByChildId: {
        ...(state.buddyProgressByChildId ?? {}),
        [newChild.id]: {
          [defaultSkinId]: { level: 1, xp: 0, stageIndex: 0, mood: 80 },
        },
      },
      discoveredFormIdsByChildId: {
        ...(state.discoveredFormIdsByChildId ?? {}),
        [newChild.id]: [defaultSkinId],
      },
      openedTreasureNodeIds: state.openedTreasureNodeIds ?? [],
    };

    await persistState(nextState);
    setSelectedChildId(newChild.id);
    return newChild;
  };

  const addTrainingSession = async (
    payload: AddTrainingPayload
  ): Promise<TrainingSession | null> => {
    if (!state) return null;

    const { childId, activityId, durationMinutes, effortLevel, note, tags } = payload;
    const sessionXp = calculateXp(durationMinutes, effortLevel);
    const sessionCoins = calculateCoins(durationMinutes, effortLevel);
    let mapRewardXp = 0;
    let mapRewardCoins = 0;

    const updatedMapNodes = state.mapNodes.map((node) => {
      if (node.childId !== childId || node.isCompleted) return node;
      if (mapRewardXp > 0 || mapRewardCoins > 0) return node; // reward already given for this save

      const updatedProgress = Math.min(node.progress + 1, node.requiredSessions);
      const isCompleted = updatedProgress >= node.requiredSessions;
      if (isCompleted) {
        mapRewardXp += node.rewardXp;
        mapRewardCoins += node.rewardCoins;
      }

      return { ...node, progress: updatedProgress, isCompleted };
    });

    const totalXpGain = sessionXp + mapRewardXp;
    const totalCoinGain = sessionCoins + mapRewardCoins;

    const sessionTags = normalizeTags(tags);
    const dateKey = getLocalDateKey(new Date());
    const session: TrainingSession = {
      id: nanoid(10),
      childId,
      activityId,
      date: fromDateKey(dateKey).toISOString(),
      dateKey,
      durationMinutes,
      effortLevel,
      xpGained: totalXpGain,
      coinsGained: totalCoinGain,
      tags: sessionTags,
      note: note ?? '',
      status: 'completed',
    };

    const updatedSessions = [session, ...state.sessions];
    const child = state.children.find((c) => c.id === childId);
    if (!child) return null;

    const newXpTotal = child.xp + totalXpGain;
    const { level } = getLevelFromXp(newXpTotal);
    const streakInfo = computeStreaks(updatedSessions, childId);

    const updatedChild: ChildProfile = {
      ...child,
      xp: newXpTotal,
      level,
      coins: child.coins + totalCoinGain,
      totalMinutes: child.totalMinutes + durationMinutes,
      currentStreak: streakInfo.currentStreak,
      bestStreak: Math.max(streakInfo.bestStreak, child.bestStreak),
    };

    const updatedChildren = state.children.map((c) => (c.id === childId ? updatedChild : c));
    const updatedBrainCharacters = state.brainCharacters.map((brain) =>
      brain.childId === childId ? { ...brain, level, xp: newXpTotal, mood: Math.min(100, brain.mood + 5) } : brain
    );
    const activity = state.activities.find((a) => a.id === activityId);
    const lastActivityCategory = activity?.category === 'sports' ? 'exercise' : 'study';
    const treasure = state.treasure ?? createInitialTreasureState();
    const updatedTreasure = { ...treasure, progress: treasure.progress + 1 };
    const categoryTrainingCount = state.categoryTrainingCount ?? emptyCategoryTrainingCount;
    const updatedCategoryTrainingCount = {
      ...categoryTrainingCount,
      [lastActivityCategory]: (categoryTrainingCount[lastActivityCategory] ?? 0) + 1,
    };

    const nextState: AppState = {
      ...state,
      mediaItems: state.mediaItems ?? state.media ?? [],
      media: state.media ?? state.mediaItems ?? [],
      children: updatedChildren,
      sessions: updatedSessions,
      mapNodes: updatedMapNodes,
      brainCharacters: updatedBrainCharacters,
      treasure: updatedTreasure,
      lastActivityCategory,
      categoryTrainingCount: updatedCategoryTrainingCount,
    };

    await persistState(nextState);
    return session;
  };

  const value = useMemo(
    () => ({
      state,
      selectedChildId,
      isLoading,
      selectChild,
      addTrainingSession,
      addChild,
    }),
    [state, selectedChildId, isLoading]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('AppDataContextが見つかりません。AppDataProviderでラップしてください。');
  return ctx;
};
