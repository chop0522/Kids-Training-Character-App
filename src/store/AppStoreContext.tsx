import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid/non-secure';
import {
  Activity,
  AppState,
  Achievement,
  AchievementKey,
  ChildAchievement,
  BrainCharacter,
  CharacterSkin,
  ChildProfile,
  Family,
  Media,
  MediaType,
  MapNode,
  TrainingSession,
} from '../types';
import { loadAppState, saveAppState } from '../storage/appStorage';
import { applyXpToLevel, calculateCoins, calculateXp, EffortLevel } from '../xp';
import { generateInitialMapForChild } from '../mapConfig';
import { ACHIEVEMENTS, getAchievementByKey } from '../achievementsConfig';

export type StreakInfo = {
  current: number;
  best: number;
  lastSessionDate?: string;
};

export type AppStore = {
  children: ChildProfile[];
  activities: Activity[];
  sessions: TrainingSession[];
  streakByChildId: Record<string, StreakInfo>;
  brainCharacters: BrainCharacter[];
  mapNodes: MapNode[];
  childAchievements: ChildAchievement[];
  mediaItems: Media[];

  logTrainingSession: (input: {
    childId: string;
    activityId: string;
    durationMinutes: number;
    effortLevel: EffortLevel;
    note?: string;
  }) => void;
  updateSessionNote: (sessionId: string, note: string) => void;
  getMediaForSession: (sessionId: string) => Media[];
  addMediaToSession: (input: { sessionId: string; type: MediaType; localUri: string }) => void;
  removeMedia: (mediaId: string) => void;

  getChildById: (childId: string) => ChildProfile | undefined;
  getActivitiesForFamily: (familyId: string) => Activity[];
  getSessionsForChild: (childId: string) => TrainingSession[];
  getBrainCharacterForChild: (childId: string) => BrainCharacter | undefined;
  petBrainCharacter: (childId: string) => void;
  feedBrainCharacter: (childId: string) => void;
  setBrainCharacterSkin: (childId: string, skinId: string) => void;
  getMapNodesForChild: (childId: string) => MapNode[];
  getCurrentMapNodeForChild: (childId: string) => MapNode | undefined;
  getAchievementsForChild: (
    childId: string
  ) => { achievement: Achievement; unlocked: boolean; unlockedAt?: string }[];
  getUnlockedAchievementCountForChild: (childId: string) => number;
};

type AppStoreContextValue = AppStore & {
  isLoading: boolean;
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  families: Family[];
  characterSkins: CharacterSkin[];
  addChild: (name: string) => ChildProfile | null;
};

type StoreState = AppState & {
  streakByChildId: Record<string, StreakInfo>;
  mediaItems: Media[];
};

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const loaded = await loadAppState();
      const streakByChildId = buildStreakMap(loaded.sessions, loaded.children);
      let nextState: StoreState = {
        ...loaded,
        mediaItems: loaded.mediaItems ?? loaded.media ?? [],
        media: loaded.mediaItems ?? loaded.media ?? [],
        childAchievements: loaded.childAchievements ?? [],
        streakByChildId,
      };
      nextState = ensureMapsForChildren(nextState);
      setState(nextState);
      setSelectedChildId(nextState.children[0]?.id ?? null);
      if (nextState.mapNodes.length !== loaded.mapNodes.length) {
        persistState(nextState);
      }
      setIsLoading(false);
    })();
  }, []);

  const selectChild = (id: string) => setSelectedChildId(id);

  const addChild = (name: string): ChildProfile | null => {
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

    const newMapNodes = generateInitialMapForChild(newChild.id);

    const defaultSkinId = 'default_pink';
    const newBrain: BrainCharacter = {
      id: nanoid(8),
      childId: newChild.id,
      level: 1,
      xp: 0,
      mood: 80,
      skinId: defaultSkinId,
      createdAt: new Date().toISOString(),
    };

    const updatedState: StoreState = {
      ...state,
      children: [...state.children, newChild],
      mapNodes: [...state.mapNodes, ...newMapNodes],
      brainCharacters: [...state.brainCharacters, newBrain],
      streakByChildId: {
        ...state.streakByChildId,
        [newChild.id]: { current: 0, best: 0, lastSessionDate: undefined },
      },
    };

    setState(updatedState);
    persistState(updatedState);
    setSelectedChildId(newChild.id);
    return newChild;
  };

  const logTrainingSession = (input: {
    childId: string;
    activityId: string;
    durationMinutes: number;
    effortLevel: EffortLevel;
    note?: string;
  }) => {
    setState((prev) => {
      if (!prev) return prev;
      const { childId, activityId, durationMinutes, effortLevel, note } = input;
      const now = new Date();
      const dateTimeIso = now.toISOString();
      const todayDate = dateTimeIso.slice(0, 10);

      const xpGained = calculateXp(durationMinutes, effortLevel);
      const coinsGained = calculateCoins(durationMinutes, effortLevel);

      const newSession: TrainingSession = {
        id: String(Date.now()),
        childId,
        activityId,
        date: dateTimeIso,
        durationMinutes,
        effortLevel,
        xpGained,
        coinsGained,
        note,
      };

      const sessions = [...prev.sessions, newSession];

      const prevStreak = prev.streakByChildId[childId] ?? { current: 0, best: 0, lastSessionDate: undefined };
      let newCurrent = 1;
      if (prevStreak.lastSessionDate === todayDate) {
        newCurrent = prevStreak.current;
      } else if (prevStreak.lastSessionDate) {
        const diffDays = dayDiff(prevStreak.lastSessionDate, todayDate);
        newCurrent = diffDays === 1 ? prevStreak.current + 1 : 1;
      }
      const newBest = Math.max(prevStreak.best, newCurrent);

      const streakByChildId: Record<string, StreakInfo> = {
        ...prev.streakByChildId,
        [childId]: {
          current: newCurrent,
          best: newBest,
          lastSessionDate: todayDate,
        },
      };

      const updatedChildren = prev.children.map((child) => {
        if (child.id !== childId) return child;
        const { level, xp } = applyXpToLevel(child.level, child.xp, xpGained);
        return {
          ...child,
          level,
          xp,
          coins: child.coins + coinsGained,
          totalMinutes: child.totalMinutes + durationMinutes,
          currentStreak: newCurrent,
          bestStreak: Math.max(newBest, child.bestStreak),
        };
      });

      let nextState: StoreState = {
        ...prev,
        children: updatedChildren,
        sessions,
        streakByChildId,
      };

      nextState = ensureMapForChild(nextState, childId);

      const updatedChild = nextState.children.find((c) => c.id === childId);
      const { state: withBrain, character } = ensureBrainCharacterForChild(nextState, childId, prev.characterSkins);

      const updatedCharacter: BrainCharacter = {
        ...character,
        level: updatedChild?.level ?? character.level,
        xp: updatedChild?.xp ?? character.xp,
        mood: Math.min(100, character.mood + 10),
      };

      nextState = {
        ...withBrain,
        brainCharacters: withBrain.brainCharacters.map((brain) =>
          brain.id === updatedCharacter.id ? updatedCharacter : brain
        ),
      };

      nextState = applyTrainingToMap(nextState, childId, xpGained, coinsGained);

      const childAfterMap = nextState.children.find((c) => c.id === childId);
      if (childAfterMap) {
        const syncedBrains = nextState.brainCharacters.map((brain) =>
          brain.childId === childId ? { ...brain, level: childAfterMap.level, xp: childAfterMap.xp } : brain
        );
        nextState = { ...nextState, brainCharacters: syncedBrains };
      }

      nextState = checkAndUnlockAchievementsForChild(nextState, childId);

      persistState(nextState);
      return nextState;
    });
  };

  const updateSessionNote = (sessionId: string, note: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const sessions = prev.sessions.map((s) => (s.id === sessionId ? { ...s, note } : s));
      const nextState: StoreState = { ...prev, sessions };
      persistState(nextState);
      return nextState;
    });
  };

  const getMediaForSession = (sessionId: string) => {
    if (!state) return [];
    return state.mediaItems
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  };

  const addMediaToSession = (input: { sessionId: string; type: MediaType; localUri: string }) => {
    setState((prev) => {
      if (!prev) return prev;
      const { sessionId, type, localUri } = input;
      const itemsForSession = prev.mediaItems.filter((m) => m.sessionId === sessionId);
      const photosCount = itemsForSession.filter((m) => m.type === 'photo').length;
      const videosCount = itemsForSession.filter((m) => m.type === 'video').length;

      if ((type === 'photo' && photosCount >= 4) || (type === 'video' && videosCount >= 2)) {
        return prev;
      }

      const newMedia: Media = {
        id: nanoid(12),
        sessionId,
        type,
        localUri,
        createdAt: new Date().toISOString(),
        order: itemsForSession.length,
      };

      const mediaItems = [...prev.mediaItems, newMedia];
      const nextState: StoreState = { ...prev, mediaItems, media: mediaItems };
      persistState(nextState);
      return nextState;
    });
  };

  const removeMedia = (mediaId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.mediaItems.find((m) => m.id === mediaId);
      if (!target) return prev;

      const filtered = prev.mediaItems.filter((m) => m.id !== mediaId);
      const sameSession = filtered
        .filter((m) => m.sessionId === target.sessionId)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

      const orderMap = new Map<string, number>();
      sameSession.forEach((m, idx) => orderMap.set(m.id, idx));

      const mediaItems = filtered.map((m) => {
        if (!orderMap.has(m.id)) return m;
        const newOrder = orderMap.get(m.id) ?? m.order;
        return newOrder === m.order ? m : { ...m, order: newOrder };
      });

      const nextState: StoreState = { ...prev, mediaItems, media: mediaItems };
      persistState(nextState);
      return nextState;
    });
  };

  const getChildById = (childId: string) => state?.children.find((c) => c.id === childId);
  const getActivitiesForFamily = (familyId: string) =>
    state?.activities.filter((a) => a.familyId === familyId || a.familyId === null) ?? [];
  const getSessionsForChild = (childId: string) => state?.sessions.filter((s) => s.childId === childId) ?? [];
  const getBrainCharacterForChild = (childId: string) => {
    if (!state) return undefined;
    const existing = state.brainCharacters.find((c) => c.childId === childId);
    if (existing) return existing;
    const { state: nextState, character } = ensureBrainCharacterForChild(state, childId, state.characterSkins);
    setState(nextState);
    persistState(nextState);
    return character;
  };

  const getMapNodesForChild = (childId: string) => {
    if (!state) return [];
    return sortNodesByPath(state.mapNodes.filter((n) => n.childId === childId));
  };

  const getCurrentMapNodeForChild = (childId: string) => {
    const nodes = getMapNodesForChild(childId);
    return nodes.find((n) => !n.isCompleted);
  };

  const getAchievementsForChild = (childId: string) => {
    if (!state) return [];
    const unlockedMap = new Map(
      state.childAchievements
        .filter((ca) => ca.childId === childId)
        .map((ca) => [ca.achievementId, ca.unlockedAt])
    );

    return ACHIEVEMENTS.map((achievement) => {
      const unlockedAt = unlockedMap.get(achievement.id);
      return {
        achievement,
        unlocked: Boolean(unlockedAt),
        unlockedAt,
      };
    });
  };

  const getUnlockedAchievementCountForChild = (childId: string) => {
    if (!state) return 0;
    return state.childAchievements.filter((ca) => ca.childId === childId).length;
  };

  const petBrainCharacter = (childId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId, prev.characterSkins);
      const updatedCharacter: BrainCharacter = { ...character, mood: Math.min(100, character.mood + 5) };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      const nextState: StoreState = { ...withBrain, brainCharacters };
      persistState(nextState);
      return nextState;
    });
  };

  const feedBrainCharacter = (childId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const child = prev.children.find((c) => c.id === childId);
      if (!child || child.coins < 10) return prev;

      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId, prev.characterSkins);
      const updatedCharacter: BrainCharacter = { ...character, mood: Math.min(100, character.mood + 20) };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      const updatedChildren = withBrain.children.map((c) =>
        c.id === childId ? { ...c, coins: c.coins - 10 } : c
      );
      const nextState: StoreState = { ...withBrain, children: updatedChildren, brainCharacters };
      persistState(nextState);
      return nextState;
    });
  };

  const setBrainCharacterSkin = (childId: string, skinId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId, prev.characterSkins);
      const updatedCharacter: BrainCharacter = { ...character, skinId };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      const nextState: StoreState = { ...withBrain, brainCharacters };
      persistState(nextState);
      return nextState;
    });
  };

  const value = useMemo<AppStoreContextValue>(() => {
    if (!state) {
      return {
        children: [],
        activities: [],
        sessions: [],
        streakByChildId: {},
        mapNodes: [],
        childAchievements: [],
        mediaItems: [],
        logTrainingSession,
        updateSessionNote,
        getMediaForSession,
        addMediaToSession,
        removeMedia,
        getChildById,
        getActivitiesForFamily,
        getSessionsForChild,
        getBrainCharacterForChild,
        petBrainCharacter,
        feedBrainCharacter,
        setBrainCharacterSkin,
        getMapNodesForChild,
        getCurrentMapNodeForChild,
        getAchievementsForChild,
        getUnlockedAchievementCountForChild,
        isLoading,
        selectedChildId,
        selectChild,
        families: [],
        brainCharacters: [],
        characterSkins: [],
        addChild,
      };
    }
    return {
      children: state.children,
      activities: state.activities,
      sessions: state.sessions,
      streakByChildId: state.streakByChildId,
      childAchievements: state.childAchievements,
      mediaItems: state.mediaItems,
      logTrainingSession,
      updateSessionNote,
      getMediaForSession,
      addMediaToSession,
      removeMedia,
      getChildById,
      getActivitiesForFamily,
      getSessionsForChild,
      getBrainCharacterForChild,
      petBrainCharacter,
      feedBrainCharacter,
      setBrainCharacterSkin,
      getMapNodesForChild,
      getCurrentMapNodeForChild,
      getAchievementsForChild,
      getUnlockedAchievementCountForChild,
      isLoading,
      selectedChildId,
      selectChild,
      families: state.families,
      mapNodes: state.mapNodes,
      brainCharacters: state.brainCharacters,
      characterSkins: state.characterSkins,
      addChild,
    };
  }, [state, isLoading, selectedChildId]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

function persistState(nextState: StoreState) {
  const { streakByChildId: _omit, ...persistable } = nextState;
  const toSave: AppState = {
    ...(persistable as AppState),
    mediaItems: nextState.mediaItems,
    media: nextState.mediaItems,
  };
  saveAppState(toSave).catch(() => {});
}

function ensureMapsForChildren(state: StoreState): StoreState {
  return state.children.reduce((acc, child) => ensureMapForChild(acc, child.id), state);
}

function ensureMapForChild(state: StoreState, childId: string): StoreState {
  const hasNodesForChild = state.mapNodes.some((n) => n.childId === childId);
  if (hasNodesForChild) return state;

  const newNodes = generateInitialMapForChild(childId);
  return {
    ...state,
    mapNodes: [...state.mapNodes, ...newNodes],
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

function applyTrainingToMap(
  state: StoreState,
  childId: string,
  baseXpGained: number,
  baseCoinsGained: number
): StoreState {
  void baseXpGained;
  void baseCoinsGained;

  let nextState = ensureMapForChild(state, childId);

  const nodes = sortNodesByPath(nextState.mapNodes.filter((n) => n.childId === childId));
  const currentNode = nodes.find((n) => !n.isCompleted);
  if (!currentNode) {
    return nextState;
  }

  const updatedNode: MapNode = {
    ...currentNode,
    progress: currentNode.progress + 1,
  };

  let bonusXp = 0;
  let bonusCoins = 0;

  if (updatedNode.progress >= updatedNode.requiredSessions) {
    updatedNode.isCompleted = true;
    updatedNode.progress = updatedNode.requiredSessions;
    bonusXp = updatedNode.rewardXp;
    bonusCoins = updatedNode.rewardCoins;
  }

  const mapNodes = nextState.mapNodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));

  if (bonusXp > 0 || bonusCoins > 0) {
    const children = nextState.children.map((child) => {
      if (child.id !== childId) return child;
      const { level, xp } = applyXpToLevel(child.level, child.xp, bonusXp);
      return {
        ...child,
        level,
        xp,
        coins: child.coins + bonusCoins,
      };
    });

    return {
      ...nextState,
      mapNodes,
      children,
    };
  }

  return {
    ...nextState,
    mapNodes,
  };
}

function checkAndUnlockAchievementsForChild(state: StoreState, childId: string): StoreState {
  const nowIso = new Date().toISOString();

  const child = state.children.find((c) => c.id === childId);
  if (!child) return state;

  const childSessions = state.sessions.filter((s) => s.childId === childId);
  const sessionsCount = childSessions.length;
  const totalMinutes = childSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const streakInfo = state.streakByChildId[childId];

  const mapNodesForChild = state.mapNodes.filter((n) => n.childId === childId);
  const completedNodes = mapNodesForChild.filter((n) => n.isCompleted);
  const stage0Nodes = mapNodesForChild.filter((n) => n.stageIndex === 0);
  const stage0CompletedNodes = stage0Nodes.filter((n) => n.isCompleted);

  const alreadyUnlockedIds = new Set(
    state.childAchievements.filter((ca) => ca.childId === childId).map((ca) => ca.achievementId)
  );

  const toUnlock: AchievementKey[] = [];

  if (sessionsCount >= 1 && !alreadyUnlockedIds.has('first_session')) {
    toUnlock.push('first_session');
  }

  if (sessionsCount >= 10 && !alreadyUnlockedIds.has('sessions_10')) {
    toUnlock.push('sessions_10');
  }

  if (totalMinutes >= 100 && !alreadyUnlockedIds.has('total_minutes_100')) {
    toUnlock.push('total_minutes_100');
  }

  if (streakInfo && streakInfo.current >= 3 && !alreadyUnlockedIds.has('streak_3')) {
    toUnlock.push('streak_3');
  }

  if (streakInfo && streakInfo.current >= 7 && !alreadyUnlockedIds.has('streak_7')) {
    toUnlock.push('streak_7');
  }

  if (completedNodes.length >= 3 && !alreadyUnlockedIds.has('map_nodes_3')) {
    toUnlock.push('map_nodes_3');
  }

  if (
    stage0Nodes.length > 0 &&
    stage0CompletedNodes.length === stage0Nodes.length &&
    !alreadyUnlockedIds.has('map_stage0_complete')
  ) {
    toUnlock.push('map_stage0_complete');
  }

  if (toUnlock.length === 0) {
    return state;
  }

  const newChildAchievements: ChildAchievement[] = toUnlock.map((key) => {
    const achievement = getAchievementByKey(key);
    return {
      id: `${childId}-${achievement.id}`,
      childId,
      achievementId: achievement.id,
      unlockedAt: nowIso,
    };
  });

  return {
    ...state,
    childAchievements: [...state.childAchievements, ...newChildAchievements],
  };
}

function ensureBrainCharacterForChild(
  state: StoreState,
  childId: string,
  skins: CharacterSkin[]
): { state: StoreState; character: BrainCharacter } {
  const existing = state.brainCharacters.find((c) => c.childId === childId);
  if (existing) return { state, character: existing };

  const defaultSkinId = skins[0]?.id ?? 'default_pink';
  const now = new Date().toISOString();
  const character: BrainCharacter = {
    id: `brain-${childId}`,
    childId,
    level: 1,
    xp: 0,
    mood: 70,
    skinId: defaultSkinId,
    createdAt: now,
  };

  const brainCharacters = [...state.brainCharacters, character];
  return {
    state: { ...state, brainCharacters },
    character,
  };
}

function buildStreakMap(sessions: TrainingSession[], children: ChildProfile[]) {
  const streaks: Record<string, StreakInfo> = {};
  children.forEach((child) => {
    streaks[child.id] = computeStreakFromSessions(sessions, child.id);
  });
  return streaks;
}

function computeStreakFromSessions(sessions: TrainingSession[], childId: string): StreakInfo {
  const dates = Array.from(
    new Set(
      sessions
        .filter((s) => s.childId === childId)
        .map((s) => s.date.slice(0, 10))
    )
  ).sort();

  if (dates.length === 0) {
    return { current: 0, best: 0, lastSessionDate: undefined };
  }

  let best = 1;
  let streak = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const diff = dayDiff(dates[i - 1], dates[i]);
    if (diff === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
    best = Math.max(best, streak);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const sortedDesc = [...dates].sort((a, b) => (a > b ? -1 : 1));
  let current = 0;
  let expected = todayKey;
  for (const key of sortedDesc) {
    if (key === expected) {
      current += 1;
      expected = prevDateKey(expected);
    } else if (dayDiff(key, expected) === 1) {
      break;
    } else if (key < expected) {
      break;
    }
  }

  return {
    current,
    best,
    lastSessionDate: dates[dates.length - 1],
  };
}

function prevDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function dayDiff(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
