import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text } from 'react-native';
import { nanoid } from 'nanoid/non-secure';
import {
  Activity,
  AppState,
  Achievement,
  AchievementKey,
  CategoryTrainingCount,
  BuddyActiveByChildId,
  BuddyDiscoveredFormsByChildId,
  BuddyProgress,
  BuddyProgressByChildId,
  ChildAchievement,
  BrainCharacter,
  CharacterSkin,
  ChildProfile,
  Family,
  Media,
  MediaType,
  MapNode,
  OwnedSkin,
  TreasureHistoryItem,
  TreasureKind,
  TreasureReward,
  TreasureState,
  TrainingResult,
  TrainingSession,
  MediaAttachment,
  SessionStatus,
} from '../types';
import { clearPersistedState, loadPersistedState, savePersistedState } from '../storage/appStateStorage';
import { applyXpToLevel, calculateCoins, calculateXp, EffortLevel, getMoodBonus } from '../xp';
import { generateInitialMapForChild } from '../mapConfig';
import { ACHIEVEMENTS, getAchievementByKey } from '../achievementsConfig';
import { CHARACTER_SKINS, getAllSkins, getSkinById } from '../characterSkinsConfig';
import {
  canEvolveBuddy,
  findEvolutionLineByFormId,
  getBuddyForm,
  getNextEvolutionStage,
  getStageIndexByFormId,
} from '../characterEvolutionConfig';
import { createSeedState } from '../storage/seed';
import { deleteFromAppStorageIfOwned } from '../media/localMediaStorage';
import { warnMissingSkinAssets } from '../assets/skinAssetsValidation';
import { createInitialTreasureState, getTreasureKind, getTreasureTargetForIndex } from '../treasureConfig';
import { getCategoryLevelInfoFromCount } from '../categoryLevel';
import { fromDateKey, toDateKey } from '../utils/dateKey';
import { getLocalDateKey, getSessionDateKey, isCompletedSession } from '../utils/sessionUtils';
import { normalizeTags } from '../utils/tagUtils';
import { theme } from '../theme';

export type StreakInfo = {
  current: number;
  best: number;
  lastSessionDate?: string;
};

export type AppStoreState = AppState & {
  streakByChildId: Record<string, StreakInfo>;
  mediaItems: Media[];
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
  ownedSkins: OwnedSkin[];
  settings: AppState['settings'];
  appState: AppStoreState | null;

  logTrainingSession: (input: {
    childId: string;
    activityId: string;
    durationMinutes?: number;
    effortLevel?: EffortLevel;
    status?: SessionStatus;
    dateKey?: string;
    note?: string;
    tags?: string[];
    mediaAttachments?: MediaAttachment[];
    sessionId?: string;
  }) => TrainingResult | null;
  completePlannedSession: (
    sessionId: string,
    input: {
      durationMinutes: number;
      effortLevel: EffortLevel;
      note?: string;
      tags?: string[];
      mediaAttachments?: MediaAttachment[];
    }
  ) => TrainingResult | null;
  updateSessionNote: (sessionId: string, note: string) => void;
  updateSessionTags: (sessionId: string, tags: string[]) => void;
  updateSessionAttachments: (sessionId: string, attachments: MediaAttachment[]) => void;
  deleteTrainingSession: (sessionId: string) => { ok: true } | { ok: false };
  getMediaForSession: (sessionId: string) => Media[];
  addMediaToSession: (input: { sessionId: string; type: MediaType; localUri: string }) =>
    | { ok: true; mediaId: string }
    | { ok: false; reason: 'photo_limit' | 'video_limit' };
  removeMedia: (mediaId: string) => void;

  getChildById: (childId: string) => ChildProfile | undefined;
  getActivitiesForFamily: (familyId: string) => Activity[];
  getSessionsForChild: (childId: string) => TrainingSession[];
  getBrainCharacterForChild: (childId: string) => BrainCharacter | undefined;
  petBrainCharacter: (childId: string) => void;
  feedBrainCharacter: (childId: string) => void;
  setBrainCharacterSkin: (childId: string, skinId: string) => void;
  getActiveBuddyKeyForChild: (childId: string) => string;
  getBuddyProgressForChild: (childId: string, buddyKey: string) => BuddyProgress | undefined;
  setActiveBuddyForChild: (childId: string, buddyKey: string) => void;
  evolveActiveBuddyForChild: (childId: string) => { result: 'ok'; evolvedFormId: string } | { result: 'not_ready' } | { result: 'not_found' };
  openTreasureChest: (input: { childId: string }) =>
    | { result: 'ok'; rewards: TreasureReward[]; kind: TreasureKind; index: number }
    | { result: 'not_ready' }
    | { result: 'not_found' };
  getOwnedSkinsForChild: (childId: string) => CharacterSkin[];
  purchaseSkin: (input: { childId: string; skinId: string }) =>
    | 'ok'
    | 'not_enough_coins'
    | 'already_owned'
    | 'not_found'
    | 'not_available'
    | 'locked';
  rollSkinGacha: (input: { childId: string; category: 'study' | 'exercise' }) =>
    | { result: 'ok'; skin: CharacterSkin; isNew: boolean; duplicateCoins: number; category: 'study' | 'exercise' }
    | { result: 'not_enough_tickets' }
    | { result: 'gacha_disabled' }
    | { result: 'not_available' };
  getMapNodesForChild: (childId: string) => MapNode[];
  getCurrentMapNodeForChild: (childId: string) => MapNode | undefined;
  getAchievementsForChild: (
    childId: string
  ) => { achievement: Achievement; unlocked: boolean; unlockedAt?: string }[];
  getUnlockedAchievementCountForChild: (childId: string) => number;
  updateSettings: (partial: Partial<AppState['settings']>) => void;
  setParentPin: (pin: string) => void;
  importSharedState: (incomingPartialState: Partial<AppStoreState>) => void;
  resetAllData: () => void;
};

type AppStoreContextValue = AppStore & {
  isLoading: boolean;
  isHydrating: boolean;
  isHydrated: boolean;
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  families: Family[];
  characterSkins: CharacterSkin[];
  addChild: (name: string) => ChildProfile | null;
};

type StoreState = AppStoreState;

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

const SAVE_DEBOUNCE_MS = 600;
const DEFAULT_SKIN_ID = CHARACTER_SKINS.find((s) => s.isDefault)?.id ?? CHARACTER_SKINS[0]?.id ?? 'boneca_sd_pixel_v2';
const DEFAULT_BUDDY_KEY = DEFAULT_SKIN_ID;
const SKIN_ID_MIGRATION_MAP: Record<string, string> = {
  brain_default_pink: 'boneca_sd_pixel_v2',
  brain_cool_blue: 'luliloli_sd_pixel',
  brain_green_stamina: 'bonbal_sd_pixel',
  monkey_banana_pixel: 'chinpanzini_sd_pixel',
  boneca_sd_pixel_v2_evo: 'boneca_sd_pixel_v2_evo2',
  luliloli_sd_pixel_evo: 'luliloli_sd_pixel_evo2',
};
const EMPTY_SKIN_WALLET: AppState['wallet'] = {
  study: { coins: 0, tickets: 0, ticketProgress: 0, pity: 0 },
  exercise: { coins: 0, tickets: 0, ticketProgress: 0, pity: 0 },
};
const EMPTY_SKIN_PROGRESS: AppState['progress'] = {
  study: { completedCount: 0 },
  exercise: { completedCount: 0 },
};
const EMPTY_CATEGORY_TRAINING_COUNT: CategoryTrainingCount = {
  study: 0,
  exercise: 0,
};
const EMPTY_BUDDY_PROGRESS: BuddyProgress = {
  level: 1,
  xp: 0,
  stageIndex: 0,
  mood: 80,
};
const SKIN_COINS_PER_ACTIVITY = 10;
const SKIN_TICKET_PROGRESS_PER_TICKET = 3;
const SKIN_GACHA_DUPLICATE_COINS_COMMON = 30;
const SKIN_GACHA_DUPLICATE_COINS_RARE = 60;
const SKIN_GACHA_UNLOCK_LEVEL = 2;
const SKIN_GACHA_PITY_THRESHOLD = 10;
const TREASURE_REWARD_BUDDY_XP_RANGE: [number, number] = [20, 50];
const TREASURE_REWARD_COINS_SMALL: [number, number] = [80, 120];
const TREASURE_REWARD_COINS_MEDIUM: [number, number] = [120, 180];
const TREASURE_REWARD_COINS_LARGE: [number, number] = [150, 250];
const TREASURE_REWARD_TICKETS_MEDIUM_CHANCE = 0.5;
const TREASURE_REWARD_TICKETS_MEDIUM_AMOUNT = 1;
const TREASURE_REWARD_TICKETS_LARGE_AMOUNT = 1;
const DEFAULT_SESSION_STATUS: SessionStatus = 'completed';

type LogTrainingInput = {
  childId: string;
  activityId: string;
  durationMinutes?: number;
  effortLevel?: EffortLevel;
  status?: SessionStatus;
  dateKey?: string;
  note?: string;
  tags?: string[];
  mediaAttachments?: MediaAttachment[];
  sessionId?: string;
};

type CompletePlannedInput = {
  durationMinutes: number;
  effortLevel: EffortLevel;
  note?: string;
  tags?: string[];
  mediaAttachments?: MediaAttachment[];
};

type ApplyCompletedSessionInput = {
  childId: string;
  activityId: string;
  durationMinutes: number;
  effortLevel: EffortLevel;
  note?: string;
  tags?: string[];
  mediaAttachments?: MediaAttachment[];
  sessionId: string;
  dateKey: string;
};

type ApplyCompletedSessionResult = {
  nextState: StoreState;
  trainingResult: TrainingResult;
};

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const isLoading = isHydrating;
  const isHydrated = !isHydrating;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedRef = useRef(false);
  const hasWarnedSkinAssetsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initialState = buildStoreState(createSeedState());
      const loaded = await loadPersistedState<StoreState>();
      if (cancelled) return;

      let nextState = initialState;
      if (loaded?.state) {
        nextState = mergeWithInitialState(initialState, loaded.state);
      }
      nextState = ensureMapsForChildren(nextState);
      setState(nextState);
      setSelectedChildId(nextState.children[0]?.id ?? null);
      setIsHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isHydrating || !state) return;

    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void savePersistedState(state);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, isHydrating]);

  useEffect(() => {
    if (!__DEV__ || isHydrating || !state || hasWarnedSkinAssetsRef.current) return;
    hasWarnedSkinAssetsRef.current = true;
    warnMissingSkinAssets(state.settings.enableMemeSkins);
  }, [isHydrating, state]);

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

    const defaultSkins = state.characterSkins.filter((skin) => skin.unlockMethod === 'default');
    const defaultSkinId =
      defaultSkins.find((s) => s.isDefault)?.id ?? defaultSkins[0]?.id ?? state.characterSkins[0]?.id ?? DEFAULT_SKIN_ID;
    const newBrain: BrainCharacter = {
      id: nanoid(8),
      childId: newChild.id,
      level: 1,
      xp: 0,
      mood: 80,
      skinId: defaultSkinId,
      createdAt: new Date().toISOString(),
    };
    const newOwnedSkins: OwnedSkin[] = defaultSkins.length
      ? defaultSkins.map((skin) => ({ childId: newChild.id, skinId: skin.id }))
      : defaultSkinId
        ? [{ childId: newChild.id, skinId: defaultSkinId }]
        : [];
    const newBuddyProgress = newOwnedSkins.reduce<Record<string, BuddyProgress>>((acc, owned) => {
      acc[owned.skinId] = buildDefaultBuddyProgress();
      return acc;
    }, {});
    const discoveredForms = newOwnedSkins.map((owned) => getBuddyForm(owned.skinId, 0).formId);

    const updatedState: StoreState = {
      ...state,
      children: [...state.children, newChild],
      mapNodes: [...state.mapNodes, ...newMapNodes],
      brainCharacters: [...state.brainCharacters, newBrain],
      ownedSkins: newOwnedSkins.length ? [...state.ownedSkins, ...newOwnedSkins] : state.ownedSkins,
      activeBuddyKeyByChildId: {
        ...state.activeBuddyKeyByChildId,
        [newChild.id]: defaultSkinId,
      },
      buddyProgressByChildId: {
        ...state.buddyProgressByChildId,
        [newChild.id]: newBuddyProgress,
      },
      discoveredFormIdsByChildId: {
        ...state.discoveredFormIdsByChildId,
        [newChild.id]: discoveredForms,
      },
      streakByChildId: {
        ...state.streakByChildId,
        [newChild.id]: { current: 0, best: 0, lastSessionDate: undefined },
      },
    };

    setState(updatedState);
    setSelectedChildId(newChild.id);
    return newChild;
  };

  const logTrainingSession = (input: LogTrainingInput): TrainingResult | null => {
    let result: TrainingResult | null = null;
    setState((prev) => {
      if (!prev) return prev;
      const status: SessionStatus = input.status === 'planned' ? 'planned' : DEFAULT_SESSION_STATUS;
      const dateKey = normalizeDateKey(input.dateKey);
      const sessionId = input.sessionId ?? String(Date.now());

      if (status === 'planned') {
        const plannedSession: TrainingSession = {
          id: sessionId,
          childId: input.childId,
          activityId: input.activityId,
          dateKey,
          date: toSessionIsoFromDateKey(dateKey),
          durationMinutes: 0,
          effortLevel: 0,
          xpGained: 0,
          coinsGained: 0,
          mediaAttachments: normalizeAttachments(input.mediaAttachments),
          tags: normalizeTags(input.tags),
          status: 'planned',
          note: normalizeSessionNote(input.note),
        };
        const hasExisting = prev.sessions.some((session) => session.id === sessionId);
        const sessions = hasExisting
          ? prev.sessions.map((session) => (session.id === sessionId ? plannedSession : session))
          : [...prev.sessions, plannedSession];
        return { ...prev, sessions };
      }

      const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
      const effortLevel = normalizeCompletedEffortLevel(input.effortLevel);
      if (durationMinutes <= 0 || !effortLevel) return prev;

      const applied = applyCompletedSession(prev, {
        childId: input.childId,
        activityId: input.activityId,
        durationMinutes,
        effortLevel,
        note: input.note,
        tags: input.tags,
        mediaAttachments: input.mediaAttachments,
        sessionId,
        dateKey,
      });
      if (!applied) return prev;
      result = applied.trainingResult;
      return applied.nextState;
    });
    return result;
  };

  const completePlannedSession = (
    sessionId: string,
    input: CompletePlannedInput
  ): TrainingResult | null => {
    let result: TrainingResult | null = null;
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.sessions.find((session) => session.id === sessionId);
      if (!target || target.status !== 'planned') return prev;

      const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
      const effortLevel = normalizeCompletedEffortLevel(input.effortLevel);
      if (durationMinutes <= 0 || !effortLevel) return prev;

      const applied = applyCompletedSession(prev, {
        childId: target.childId,
        activityId: target.activityId,
        durationMinutes,
        effortLevel,
        note: input.note ?? target.note,
        tags: input.tags ?? target.tags,
        mediaAttachments: input.mediaAttachments ?? target.mediaAttachments,
        sessionId: target.id,
        dateKey: getSessionDateKey(target),
      });
      if (!applied) return prev;
      result = applied.trainingResult;
      return applied.nextState;
    });
    return result;
  };

  const updateSessionNote = (sessionId: string, note: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const sessions = prev.sessions.map((s) => (s.id === sessionId ? { ...s, note } : s));
      const nextState: StoreState = { ...prev, sessions };
      return nextState;
    });
  };

  const updateSessionTags = (sessionId: string, tags: string[]) => {
    const normalized = normalizeTags(tags);
    setState((prev) => {
      if (!prev) return prev;
      const sessions = prev.sessions.map((s) => (s.id === sessionId ? { ...s, tags: normalized } : s));
      const nextState: StoreState = { ...prev, sessions };
      return nextState;
    });
  };

  const updateSessionAttachments = (sessionId: string, attachments: MediaAttachment[]) => {
    const normalized = normalizeAttachments(attachments);
    setState((prev) => {
      if (!prev) return prev;
      const sessions = prev.sessions.map((s) =>
        s.id === sessionId ? { ...s, mediaAttachments: normalized } : s
      );
      const nextState: StoreState = { ...prev, sessions };
      return nextState;
    });
  };

  const getMediaForSession = (sessionId: string) => {
    if (!state) return [];
    const session = state.sessions.find((s) => s.id === sessionId);
    if (session?.mediaAttachments && session.mediaAttachments.length > 0) {
      return mapAttachmentsToMedia(session.mediaAttachments, sessionId);
    }
    return state.mediaItems
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  };

  const addMediaToSession = (input: { sessionId: string; type: MediaType; localUri: string }) => {
    const { type } = input;
    let response:
      | { ok: true; mediaId: string }
      | { ok: false; reason: 'photo_limit' | 'video_limit' } = {
      ok: false,
      reason: type === 'photo' ? 'photo_limit' : 'video_limit',
    };

    setState((prev) => {
      if (!prev) return prev;
      const { sessionId, type: nextType, localUri } = input;
      const itemsForSession = prev.mediaItems.filter((m) => m.sessionId === sessionId);
      const photosCount = itemsForSession.filter((m) => m.type === 'photo').length;
      const videosCount = itemsForSession.filter((m) => m.type === 'video').length;

      if (nextType === 'photo' && photosCount >= 4) {
        response = { ok: false, reason: 'photo_limit' };
        return prev;
      }

      if (nextType === 'video' && videosCount >= 2) {
        response = { ok: false, reason: 'video_limit' };
        return prev;
      }

      const newMedia: Media = {
        id: nanoid(12),
        sessionId,
        type: nextType,
        localUri,
        createdAt: new Date().toISOString(),
        order: itemsForSession.length,
      };

      const mediaItems = [...prev.mediaItems, newMedia];
      const nextState: StoreState = { ...prev, mediaItems, media: mediaItems };
      response = { ok: true, mediaId: newMedia.id };
      return nextState;
    });

    return response;
  };

  const removeMedia = (mediaId: string) => {
    let removedUri: string | null = null;
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.mediaItems.find((m) => m.id === mediaId);
      if (!target) return prev;
      removedUri = target.localUri;

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
      return nextState;
    });
    if (removedUri) {
      deleteFromAppStorageIfOwned(removedUri).catch(() => {});
    }
  };

  const getChildById = (childId: string) => state?.children.find((c) => c.id === childId);
  const getActivitiesForFamily = (familyId: string) =>
    state?.activities.filter((a) => a.familyId === familyId || a.familyId === null) ?? [];
  const getSessionsForChild = (childId: string) => state?.sessions.filter((s) => s.childId === childId) ?? [];
  const getBrainCharacterForChild = (childId: string) => {
    if (!state) return undefined;
    const existing = state.brainCharacters.find((c) => c.childId === childId);
    if (existing) return existing;
    const { state: nextState, character } = ensureBrainCharacterForChild(state, childId);
    setState(nextState);
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
      const activeBuddyKey = getActiveBuddyKey(prev, childId);
      const progress = getBuddyProgress(prev, childId, activeBuddyKey);
      const updatedProgress = { ...progress, mood: Math.min(100, progress.mood + 5) };
      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId);
      const updatedCharacter: BrainCharacter = {
        ...character,
        level: updatedProgress.level,
        xp: updatedProgress.xp,
        mood: updatedProgress.mood,
        skinId: activeBuddyKey,
      };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      const buddyProgressByChildId = {
        ...withBrain.buddyProgressByChildId,
        [childId]: {
          ...(withBrain.buddyProgressByChildId[childId] ?? {}),
          [activeBuddyKey]: updatedProgress,
        },
      };
      const nextState: StoreState = {
        ...withBrain,
        brainCharacters,
        buddyProgressByChildId,
        activeBuddyKeyByChildId: {
          ...withBrain.activeBuddyKeyByChildId,
          [childId]: activeBuddyKey,
        },
      };
      return nextState;
    });
  };

  const feedBrainCharacter = (childId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const child = prev.children.find((c) => c.id === childId);
      if (!child || child.coins < 10) return prev;

      const activeBuddyKey = getActiveBuddyKey(prev, childId);
      const progress = getBuddyProgress(prev, childId, activeBuddyKey);
      const updatedProgress = { ...progress, mood: Math.min(100, progress.mood + 20) };
      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId);
      const updatedCharacter: BrainCharacter = {
        ...character,
        level: updatedProgress.level,
        xp: updatedProgress.xp,
        mood: updatedProgress.mood,
        skinId: activeBuddyKey,
      };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      const updatedChildren = withBrain.children.map((c) =>
        c.id === childId ? { ...c, coins: c.coins - 10 } : c
      );
      const buddyProgressByChildId = {
        ...withBrain.buddyProgressByChildId,
        [childId]: {
          ...(withBrain.buddyProgressByChildId[childId] ?? {}),
          [activeBuddyKey]: updatedProgress,
        },
      };
      const nextState: StoreState = {
        ...withBrain,
        children: updatedChildren,
        brainCharacters,
        buddyProgressByChildId,
        activeBuddyKeyByChildId: {
          ...withBrain.activeBuddyKeyByChildId,
          [childId]: activeBuddyKey,
        },
      };
      return nextState;
    });
  };

  const setBrainCharacterSkin = (childId: string, skinId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const owned = getOwnedSkinsForChildInternal(prev, childId);
      const allowed = owned.some((s) => s.id === skinId);
      if (!allowed) return prev;
      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId);
      const prevChildProgress = withBrain.buddyProgressByChildId[childId] ?? {};
      const stageIndex = getStageIndexByFormId(skinId) ?? 0;
      const progress = prevChildProgress[skinId] ?? buildDefaultBuddyProgress({ stageIndex });
      const updatedCharacter: BrainCharacter = {
        ...character,
        level: progress.level,
        xp: progress.xp,
        mood: progress.mood,
        skinId,
      };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      const buddyProgressByChildId = {
        ...withBrain.buddyProgressByChildId,
        [childId]: {
          ...prevChildProgress,
          [skinId]: progress,
        },
      };
      const discoveredSet = new Set(withBrain.discoveredFormIdsByChildId?.[childId] ?? []);
      const line = findEvolutionLineByFormId(skinId);
      const currentForm = getBuddyForm(skinId, progress.stageIndex);
      if (line) {
        const baseFormId = line.stages[0]?.formId;
        if (baseFormId) discoveredSet.add(baseFormId);
      }
      discoveredSet.add(currentForm.formId);
      const discoveredFormIdsByChildId = {
        ...withBrain.discoveredFormIdsByChildId,
        [childId]: Array.from(discoveredSet),
      };
      const nextState: StoreState = {
        ...withBrain,
        brainCharacters,
        buddyProgressByChildId,
        activeBuddyKeyByChildId: {
          ...withBrain.activeBuddyKeyByChildId,
          [childId]: skinId,
        },
        discoveredFormIdsByChildId,
      };
      return nextState;
    });
  };

  const getActiveBuddyKeyForChild = (childId: string) => {
    if (!state) return DEFAULT_BUDDY_KEY;
    return getActiveBuddyKey(state, childId);
  };

  const getBuddyProgressForChild = (childId: string, buddyKey: string) => {
    if (!state) return undefined;
    return getBuddyProgress(state, childId, buddyKey);
  };

  const setActiveBuddyForChild = (childId: string, buddyKey: string) => {
    setBrainCharacterSkin(childId, buddyKey);
  };

  const evolveActiveBuddyForChild = (childId: string) => {
    let response:
      | { result: 'ok'; evolvedFormId: string }
      | { result: 'not_ready' }
      | { result: 'not_found' } = { result: 'not_found' };
    setState((prev) => {
      if (!prev) return prev;
      const activeBuddyKey = getActiveBuddyKey(prev, childId);
      const progress = getBuddyProgress(prev, childId, activeBuddyKey);
      const nextStage = getNextEvolutionStage(activeBuddyKey, progress);
      if (!nextStage) {
        response = { result: 'not_found' };
        return prev;
      }
      if (!canEvolveBuddy(activeBuddyKey, progress)) {
        response = { result: 'not_ready' };
        return prev;
      }
      const fromFormId = activeBuddyKey;
      const toFormId = nextStage.formId;
      const updatedProgress: BuddyProgress = {
        ...progress,
        stageIndex: nextStage.stageIndex,
      };
      const prevChildProgress = prev.buddyProgressByChildId[childId] ?? {};
      const { [fromFormId]: _, ...restProgress } = prevChildProgress;
      const buddyProgressByChildId = {
        ...prev.buddyProgressByChildId,
        [childId]: {
          ...restProgress,
          [toFormId]: updatedProgress,
        },
      };
      const ownedSkins = prev.ownedSkins.filter(
        (owned) => !(owned.childId === childId && owned.skinId === fromFormId)
      );
      const hasEvolved = ownedSkins.some((owned) => owned.childId === childId && owned.skinId === toFormId);
      const nextOwnedSkins = hasEvolved ? ownedSkins : [...ownedSkins, { childId, skinId: toFormId }];
      const discoveredSet = new Set(prev.discoveredFormIdsByChildId?.[childId] ?? []);
      discoveredSet.add(fromFormId);
      discoveredSet.add(toFormId);
      const discoveredFormIdsByChildId = {
        ...prev.discoveredFormIdsByChildId,
        [childId]: Array.from(discoveredSet),
      };
      const { state: withBrain, character } = ensureBrainCharacterForChild(prev, childId);
      const updatedCharacter: BrainCharacter = {
        ...character,
        level: updatedProgress.level,
        xp: updatedProgress.xp,
        mood: updatedProgress.mood,
        skinId: toFormId,
      };
      const brainCharacters = withBrain.brainCharacters.map((c) =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      );
      response = { result: 'ok', evolvedFormId: toFormId };
      return {
        ...withBrain,
        brainCharacters,
        buddyProgressByChildId,
        ownedSkins: nextOwnedSkins,
        discoveredFormIdsByChildId,
        activeBuddyKeyByChildId: {
          ...withBrain.activeBuddyKeyByChildId,
          [childId]: toFormId,
        },
      };
    });
    return response;
  };

  const deleteTrainingSession = (sessionId: string): { ok: true } | { ok: false } => {
    let response: { ok: true } | { ok: false } = { ok: false };
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.sessions.find((session) => session.id === sessionId);
      if (!target) return prev;
      const nextSessions = prev.sessions.filter((session) => session.id !== sessionId);
      const childId = target.childId;
      const attachments = normalizeAttachments(target.mediaAttachments);
      attachments.forEach((attachment) => {
        void deleteFromAppStorageIfOwned(attachment.uri);
      });
      const mediaItems = prev.mediaItems.filter((item) => item.sessionId !== sessionId);

      if (target.status === 'planned') {
        response = { ok: true };
        return {
          ...prev,
          sessions: nextSessions,
          mediaItems,
          media: mediaItems,
        };
      }

      const skinCategory = target.skinCategory ?? 'study';
      const categoryTrainingCount = normalizeCategoryTrainingCount(prev.categoryTrainingCount);
      if (skinCategory) {
        categoryTrainingCount[skinCategory] = Math.max(0, categoryTrainingCount[skinCategory] - 1);
      }
      const progress = normalizeProgress(prev.progress);
      if (skinCategory) {
        progress[skinCategory].completedCount = Math.max(0, progress[skinCategory].completedCount - 1);
      }

      const wallet = normalizeWallet(prev.wallet);
      const walletCategory = wallet[skinCategory];
      const walletCoinsDelta = target.walletCoinsDelta ?? 0;
      const walletTicketsDelta = target.walletTicketsDelta ?? 0;
      const walletTicketProgressDelta = target.walletTicketProgressDelta ?? 0;
      const updatedWalletCategory = {
        ...walletCategory,
        coins: Math.max(0, walletCategory.coins - walletCoinsDelta),
        tickets: Math.max(0, walletCategory.tickets - walletTicketsDelta),
        ticketProgress: clampNumber(
          walletCategory.ticketProgress - walletTicketProgressDelta,
          0,
          SKIN_TICKET_PROGRESS_PER_TICKET - 1
        ),
      };
      const updatedWallet: AppState['wallet'] = { ...wallet, [skinCategory]: updatedWalletCategory };

      const treasure = normalizeTreasure(prev.treasure);
      const treasureDelta = target.treasureProgressDelta ?? 1;
      const updatedTreasure: TreasureState = {
        ...treasure,
        progress: Math.max(0, treasure.progress - treasureDelta),
      };

      const buddyKey = target.buddyKey ?? getActiveBuddyKey(prev, childId);
      const prevBuddyProgress = getBuddyProgress(prev, childId, buddyKey);
      const reducedBuddy = removeXpFromLevel(prevBuddyProgress.level, prevBuddyProgress.xp, target.xpGained ?? 0);
      const updatedBuddyProgress: BuddyProgress = {
        ...prevBuddyProgress,
        level: reducedBuddy.level,
        xp: reducedBuddy.xp,
      };
      const buddyProgressByChildId = {
        ...prev.buddyProgressByChildId,
        [childId]: {
          ...(prev.buddyProgressByChildId[childId] ?? {}),
          [buddyKey]: updatedBuddyProgress,
        },
      };

      const activeBuddyKey = getActiveBuddyKey(prev, childId);
      const activeProgress = buddyProgressByChildId[childId]?.[activeBuddyKey] ?? updatedBuddyProgress;
      const children = prev.children.map((child) => {
        if (child.id !== childId) return child;
        return {
          ...child,
          level: activeProgress.level,
          xp: activeProgress.xp,
          coins: Math.max(0, child.coins - (target.coinsGained ?? 0)),
          totalMinutes: Math.max(0, child.totalMinutes - target.durationMinutes),
        };
      });
      const brainCharacters = prev.brainCharacters.map((brain) => {
        if (brain.childId !== childId) return brain;
        return {
          ...brain,
          level: activeProgress.level,
          xp: activeProgress.xp,
          skinId: activeBuddyKey,
        };
      });

      const streakByChildId = buildStreakMap(nextSessions, prev.children);

      response = { ok: true };
      return {
        ...prev,
        sessions: nextSessions,
        mediaItems,
        media: mediaItems,
        wallet: updatedWallet,
        progress,
        categoryTrainingCount,
        treasure: updatedTreasure,
        buddyProgressByChildId,
        children,
        brainCharacters,
        streakByChildId,
      };
    });
    return response;
  };

  const openTreasureChest = (input: { childId: string }) => {
    let response:
      | { result: 'ok'; rewards: TreasureReward[]; kind: TreasureKind; index: number }
      | { result: 'not_ready' }
      | { result: 'not_found' } = { result: 'not_found' };
    setState((prev) => {
      if (!prev) return prev;
      const child = prev.children.find((c) => c.id === input.childId);
      if (!child) {
        response = { result: 'not_found' };
        return prev;
      }
      const treasure = normalizeTreasure(prev.treasure);
      if (treasure.progress < treasure.target) {
        response = { result: 'not_ready' };
        return prev;
      }
      const kind = getTreasureKind(treasure.chestIndex);
      const category = prev.lastActivityCategory ?? 'study';
      const { rewards, coins, tickets, buddyXp } = rollTreasureRewards(kind, category);
      const historyItem: TreasureHistoryItem = {
        index: treasure.chestIndex,
        openedAtISO: new Date().toISOString(),
        kind,
        rewards,
      };
      const nextTreasure: TreasureState = {
        chestIndex: treasure.chestIndex + 1,
        progress: Math.max(0, treasure.progress - treasure.target),
        target: getTreasureTargetForIndex(treasure.chestIndex + 1),
        history: [historyItem, ...treasure.history],
      };
      const wallet = normalizeWallet(prev.wallet);
      const walletCategory = wallet[category];
      const updatedWallet = {
        ...wallet,
        [category]: {
          ...walletCategory,
          coins: walletCategory.coins + coins,
          tickets: walletCategory.tickets + tickets,
        },
      };
      const activeBuddyKey = getActiveBuddyKey(prev, input.childId);
      const prevBuddyProgress = getBuddyProgress(prev, input.childId, activeBuddyKey);
      const buddyUpdated = applyXpToLevel(prevBuddyProgress.level, prevBuddyProgress.xp, buddyXp);
      const updatedBuddyProgress: BuddyProgress = {
        ...prevBuddyProgress,
        level: buddyUpdated.level,
        xp: buddyUpdated.xp,
      };
      const buddyProgressByChildId = {
        ...prev.buddyProgressByChildId,
        [input.childId]: {
          ...(prev.buddyProgressByChildId[input.childId] ?? {}),
          [activeBuddyKey]: updatedBuddyProgress,
        },
      };
      const activeBuddyKeyByChildId = {
        ...prev.activeBuddyKeyByChildId,
        [input.childId]: activeBuddyKey,
      };
      const children = prev.children.map((c) => {
        if (c.id !== input.childId) return c;
        return {
          ...c,
          level: updatedBuddyProgress.level,
          xp: updatedBuddyProgress.xp,
        };
      });
      const brainCharacters = prev.brainCharacters.map((brain) => {
        if (brain.childId !== input.childId) return brain;
        return {
          ...brain,
          level: updatedBuddyProgress.level,
          xp: updatedBuddyProgress.xp,
          mood: updatedBuddyProgress.mood,
          skinId: activeBuddyKey,
        };
      });
      response = { result: 'ok', rewards, kind, index: treasure.chestIndex };
      return {
        ...prev,
        treasure: nextTreasure,
        wallet: updatedWallet,
        buddyProgressByChildId,
        activeBuddyKeyByChildId,
        children,
        brainCharacters,
      };
    });
    return response;
  };

  const importSharedState = (incomingPartialState: Partial<AppStoreState>) => {
    if (!state) return;
    const currentPin = state.settings?.parentPin;
    const initialState = buildStoreState(createSeedState());
    let merged = mergeWithInitialState(initialState, incomingPartialState as Partial<StoreState>);
    merged = ensureMapsForChildren(merged);
    const nextState: StoreState = {
      ...merged,
      settings: {
        ...merged.settings,
        parentPin: currentPin ?? merged.settings?.parentPin,
      },
    };
    setState(nextState);
    setSelectedChildId(nextState.children[0]?.id ?? null);
    savePersistedState(nextState).catch(() => {});
  };

  const resetAllData = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    clearPersistedState().catch(() => {});
    const nextState = buildStoreState(createSeedState());
    setState(nextState);
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
        ownedSkins: [],
        settings: { enableMemeSkins: false, enableGacha: true, parentPin: undefined },
        appState: null,
        logTrainingSession,
        completePlannedSession: () => null,
        updateSessionNote,
        updateSessionTags,
        updateSessionAttachments,
        deleteTrainingSession,
        getMediaForSession,
        addMediaToSession: ({ type }) => ({
          ok: false,
          reason: type === 'photo' ? 'photo_limit' : 'video_limit',
        }),
        removeMedia,
        getChildById,
        getActivitiesForFamily,
        getSessionsForChild,
        getBrainCharacterForChild,
        petBrainCharacter,
        feedBrainCharacter,
        setBrainCharacterSkin,
        getActiveBuddyKeyForChild: () => DEFAULT_BUDDY_KEY,
        getBuddyProgressForChild: () => undefined,
        setActiveBuddyForChild: () => {},
        evolveActiveBuddyForChild: () => ({ result: 'not_found' }),
        openTreasureChest: (_input) => ({ result: 'not_found' }),
        getOwnedSkinsForChild: () => [],
        purchaseSkin: () => 'not_found',
        rollSkinGacha: () => ({ result: 'gacha_disabled' }),
        getMapNodesForChild,
        getCurrentMapNodeForChild,
        getAchievementsForChild,
        getUnlockedAchievementCountForChild,
        updateSettings: () => {},
        setParentPin: () => {},
        importSharedState: () => {},
        resetAllData: () => {},
        isLoading,
        isHydrating,
        isHydrated,
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
      ownedSkins: state.ownedSkins,
      settings: state.settings,
      appState: state,
      logTrainingSession,
      completePlannedSession,
      updateSessionNote,
      updateSessionTags,
      updateSessionAttachments,
      deleteTrainingSession,
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
      getActiveBuddyKeyForChild,
      getBuddyProgressForChild,
      setActiveBuddyForChild,
      evolveActiveBuddyForChild,
      openTreasureChest,
      getOwnedSkinsForChild: (childId: string) => getOwnedSkinsForChildInternal(state, childId),
      purchaseSkin: (input) => purchaseSkinInternal(input, setState),
      rollSkinGacha: (input) => rollSkinGachaInternal(input, setState),
      getMapNodesForChild,
      getCurrentMapNodeForChild,
      getAchievementsForChild,
      getUnlockedAchievementCountForChild,
      updateSettings: (partial) => updateSettingsInternal(partial, setState),
      setParentPin: (pin) => updateSettingsInternal({ parentPin: pin }, setState),
      importSharedState,
      resetAllData,
      isLoading,
      isHydrating,
      isHydrated,
      selectedChildId,
      selectChild,
      families: state.families,
      mapNodes: state.mapNodes,
      brainCharacters: state.brainCharacters,
      characterSkins: state.characterSkins,
      addChild,
    };
  }, [state, isHydrating, selectedChildId]);

  if (isHydrating) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.textMain }}>Loading data...</Text>
      </SafeAreaView>
    );
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

function buildStoreState(appState: AppState): StoreState {
  const mediaItems = appState.mediaItems ?? appState.media ?? [];
  const sessions = normalizeSessions(appState.sessions ?? []);
  const buddyState = normalizeBuddyState({
    activeBuddyKeyByChildId: appState.activeBuddyKeyByChildId,
    buddyProgressByChildId: appState.buddyProgressByChildId,
    discoveredFormIdsByChildId: appState.discoveredFormIdsByChildId,
    brainCharacters: appState.brainCharacters,
    children: appState.children ?? [],
    ownedSkins: appState.ownedSkins ?? [],
  });
  const fallbackCounts =
    appState.categoryTrainingCount ??
    (appState.progress
      ? {
          study: appState.progress.study?.completedCount ?? 0,
          exercise: appState.progress.exercise?.completedCount ?? 0,
        }
      : undefined) ??
    buildCategoryTrainingCountFromSessions(sessions, appState.activities ?? []);
  const categoryTrainingCount = normalizeCategoryTrainingCount(fallbackCounts);
  const built: StoreState = {
    ...appState,
    mediaItems,
    media: mediaItems,
    sessions,
    childAchievements: appState.childAchievements ?? [],
    ownedSkins: appState.ownedSkins ?? [],
    settings: {
      enableMemeSkins: appState.settings?.enableMemeSkins ?? false,
      enableGacha: appState.settings?.enableGacha ?? true,
      parentPin: appState.settings?.parentPin,
    },
    characterSkins: CHARACTER_SKINS,
    wallet: normalizeWallet(appState.wallet),
    progress: normalizeProgress(appState.progress),
    categoryTrainingCount,
    activeBuddyKeyByChildId: buddyState.activeBuddyKeyByChildId,
    buddyProgressByChildId: buddyState.buddyProgressByChildId,
    discoveredFormIdsByChildId: buddyState.discoveredFormIdsByChildId,
    treasure: normalizeTreasure(appState.treasure),
    lastActivityCategory: appState.lastActivityCategory ?? 'study',
    openedTreasureNodeIds: normalizeOpenedTreasureNodeIds(appState.openedTreasureNodeIds),
    streakByChildId: buildStreakMap(sessions, appState.children ?? []),
  };
  return {
    ...built,
    brainCharacters: syncBrainCharactersWithBuddy(built),
  };
}

function mergeWithInitialState(initial: StoreState, loaded: Partial<StoreState>): StoreState {
  const migrated = migrateSkinState(loaded);
  const mediaItems = migrated.mediaItems ?? migrated.media ?? initial.mediaItems;
  const settings = {
    ...initial.settings,
    ...(migrated.settings ?? {}),
  };
  const characterSkins = initial.characterSkins;
  const childAchievements = migrated.childAchievements ?? initial.childAchievements;
  const sessions = normalizeSessions(migrated.sessions ?? initial.sessions);
  const children = migrated.children ?? initial.children;
  const ownedSkins = ensureDefaultOwnedSkins(migrated.ownedSkins ?? initial.ownedSkins, children);
  const streakByChildId = migrated.streakByChildId ?? buildStreakMap(sessions, children);
  const wallet = normalizeWallet(migrated.wallet ?? initial.wallet);
  const progress = normalizeProgress(migrated.progress ?? initial.progress);
  const fallbackCounts =
    migrated.categoryTrainingCount ??
    (migrated.progress
      ? {
          study: migrated.progress.study?.completedCount ?? 0,
          exercise: migrated.progress.exercise?.completedCount ?? 0,
        }
      : undefined) ??
    buildCategoryTrainingCountFromSessions(sessions, migrated.activities ?? initial.activities);
  const categoryTrainingCount = normalizeCategoryTrainingCount(fallbackCounts);
  const buddyState = normalizeBuddyState({
    activeBuddyKeyByChildId: migrated.activeBuddyKeyByChildId ?? initial.activeBuddyKeyByChildId,
    buddyProgressByChildId: migrated.buddyProgressByChildId ?? initial.buddyProgressByChildId,
    discoveredFormIdsByChildId: migrated.discoveredFormIdsByChildId ?? initial.discoveredFormIdsByChildId,
    brainCharacters: migrated.brainCharacters ?? initial.brainCharacters,
    children,
    ownedSkins,
  });
  const treasure = normalizeTreasure(migrated.treasure ?? initial.treasure);
  const lastActivityCategory = migrated.lastActivityCategory ?? initial.lastActivityCategory ?? 'study';
  const openedTreasureNodeIds = normalizeOpenedTreasureNodeIds(
    migrated.openedTreasureNodeIds ?? initial.openedTreasureNodeIds
  );

  const merged: StoreState = {
    ...initial,
    ...migrated,
    settings,
    mediaItems,
    media: mediaItems,
    childAchievements,
    sessions,
    ownedSkins,
    characterSkins,
    wallet,
    progress,
    categoryTrainingCount,
    activeBuddyKeyByChildId: buddyState.activeBuddyKeyByChildId,
    buddyProgressByChildId: buddyState.buddyProgressByChildId,
    discoveredFormIdsByChildId: buddyState.discoveredFormIdsByChildId,
    treasure,
    lastActivityCategory,
    openedTreasureNodeIds,
    streakByChildId,
  };
  return {
    ...merged,
    brainCharacters: syncBrainCharactersWithBuddy(merged),
  };
}

function normalizeWallet(wallet?: Partial<AppState['wallet']>): AppState['wallet'] {
  return {
    study: { ...EMPTY_SKIN_WALLET.study, ...(wallet?.study ?? {}) },
    exercise: { ...EMPTY_SKIN_WALLET.exercise, ...(wallet?.exercise ?? {}) },
  };
}

function normalizeProgress(progress?: Partial<AppState['progress']>): AppState['progress'] {
  return {
    study: { ...EMPTY_SKIN_PROGRESS.study, ...(progress?.study ?? {}) },
    exercise: { ...EMPTY_SKIN_PROGRESS.exercise, ...(progress?.exercise ?? {}) },
  };
}

function normalizeCategoryTrainingCount(counts?: Partial<CategoryTrainingCount>): CategoryTrainingCount {
  return {
    study: counts?.study ?? EMPTY_CATEGORY_TRAINING_COUNT.study,
    exercise: counts?.exercise ?? EMPTY_CATEGORY_TRAINING_COUNT.exercise,
  };
}

function normalizeSessionStatus(status?: SessionStatus): SessionStatus {
  return status === 'planned' ? 'planned' : 'completed';
}

function normalizeSessionNote(note?: string): string {
  return typeof note === 'string' ? note : '';
}

function normalizeDurationMinutes(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function normalizeCompletedEffortLevel(value?: number): EffortLevel | null {
  if (value === 1 || value === 2 || value === 3) return value;
  return null;
}

function normalizeDateKey(dateKey?: string): string {
  if (typeof dateKey !== 'string' || !dateKey.trim()) {
    return getLocalDateKey(new Date());
  }
  const parsed = fromDateKey(dateKey);
  if (Number.isNaN(parsed.getTime())) {
    return getLocalDateKey(new Date());
  }
  return toDateKey(parsed);
}

function toSessionIsoFromDateKey(dateKey: string): string {
  const normalized = normalizeDateKey(dateKey);
  const parsed = fromDateKey(normalized);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function normalizeSessions(sessions?: TrainingSession[]): TrainingSession[] {
  if (!sessions) return [];
  return sessions.map((session) => {
    const status = normalizeSessionStatus(session.status);
    const dateKey = normalizeDateKey(session.dateKey ?? toDateKey(new Date(session.date)));
    const tags = normalizeTags(Array.isArray(session.tags) ? session.tags : []);
    const mediaAttachments = normalizeAttachments(session.mediaAttachments);
    const note = normalizeSessionNote(session.note);
    if (status === 'planned') {
      return {
        ...session,
        status,
        dateKey,
        date: toSessionIsoFromDateKey(dateKey),
        durationMinutes: 0,
        effortLevel: 0,
        xpGained: 0,
        coinsGained: 0,
        tags,
        note,
        mediaAttachments,
      };
    }

    return {
      ...session,
      status,
      dateKey,
      date: toSessionIsoFromDateKey(dateKey),
      durationMinutes: normalizeDurationMinutes(session.durationMinutes),
      effortLevel: normalizeCompletedEffortLevel(session.effortLevel) ?? 1,
      tags,
      note,
      mediaAttachments,
    };
  });
}

function normalizeAttachments(attachments?: MediaAttachment[]): MediaAttachment[] {
  if (!attachments) return [];
  return attachments.filter((item) => Boolean(item?.id && item.uri && item.type));
}

function normalizeTreasure(treasure?: Partial<TreasureState>): TreasureState {
  const initial = createInitialTreasureState();
  const chestIndex =
    typeof treasure?.chestIndex === 'number' && treasure.chestIndex >= 0
      ? Math.floor(treasure.chestIndex)
      : initial.chestIndex;
  const progress =
    typeof treasure?.progress === 'number' && treasure.progress >= 0 ? treasure.progress : initial.progress;
  const target =
    typeof treasure?.target === 'number' && treasure.target > 0
      ? treasure.target
      : getTreasureTargetForIndex(chestIndex);
  const history = Array.isArray(treasure?.history) ? treasure.history : initial.history;
  return {
    chestIndex,
    progress,
    target,
    history,
  };
}

function buildDefaultBuddyProgress(base?: Partial<BuddyProgress>): BuddyProgress {
  return {
    level: base?.level ?? EMPTY_BUDDY_PROGRESS.level,
    xp: base?.xp ?? EMPTY_BUDDY_PROGRESS.xp,
    stageIndex: base?.stageIndex ?? EMPTY_BUDDY_PROGRESS.stageIndex,
    mood: base?.mood ?? EMPTY_BUDDY_PROGRESS.mood,
  };
}

function normalizeBuddyState(input: {
  activeBuddyKeyByChildId?: BuddyActiveByChildId;
  buddyProgressByChildId?: BuddyProgressByChildId;
  discoveredFormIdsByChildId?: BuddyDiscoveredFormsByChildId;
  brainCharacters?: BrainCharacter[];
  children: ChildProfile[];
  ownedSkins: OwnedSkin[];
}): {
  activeBuddyKeyByChildId: BuddyActiveByChildId;
  buddyProgressByChildId: BuddyProgressByChildId;
  discoveredFormIdsByChildId: BuddyDiscoveredFormsByChildId;
} {
  const validSkinIds = new Set(CHARACTER_SKINS.map((skin) => skin.id));
  const defaultSkins = CHARACTER_SKINS.filter((skin) => skin.unlockMethod === 'default');
  const activeBuddyKeyByChildId: BuddyActiveByChildId = { ...(input.activeBuddyKeyByChildId ?? {}) };
  const buddyProgressByChildId: BuddyProgressByChildId = { ...(input.buddyProgressByChildId ?? {}) };
  const discoveredFormIdsByChildId: BuddyDiscoveredFormsByChildId = {
    ...(input.discoveredFormIdsByChildId ?? {}),
  };
  const brainByChild = new Map(
    (input.brainCharacters ?? []).map((brain) => [brain.childId, brain])
  );
  const ownedByChild = new Map<string, Set<string>>();
  input.children.forEach((child) => {
    ownedByChild.set(child.id, new Set());
  });
  input.ownedSkins.forEach((owned) => {
    const ownedSet = ownedByChild.get(owned.childId);
    if (!ownedSet) return;
    const mapped = validSkinIds.has(owned.skinId) ? owned.skinId : DEFAULT_BUDDY_KEY;
    ownedSet.add(mapped);
  });

  input.children.forEach((child) => {
    const ownedKeys = ownedByChild.get(child.id) ?? new Set();
    defaultSkins.forEach((skin) => {
      if (!shouldAutoOwnDefaultSkin(skin.id, ownedKeys)) return;
      ownedKeys.add(skin.id);
    });

    let activeKey = activeBuddyKeyByChildId[child.id];
    if (!activeKey) {
      const brain = brainByChild.get(child.id);
      activeKey = brain?.skinId ?? DEFAULT_BUDDY_KEY;
    }
    if (!validSkinIds.has(activeKey)) {
      activeKey = DEFAULT_BUDDY_KEY;
    }
    ownedKeys.add(activeKey);
    activeBuddyKeyByChildId[child.id] = activeKey;

    const childProgress = { ...(buddyProgressByChildId[child.id] ?? {}) };
    const brain = brainByChild.get(child.id);
    if (!childProgress[activeKey]) {
      childProgress[activeKey] = buildDefaultBuddyProgress(
        brain
          ? {
              level: brain.level,
              xp: brain.xp,
              mood: brain.mood,
            }
          : undefined
      );
    }
    const evolutionLine = findEvolutionLineByFormId(activeKey);
    const activeStageIndex = childProgress[activeKey]?.stageIndex ?? 0;
    if (evolutionLine && activeStageIndex > 0) {
      const evolvedFormId = evolutionLine.stages[activeStageIndex]?.formId;
      const baseFormId = evolutionLine.stages[0]?.formId;
      if (evolvedFormId && validSkinIds.has(evolvedFormId)) {
        if (!childProgress[evolvedFormId]) {
          childProgress[evolvedFormId] = {
            ...childProgress[activeKey],
            stageIndex: activeStageIndex,
          };
        }
        delete childProgress[activeKey];
        ownedKeys.add(evolvedFormId);
        if (baseFormId) {
          ownedKeys.delete(baseFormId);
        }
        activeKey = evolvedFormId;
        activeBuddyKeyByChildId[child.id] = evolvedFormId;
      }
    }
    ownedKeys.forEach((key) => {
      const stageIndex = getStageIndexByFormId(key) ?? 0;
      if (!childProgress[key]) {
        childProgress[key] = buildDefaultBuddyProgress({ stageIndex });
      } else if (childProgress[key].stageIndex !== stageIndex) {
        childProgress[key] = { ...childProgress[key], stageIndex };
      }
    });
    buddyProgressByChildId[child.id] = childProgress;

    const discovered = new Set(discoveredFormIdsByChildId[child.id] ?? []);
    ownedKeys.forEach((key) => {
      const currentForm = getBuddyForm(key, childProgress[key]?.stageIndex ?? 0);
      const line = findEvolutionLineByFormId(key);
      if (line?.stages[0]?.formId) {
        discovered.add(line.stages[0].formId);
      }
      discovered.add(currentForm.formId);
    });
    discoveredFormIdsByChildId[child.id] = Array.from(discovered);
  });

  return {
    activeBuddyKeyByChildId,
    buddyProgressByChildId,
    discoveredFormIdsByChildId,
  };
}

function normalizeOpenedTreasureNodeIds(opened?: string[]): string[] {
  return Array.isArray(opened) ? opened : [];
}

function syncBrainCharactersWithBuddy(state: StoreState): BrainCharacter[] {
  const existingByChild = new Map(state.brainCharacters.map((brain) => [brain.childId, brain]));
  return state.children.map((child) => {
    const activeKey = state.activeBuddyKeyByChildId[child.id] ?? DEFAULT_BUDDY_KEY;
    const progress =
      state.buddyProgressByChildId[child.id]?.[activeKey] ?? buildDefaultBuddyProgress();
    const existing = existingByChild.get(child.id);
    return {
      id: existing?.id ?? `brain-${child.id}`,
      childId: child.id,
      level: progress.level,
      xp: progress.xp,
      mood: progress.mood,
      skinId: activeKey,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
  });
}

function migrateSkinState(loaded: Partial<StoreState>): Partial<StoreState> {
  const validSkinIds = new Set(CHARACTER_SKINS.map((skin) => skin.id));
  const migrateId = (id: string | undefined) => {
    if (!id) return DEFAULT_SKIN_ID;
    const mapped = SKIN_ID_MIGRATION_MAP[id] ?? id;
    return validSkinIds.has(mapped) ? mapped : DEFAULT_SKIN_ID;
  };

  const brainCharacters = loaded.brainCharacters?.map((brain) => ({
    ...brain,
    skinId: migrateId(brain.skinId),
  }));

  const ownedSkins = loaded.ownedSkins?.map((owned) => ({
    ...owned,
    skinId: migrateId(owned.skinId),
  }));

  const activeBuddyKeyByChildId = loaded.activeBuddyKeyByChildId
    ? Object.fromEntries(
        Object.entries(loaded.activeBuddyKeyByChildId).map(([childId, buddyKey]) => [
          childId,
          migrateId(buddyKey),
        ])
      )
    : undefined;

  const buddyProgressByChildId = loaded.buddyProgressByChildId
    ? Object.fromEntries(
        Object.entries(loaded.buddyProgressByChildId).map(([childId, progressMap]) => [
          childId,
          Object.fromEntries(
            Object.entries(progressMap ?? {}).map(([buddyKey, progress]) => [
              migrateId(buddyKey),
              progress,
            ])
          ),
        ])
      )
    : undefined;

  const discoveredFormIdsByChildId = loaded.discoveredFormIdsByChildId
    ? Object.fromEntries(
        Object.entries(loaded.discoveredFormIdsByChildId).map(([childId, formIds]) => [
          childId,
          (formIds ?? []).map((formId) => SKIN_ID_MIGRATION_MAP[formId] ?? formId),
        ])
      )
    : undefined;

  return {
    ...loaded,
    brainCharacters,
    ownedSkins,
    activeBuddyKeyByChildId,
    buddyProgressByChildId,
    discoveredFormIdsByChildId,
  };
}

function ensureDefaultOwnedSkins(ownedSkins: OwnedSkin[], children: ChildProfile[]): OwnedSkin[] {
  const defaultSkins = CHARACTER_SKINS.filter((skin) => skin.unlockMethod === 'default');
  if (defaultSkins.length === 0) return ownedSkins;

  const existing = new Set(ownedSkins.map((entry) => `${entry.childId}:${entry.skinId}`));
  const additions: OwnedSkin[] = [];
  children.forEach((child) => {
    const ownedSet = new Set(
      ownedSkins.filter((entry) => entry.childId === child.id).map((entry) => entry.skinId)
    );
    defaultSkins.forEach((skin) => {
      if (!shouldAutoOwnDefaultSkin(skin.id, ownedSet)) return;
      const key = `${child.id}:${skin.id}`;
      if (!existing.has(key)) {
        additions.push({ childId: child.id, skinId: skin.id });
        existing.add(key);
      }
    });
  });

  return additions.length ? [...ownedSkins, ...additions] : ownedSkins;
}

function shouldAutoOwnDefaultSkin(baseFormId: string, ownedSet: Set<string>): boolean {
  const line = findEvolutionLineByFormId(baseFormId);
  if (!line) return true;
  const evolvedIds = line.stages.slice(1).map((stage) => stage.formId);
  return !evolvedIds.some((id) => ownedSet.has(id));
}

function getActiveBuddyKey(state: StoreState, childId: string): string {
  const active = state.activeBuddyKeyByChildId?.[childId];
  if (active && CHARACTER_SKINS.some((skin) => skin.id === active)) {
    return active;
  }
  return DEFAULT_BUDDY_KEY;
}

function getBuddyProgress(state: StoreState, childId: string, buddyKey: string): BuddyProgress {
  const progress = state.buddyProgressByChildId?.[childId]?.[buddyKey] ?? buildDefaultBuddyProgress();
  const stageIndex = getStageIndexByFormId(buddyKey);
  if (stageIndex === null || stageIndex === undefined) return progress;
  if (progress.stageIndex === stageIndex) return progress;
  return { ...progress, stageIndex };
}

function getSkinCategoryForActivity(activity?: Activity): 'study' | 'exercise' {
  if (!activity) return 'study';
  if (activity.category === 'sports') return 'exercise';
  if (activity.category === 'study') return 'study';
  if (activity.category === 'music') return 'study';
  return 'study';
}

function applyCompletedSession(
  prev: StoreState,
  input: ApplyCompletedSessionInput
): ApplyCompletedSessionResult | null {
  const existing = prev.sessions.find((session) => session.id === input.sessionId);
  if (existing && existing.status !== 'planned') {
    return null;
  }

  const child = prev.children.find((c) => c.id === input.childId);
  if (!child) return null;

  const activeBuddyKey = getActiveBuddyKey(prev, input.childId);
  const buddyBefore = getBuddyProgress(prev, input.childId, activeBuddyKey);
  const moodBefore = buddyBefore.mood ?? 50;
  const baseXp = calculateXp(input.durationMinutes, input.effortLevel);
  const baseCoins = calculateCoins(input.durationMinutes, input.effortLevel);
  const moodBonus = getMoodBonus(moodBefore);
  const xpGained = Math.floor(baseXp * moodBonus.xpMultiplier);
  const coinsGained = baseCoins + moodBonus.extraCoins;
  const activity = prev.activities.find((a) => a.id === input.activityId);
  const skinCategory = getSkinCategoryForActivity(activity);
  const prevWallet = normalizeWallet(prev.wallet);
  const prevProgress = normalizeProgress(prev.progress);
  const prevCategoryTrainingCount = normalizeCategoryTrainingCount(prev.categoryTrainingCount);
  const walletCategory = prevWallet[skinCategory];
  const nextTicketProgress = walletCategory.ticketProgress + 1;
  const ticketsGained = Math.floor(nextTicketProgress / SKIN_TICKET_PROGRESS_PER_TICKET);
  const updatedWalletCategory = {
    ...walletCategory,
    coins: walletCategory.coins + SKIN_COINS_PER_ACTIVITY,
    tickets: walletCategory.tickets + ticketsGained,
    ticketProgress: nextTicketProgress % SKIN_TICKET_PROGRESS_PER_TICKET,
  };
  const walletCoinsDelta = updatedWalletCategory.coins - walletCategory.coins;
  const walletTicketsDelta = updatedWalletCategory.tickets - walletCategory.tickets;
  const walletTicketProgressDelta = updatedWalletCategory.ticketProgress - walletCategory.ticketProgress;
  const wallet = { ...prevWallet, [skinCategory]: updatedWalletCategory };
  const progress = {
    ...prevProgress,
    [skinCategory]: {
      completedCount: (prevProgress[skinCategory]?.completedCount ?? 0) + 1,
    },
  };
  const categoryTrainingCount = {
    ...prevCategoryTrainingCount,
    [skinCategory]: (prevCategoryTrainingCount[skinCategory] ?? 0) + 1,
  };
  const treasure = normalizeTreasure(prev.treasure);
  const updatedTreasure: TreasureState = {
    ...treasure,
    progress: treasure.progress + 1,
  };
  const buddyBeforeLevel = buddyBefore.level;
  const buddyUpdated = applyXpToLevel(buddyBefore.level, buddyBefore.xp, xpGained);
  const updatedBuddyProgress: BuddyProgress = {
    ...buddyBefore,
    level: buddyUpdated.level,
    xp: buddyUpdated.xp,
    mood: Math.min(100, buddyBefore.mood + 10),
  };
  const buddyLevelUps = Math.max(0, buddyUpdated.level - buddyBeforeLevel);
  const prevBuddyProgressByChildId = prev.buddyProgressByChildId ?? {};
  const prevChildBuddyProgress = prevBuddyProgressByChildId[input.childId] ?? {};
  const buddyProgressByChildId = {
    ...prevBuddyProgressByChildId,
    [input.childId]: {
      ...prevChildBuddyProgress,
      [activeBuddyKey]: updatedBuddyProgress,
    },
  };
  const activeBuddyKeyByChildId = {
    ...prev.activeBuddyKeyByChildId,
    [input.childId]: activeBuddyKey,
  };
  const discoveredSet = new Set(prev.discoveredFormIdsByChildId?.[input.childId] ?? []);
  const currentForm = getBuddyForm(activeBuddyKey, updatedBuddyProgress.stageIndex);
  discoveredSet.add(currentForm.formId);
  const discoveredFormIdsByChildId = {
    ...prev.discoveredFormIdsByChildId,
    [input.childId]: Array.from(discoveredSet),
  };
  const normalizedDateKey = normalizeDateKey(input.dateKey);
  const newSession: TrainingSession = {
    id: input.sessionId,
    childId: input.childId,
    activityId: input.activityId,
    date: toSessionIsoFromDateKey(normalizedDateKey),
    dateKey: normalizedDateKey,
    durationMinutes: input.durationMinutes,
    effortLevel: input.effortLevel,
    xpGained,
    coinsGained,
    mediaAttachments: normalizeAttachments(input.mediaAttachments),
    skinCategory,
    walletCoinsDelta,
    walletTicketsDelta,
    walletTicketProgressDelta,
    treasureProgressDelta: 1,
    buddyKey: activeBuddyKey,
    tags: normalizeTags(input.tags),
    note: normalizeSessionNote(input.note),
    status: 'completed',
  };
  const sessionsWithoutTarget = prev.sessions.filter((session) => session.id !== input.sessionId);
  const sessions = [...sessionsWithoutTarget, newSession];
  const streakByChildId = buildStreakMap(sessions, prev.children);
  const childStreak = streakByChildId[input.childId] ?? { current: 0, best: 0, lastSessionDate: undefined };

  const activeProgress = buddyProgressByChildId[input.childId]?.[activeBuddyKey] ?? updatedBuddyProgress;
  const updatedChildren = prev.children.map((entry) => {
    if (entry.id !== input.childId) return entry;
    return {
      ...entry,
      level: activeProgress.level,
      xp: activeProgress.xp,
      coins: entry.coins + coinsGained,
      totalMinutes: entry.totalMinutes + input.durationMinutes,
      currentStreak: childStreak.current,
      bestStreak: Math.max(childStreak.best, entry.bestStreak),
    };
  });

  let nextState: StoreState = {
    ...prev,
    children: updatedChildren,
    sessions,
    streakByChildId,
    wallet,
    progress,
    categoryTrainingCount,
    treasure: updatedTreasure,
    lastActivityCategory: skinCategory,
    activeBuddyKeyByChildId,
    buddyProgressByChildId,
    discoveredFormIdsByChildId,
  };

  nextState = ensureMapForChild(nextState, input.childId);

  const { state: withBrain, character } = ensureBrainCharacterForChild(nextState, input.childId);
  const updatedCharacter: BrainCharacter = {
    ...character,
    level: updatedBuddyProgress.level,
    xp: updatedBuddyProgress.xp,
    mood: updatedBuddyProgress.mood,
    skinId: activeBuddyKey,
  };
  nextState = {
    ...withBrain,
    brainCharacters: withBrain.brainCharacters.map((brain) =>
      brain.id === updatedCharacter.id ? updatedCharacter : brain
    ),
  };

  const mapResult = applyTrainingToMap(nextState, input.childId, xpGained, coinsGained);
  nextState = mapResult.state;
  const achievementResult = checkAndUnlockAchievementsForChild(nextState, input.childId);
  nextState = achievementResult.state;

  return {
    nextState,
    trainingResult: {
      sessionId: newSession.id,
      buddyLevelUps,
      buddyXpGained: xpGained,
      skinCategory,
      skinCoinsGained: SKIN_COINS_PER_ACTIVITY,
      ticketsGained,
      ticketProgress: updatedWalletCategory.ticketProgress,
      ticketProgressMax: SKIN_TICKET_PROGRESS_PER_TICKET,
      completedNodes: mapResult.completedNodes,
      unlockedAchievements: achievementResult.newlyUnlocked,
    },
  };
}

function buildCategoryTrainingCountFromSessions(
  sessions: TrainingSession[],
  activities: Activity[]
): CategoryTrainingCount {
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  return sessions.filter(isCompletedSession).reduce<CategoryTrainingCount>(
    (acc, session) => {
      const activity = activityMap.get(session.activityId);
      const category = getSkinCategoryForActivity(activity);
      return { ...acc, [category]: acc[category] + 1 };
    },
    { study: 0, exercise: 0 }
  );
}

function getSkinCategoryLevel(counts: CategoryTrainingCount, category: 'study' | 'exercise'): number {
  const count = counts[category] ?? 0;
  return getCategoryLevelInfoFromCount(count).level;
}

function getDuplicateCoinReward(skin: CharacterSkin): number {
  if (skin.rarity === 'rare' || skin.rarity === 'epic') return SKIN_GACHA_DUPLICATE_COINS_RARE;
  return SKIN_GACHA_DUPLICATE_COINS_COMMON;
}

function randomInt(min: number, max: number): number {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function removeXpFromLevel(
  currentLevel: number,
  currentXp: number,
  removedXp: number
): { level: number; xp: number } {
  let level = Math.max(1, currentLevel);
  let xp = Math.max(0, currentXp);
  let remaining = Math.max(0, removedXp);

  while (remaining > 0) {
    if (xp >= remaining) {
      xp -= remaining;
      remaining = 0;
      break;
    }
    remaining -= xp;
    if (level <= 1) {
      xp = 0;
      remaining = 0;
      break;
    }
    level -= 1;
    xp = level * 100;
  }

  return { level, xp };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function rollTreasureRewards(
  kind: TreasureKind,
  category: 'study' | 'exercise'
): { rewards: TreasureReward[]; coins: number; tickets: number; buddyXp: number } {
  let coinsRange: [number, number] = TREASURE_REWARD_COINS_SMALL;
  let tickets = 0;

  switch (kind) {
    case 'medium':
      coinsRange = TREASURE_REWARD_COINS_MEDIUM;
      if (Math.random() < TREASURE_REWARD_TICKETS_MEDIUM_CHANCE) {
        tickets = TREASURE_REWARD_TICKETS_MEDIUM_AMOUNT;
      }
      break;
    case 'large':
      coinsRange = TREASURE_REWARD_COINS_LARGE;
      tickets = TREASURE_REWARD_TICKETS_LARGE_AMOUNT;
      break;
    case 'small':
    default:
      coinsRange = TREASURE_REWARD_COINS_SMALL;
      break;
  }

  const coins = randomInt(coinsRange[0], coinsRange[1]);
  const buddyXp = randomInt(TREASURE_REWARD_BUDDY_XP_RANGE[0], TREASURE_REWARD_BUDDY_XP_RANGE[1]);
  const rewards: TreasureReward[] = [
    { type: 'coins', category, amount: coins },
  ];
  if (tickets > 0) {
    rewards.push({ type: 'tickets', category, amount: tickets });
  }
  rewards.push({ type: 'buddyXp', amount: buddyXp });

  return { rewards, coins, tickets, buddyXp };
}

function pickSkinByWeight(pool: CharacterSkin[]): CharacterSkin {
  const weighted = pool.map((skin) => ({
    skin,
    weight: Math.max(1, skin.gachaWeight ?? 1),
  }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const w of weighted) {
    acc += w.weight;
    if (r <= acc) return w.skin;
  }
  return weighted[weighted.length - 1].skin;
}

function mapAttachmentsToMedia(attachments: MediaAttachment[], sessionId: string): Media[] {
  return attachments
    .map((attachment, index) => ({
      id: attachment.id,
      sessionId,
      type: attachment.type === 'video' ? ('video' as const) : ('photo' as const),
      localUri: attachment.uri,
      createdAt: attachment.createdAtISO,
      order: index,
    }))
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function getOwnedSkinsForChildInternal(state: StoreState, childId: string): CharacterSkin[] {
  const includeMeme = state.settings.enableMemeSkins;
  const all = getAllSkins(includeMeme);
  const ownedSet = new Set(
    state.ownedSkins.filter((o) => o.childId === childId).map((o) => o.skinId)
  );
  return all.filter((skin) => {
    if (skin.unlockMethod === 'default') {
      return shouldAutoOwnDefaultSkin(skin.id, ownedSet);
    }
    return ownedSet.has(skin.id);
  });
}

function purchaseSkinInternal(
  input: { childId: string; skinId: string },
  setState: React.Dispatch<React.SetStateAction<StoreState | null>>
): 'ok' | 'not_enough_coins' | 'already_owned' | 'not_found' | 'not_available' | 'locked' {
  const { childId, skinId } = input;
  let result: 'ok' | 'not_enough_coins' | 'already_owned' | 'not_found' | 'not_available' | 'locked' = 'not_found';
  setState((prev) => {
    if (!prev) return prev;
    const skin = getSkinById(skinId);
    if (!skin) {
      result = 'not_found';
      return prev;
    }
    const child = prev.children.find((c) => c.id === childId);
    if (!child) {
      result = 'not_found';
      return prev;
    }
    if (!prev.settings.enableMemeSkins && skin.unlockMethod !== 'default') {
      result = 'not_available';
      return prev;
    }
    if (skin.unlockMethod !== 'shop' || skin.shopCost === undefined) {
      result = 'not_available';
      return prev;
    }
    const owned = getOwnedSkinsForChildInternal(prev, childId);
    if (owned.some((s) => s.id === skin.id)) {
      result = 'already_owned';
      return prev;
    }
    if (skin.category === 'default') {
      result = 'not_available';
      return prev;
    }
    if (skin.minLevel) {
      const categoryLevel = getSkinCategoryLevel(
        normalizeCategoryTrainingCount(prev.categoryTrainingCount),
        skin.category
      );
      if (categoryLevel < skin.minLevel) {
        result = 'locked';
        return prev;
      }
    }
    const wallet = normalizeWallet(prev.wallet);
    const walletCategory = wallet[skin.category];
    if (!walletCategory) {
      result = 'not_available';
      return prev;
    }
    if (walletCategory.coins < skin.shopCost) {
      result = 'not_enough_coins';
      return prev;
    }
    const updatedWallet: AppState['wallet'] = {
      ...wallet,
      [skin.category]: {
        ...walletCategory,
        coins: walletCategory.coins - skin.shopCost,
      },
    };
    const updatedOwned = [...prev.ownedSkins, { childId, skinId: skin.id }];
    const prevChildProgress = prev.buddyProgressByChildId[childId] ?? {};
    const buddyProgressByChildId = {
      ...prev.buddyProgressByChildId,
      [childId]: {
        ...prevChildProgress,
        [skin.id]: prevChildProgress[skin.id] ?? buildDefaultBuddyProgress(),
      },
    };
    const discoveredSet = new Set(prev.discoveredFormIdsByChildId?.[childId] ?? []);
    discoveredSet.add(getBuddyForm(skin.id, 0).formId);
    const discoveredFormIdsByChildId = {
      ...prev.discoveredFormIdsByChildId,
      [childId]: Array.from(discoveredSet),
    };
    const nextState: StoreState = {
      ...prev,
      wallet: updatedWallet,
      ownedSkins: updatedOwned,
      buddyProgressByChildId,
      discoveredFormIdsByChildId,
    };
    result = 'ok';
    return nextState;
  });
  return result;
}

function rollSkinGachaInternal(
  input: { childId: string; category: 'study' | 'exercise' },
  setState: React.Dispatch<React.SetStateAction<StoreState | null>>
):
  | { result: 'ok'; skin: CharacterSkin; isNew: boolean; duplicateCoins: number; category: 'study' | 'exercise' }
  | { result: 'not_enough_tickets' }
  | { result: 'gacha_disabled' }
  | { result: 'not_available' } {
  let response:
    | { result: 'ok'; skin: CharacterSkin; isNew: boolean; duplicateCoins: number; category: 'study' | 'exercise' }
    | { result: 'not_enough_tickets' }
    | { result: 'gacha_disabled' }
    | { result: 'not_available' } = { result: 'gacha_disabled' };

  setState((prev) => {
    if (!prev) return prev;
    if (!prev.settings.enableGacha) {
      response = { result: 'gacha_disabled' };
      return prev;
    }
    const child = prev.children.find((c) => c.id === input.childId);
    if (!child) {
      response = { result: 'not_available' };
      return prev;
    }
    if (!prev.settings.enableMemeSkins) {
      response = { result: 'not_available' };
      return prev;
    }
    const categoryLevel = getSkinCategoryLevel(
      normalizeCategoryTrainingCount(prev.categoryTrainingCount),
      input.category
    );
    if (categoryLevel < SKIN_GACHA_UNLOCK_LEVEL) {
      response = { result: 'not_available' };
      return prev;
    }
    const wallet = normalizeWallet(prev.wallet);
    const walletCategory = wallet[input.category];
    if (!walletCategory || walletCategory.tickets < 1) {
      response = { result: 'not_enough_tickets' };
      return prev;
    }
    const pool = CHARACTER_SKINS.filter(
      (s) =>
        s.unlockMethod === 'gacha' &&
        s.category === input.category &&
        (s.minLevel ? s.minLevel <= categoryLevel : true)
    );
    if (pool.length === 0) {
      response = { result: 'not_available' };
      return prev;
    }
    const ownedSet = new Set(
      prev.ownedSkins.filter((o) => o.childId === input.childId).map((o) => o.skinId)
    );
    CHARACTER_SKINS.filter((skin) => skin.unlockMethod === 'default').forEach((skin) => ownedSet.add(skin.id));
    const unownedPool = pool.filter((skin) => !ownedSet.has(skin.id));
    const usePity = walletCategory.pity >= SKIN_GACHA_PITY_THRESHOLD - 1 && unownedPool.length > 0;
    const picked = usePity ? unownedPool[Math.floor(Math.random() * unownedPool.length)] : pickSkinByWeight(pool);
    const isNew = !ownedSet.has(picked.id);
    const duplicateCoins = isNew ? 0 : getDuplicateCoinReward(picked);

    const updatedOwned = isNew
      ? [...prev.ownedSkins, { childId: input.childId, skinId: picked.id }]
      : prev.ownedSkins;
    const prevChildProgress = prev.buddyProgressByChildId[input.childId] ?? {};
    const buddyProgressByChildId = isNew
      ? {
          ...prev.buddyProgressByChildId,
          [input.childId]: {
            ...prevChildProgress,
            [picked.id]: prevChildProgress[picked.id] ?? buildDefaultBuddyProgress(),
          },
        }
      : prev.buddyProgressByChildId;
    const discoveredFormIdsByChildId = isNew
      ? {
          ...prev.discoveredFormIdsByChildId,
          [input.childId]: Array.from(
            new Set([...(prev.discoveredFormIdsByChildId?.[input.childId] ?? []), getBuddyForm(picked.id, 0).formId])
          ),
        }
      : prev.discoveredFormIdsByChildId;
    const updatedWalletCategory = {
      ...walletCategory,
      tickets: walletCategory.tickets - 1,
      coins: walletCategory.coins + duplicateCoins,
      pity: isNew ? 0 : walletCategory.pity + 1,
    };
    const nextState: StoreState = {
      ...prev,
      ownedSkins: updatedOwned,
      buddyProgressByChildId,
      discoveredFormIdsByChildId,
      wallet: {
        ...wallet,
        [input.category]: updatedWalletCategory,
      },
    };

    response = {
      result: 'ok',
      skin: picked,
      isNew,
      duplicateCoins,
      category: input.category,
    };
    return nextState;
  });

  return response;
}

function updateSettingsInternal(
  partial: Partial<AppState['settings']>,
  setState: React.Dispatch<React.SetStateAction<StoreState | null>>
) {
  setState((prev) => {
    if (!prev) return prev;
    const settings = { ...prev.settings, ...partial };
    const nextState: StoreState = { ...prev, settings };
    return nextState;
  });
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
): { state: StoreState; completedNodes: MapNode[] } {
  void baseXpGained;
  void baseCoinsGained;

  let nextState = ensureMapForChild(state, childId);

  const nodes = sortNodesByPath(nextState.mapNodes.filter((n) => n.childId === childId));
  const currentNode = nodes.find((n) => !n.isCompleted);
  if (!currentNode) {
    return { state: nextState, completedNodes: [] };
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
    const activeBuddyKey = getActiveBuddyKey(nextState, childId);
    const prevBuddyProgress = getBuddyProgress(nextState, childId, activeBuddyKey);
    const buddyUpdated = applyXpToLevel(prevBuddyProgress.level, prevBuddyProgress.xp, bonusXp);
    const updatedBuddyProgress: BuddyProgress = {
      ...prevBuddyProgress,
      level: buddyUpdated.level,
      xp: buddyUpdated.xp,
    };
    const buddyProgressByChildId = {
      ...nextState.buddyProgressByChildId,
      [childId]: {
        ...(nextState.buddyProgressByChildId[childId] ?? {}),
        [activeBuddyKey]: updatedBuddyProgress,
      },
    };
    const activeBuddyKeyByChildId = {
      ...nextState.activeBuddyKeyByChildId,
      [childId]: activeBuddyKey,
    };
    const children = nextState.children.map((child) => {
      if (child.id !== childId) return child;
      return {
        ...child,
        level: updatedBuddyProgress.level,
        xp: updatedBuddyProgress.xp,
        coins: child.coins + bonusCoins,
      };
    });
    const brainCharacters = nextState.brainCharacters.map((brain) => {
      if (brain.childId !== childId) return brain;
      return {
        ...brain,
        level: updatedBuddyProgress.level,
        xp: updatedBuddyProgress.xp,
        mood: updatedBuddyProgress.mood,
        skinId: activeBuddyKey,
      };
    });

    return {
      state: {
        ...nextState,
        mapNodes,
        children,
        buddyProgressByChildId,
        activeBuddyKeyByChildId,
        brainCharacters,
      },
      completedNodes: updatedNode.isCompleted ? [updatedNode] : [],
    };
  }

  return {
    state: {
      ...nextState,
      mapNodes,
    },
    completedNodes: updatedNode.isCompleted ? [updatedNode] : [],
  };
}

function checkAndUnlockAchievementsForChild(
  state: StoreState,
  childId: string
): { state: StoreState; newlyUnlocked: Achievement[] } {
  const nowIso = new Date().toISOString();

  const child = state.children.find((c) => c.id === childId);
  if (!child) return { state, newlyUnlocked: [] };

  const childSessions = state.sessions.filter((s) => s.childId === childId && isCompletedSession(s));
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
    return { state, newlyUnlocked: [] };
  }

  const achievementsToAdd = toUnlock.map((key) => getAchievementByKey(key));

  const newChildAchievements: ChildAchievement[] = achievementsToAdd.map((achievement) => {
    return {
      id: `${childId}-${achievement.id}`,
      childId,
      achievementId: achievement.id,
      unlockedAt: nowIso,
    };
  });

  return {
    state: {
      ...state,
      childAchievements: [...state.childAchievements, ...newChildAchievements],
    },
    newlyUnlocked: achievementsToAdd,
  };
}

function ensureBrainCharacterForChild(
  state: StoreState,
  childId: string
): { state: StoreState; character: BrainCharacter } {
  let nextState = state;
  const activeBuddyKey = getActiveBuddyKey(state, childId);
  const prevChildProgress = state.buddyProgressByChildId[childId] ?? {};
  const progress = prevChildProgress[activeBuddyKey] ?? buildDefaultBuddyProgress();
  if (!prevChildProgress[activeBuddyKey]) {
    nextState = {
      ...nextState,
      buddyProgressByChildId: {
        ...nextState.buddyProgressByChildId,
        [childId]: {
          ...prevChildProgress,
          [activeBuddyKey]: progress,
        },
      },
    };
  }
  if (nextState.activeBuddyKeyByChildId[childId] !== activeBuddyKey) {
    nextState = {
      ...nextState,
      activeBuddyKeyByChildId: {
        ...nextState.activeBuddyKeyByChildId,
        [childId]: activeBuddyKey,
      },
    };
  }
  const discoveredSet = new Set(nextState.discoveredFormIdsByChildId?.[childId] ?? []);
  const baseForm = getBuddyForm(activeBuddyKey, 0);
  const currentForm = getBuddyForm(activeBuddyKey, progress.stageIndex);
  discoveredSet.add(baseForm.formId);
  discoveredSet.add(currentForm.formId);
  nextState = {
    ...nextState,
    discoveredFormIdsByChildId: {
      ...nextState.discoveredFormIdsByChildId,
      [childId]: Array.from(discoveredSet),
    },
  };

  const existing = nextState.brainCharacters.find((c) => c.childId === childId);
  const now = new Date().toISOString();
  const character: BrainCharacter = {
    id: existing?.id ?? `brain-${childId}`,
    childId,
    level: progress.level,
    xp: progress.xp,
    mood: progress.mood,
    skinId: activeBuddyKey,
    createdAt: existing?.createdAt ?? now,
  };
  const brainCharacters = existing
    ? nextState.brainCharacters.map((brain) => (brain.childId === childId ? character : brain))
    : [...nextState.brainCharacters, character];
  return {
    state: { ...nextState, brainCharacters },
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
        .filter((s) => s.childId === childId && isCompletedSession(s))
        .map((s) => getSessionDateKey(s))
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

  const todayKey = getLocalDateKey(new Date());
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
  const date = fromDateKey(dateKey);
  if (Number.isNaN(date.getTime())) return getLocalDateKey(new Date());
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

function dayDiff(fromKey: string, toKey: string) {
  const from = fromDateKey(fromKey);
  const to = fromDateKey(toKey);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
