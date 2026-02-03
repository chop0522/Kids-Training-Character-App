import type { AppStoreState } from '../../store/AppStoreContext';
import type { OwnedSkin, TrainingSession } from '../../types';
import { computeStreaks } from '../../utils/progress';
import { sanitizeState } from './backupUtils';

function mergeById<T extends { id: string }>(base: T[], incoming: T[]): T[] {
  const map = new Map(base.map((item) => [item.id, item]));
  incoming.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

function mergeOwnedSkins(base: OwnedSkin[], incoming: OwnedSkin[]): OwnedSkin[] {
  const key = (skin: OwnedSkin) => `${skin.childId}:${skin.skinId}`;
  const map = new Map(base.map((item) => [key(item), item]));
  incoming.forEach((item) => {
    if (!map.has(key(item))) {
      map.set(key(item), item);
    }
  });
  return Array.from(map.values());
}

function mergeByChild<T>(base: Record<string, T> | undefined, incoming: Record<string, T> | undefined): Record<string, T> {
  return { ...(incoming ?? {}), ...(base ?? {}) };
}

function unionByChild(base: Record<string, string[]> | undefined, incoming: Record<string, string[]> | undefined) {
  const next: Record<string, string[]> = { ...(base ?? {}) };
  Object.entries(incoming ?? {}).forEach(([childId, forms]) => {
    const existing = new Set(next[childId] ?? []);
    forms.forEach((form) => existing.add(form));
    next[childId] = Array.from(existing);
  });
  return next;
}

export function mergeAppStates(current: AppStoreState, incoming: Partial<AppStoreState>) {
  const cleanIncoming = sanitizeState(incoming);
  const nextChildren = mergeById(current.children, cleanIncoming.children ?? []);
  const nextActivities = mergeById(current.activities, cleanIncoming.activities ?? []);
  const incomingSessions = cleanIncoming.sessions ?? [];
  const currentSessionIds = new Set(current.sessions.map((s) => s.id));
  const addedSessions = incomingSessions.filter((s) => !currentSessionIds.has(s.id));
  const nextSessions = [...current.sessions, ...addedSessions];

  const nextOwnedSkins = mergeOwnedSkins(current.ownedSkins, cleanIncoming.ownedSkins ?? []);
  const nextChildAchievements = mergeById(current.childAchievements, cleanIncoming.childAchievements ?? []);

  const nextDiscoveredForms = unionByChild(current.discoveredFormIdsByChildId, cleanIncoming.discoveredFormIdsByChildId);
  const nextActiveBuddy = mergeByChild(current.activeBuddyKeyByChildId, cleanIncoming.activeBuddyKeyByChildId);
  const nextBuddyProgress = mergeByChild(current.buddyProgressByChildId, cleanIncoming.buddyProgressByChildId);

  const nextWallet = { ...current.wallet };
  const nextCategoryTrainingCount = { ...current.categoryTrainingCount };
  const nextProgress = { ...current.progress };
  let treasureProgress = current.treasure?.progress ?? 0;

  addedSessions.forEach((session) => {
    const category = session.skinCategory;
    if (category) {
      nextCategoryTrainingCount[category] = (nextCategoryTrainingCount[category] ?? 0) + 1;
      nextProgress[category] = {
        completedCount: (nextProgress[category]?.completedCount ?? 0) + 1,
      };
      const walletCategory = nextWallet[category];
      if (walletCategory) {
        walletCategory.coins += session.walletCoinsDelta ?? 0;
        walletCategory.tickets += session.walletTicketsDelta ?? 0;
        walletCategory.ticketProgress += session.walletTicketProgressDelta ?? 0;
      }
    }
    treasureProgress += session.treasureProgressDelta ?? 0;
  });

  const nextTreasure = current.treasure
    ? { ...current.treasure, progress: treasureProgress }
    : current.treasure;

  const nextStreakByChildId: AppStoreState['streakByChildId'] = { ...current.streakByChildId };
  nextChildren.forEach((child) => {
    nextStreakByChildId[child.id] = computeStreaks(nextSessions, child.id);
  });

  return sanitizeState({
    ...current,
    children: nextChildren,
    activities: nextActivities,
    sessions: nextSessions,
    ownedSkins: nextOwnedSkins,
    childAchievements: nextChildAchievements,
    discoveredFormIdsByChildId: nextDiscoveredForms,
    activeBuddyKeyByChildId: nextActiveBuddy,
    buddyProgressByChildId: nextBuddyProgress,
    wallet: nextWallet,
    categoryTrainingCount: nextCategoryTrainingCount,
    progress: nextProgress,
    treasure: nextTreasure,
    streakByChildId: nextStreakByChildId,
  });
}

export type MergePreview = {
  addedSessions: TrainingSession[];
};

export function getMergePreview(current: AppStoreState, incoming: Partial<AppStoreState>): MergePreview {
  const incomingSessions = incoming.sessions ?? [];
  const currentSessionIds = new Set(current.sessions.map((s) => s.id));
  const addedSessions = incomingSessions.filter((s) => !currentSessionIds.has(s.id));
  return { addedSessions };
}
