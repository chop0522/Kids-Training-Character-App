import { APP_STATE_VERSION } from '../storage/appStateStorage';
import { AppStoreState } from '../store/AppStoreContext';

export const SHARE_PACKAGE_VERSION = 1;

export type SharePackage = {
  packageVersion: number;
  exportedAt: string;
  appStateVersion?: number;
  includes: {
    mediaItems: boolean;
    parentPin: boolean;
  };
  summary: {
    childrenCount: number;
    sessionsCount: number;
    activitiesCount: number;
    achievementsCount: number;
    mapNodesCount: number;
    ownedSkinsCount: number;
  };
  state: Partial<AppStoreState>;
};

export function buildSharePackage(input: {
  state: AppStoreState;
  appStateVersion?: number;
}): SharePackage {
  const { state, appStateVersion = APP_STATE_VERSION } = input;
  const sanitizedSettings = {
    enableMemeSkins: state.settings?.enableMemeSkins ?? false,
    enableGacha: state.settings?.enableGacha ?? true,
    parentPin: undefined,
  };
  const sanitized: Partial<AppStoreState> = {
    children: state.children,
    activities: state.activities,
    sessions: state.sessions,
    streakByChildId: state.streakByChildId,
    brainCharacters: state.brainCharacters,
    mapNodes: state.mapNodes,
    childAchievements: state.childAchievements,
    ownedSkins: state.ownedSkins,
    wallet: state.wallet,
    progress: state.progress,
    categoryTrainingCount: state.categoryTrainingCount,
    activeBuddyKeyByChildId: state.activeBuddyKeyByChildId,
    buddyProgressByChildId: state.buddyProgressByChildId,
    discoveredFormIdsByChildId: state.discoveredFormIdsByChildId,
    treasure: state.treasure,
    lastActivityCategory: state.lastActivityCategory,
    openedTreasureNodeIds: state.openedTreasureNodeIds,
    settings: sanitizedSettings,
    mediaItems: [],
    media: [],
  };
  const summary = {
    childrenCount: sanitized.children?.length ?? 0,
    sessionsCount: sanitized.sessions?.length ?? 0,
    activitiesCount: sanitized.activities?.length ?? 0,
    achievementsCount: sanitized.childAchievements?.length ?? 0,
    mapNodesCount: sanitized.mapNodes?.length ?? 0,
    ownedSkinsCount: sanitized.ownedSkins?.length ?? 0,
  };
  return {
    packageVersion: SHARE_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    appStateVersion,
    includes: {
      mediaItems: false,
      parentPin: false,
    },
    summary,
    state: sanitized,
  };
}

export function isValidSharePackage(obj: unknown): obj is SharePackage {
  return (
    Boolean(obj) &&
    typeof obj === 'object' &&
    (obj as SharePackage).packageVersion === SHARE_PACKAGE_VERSION &&
    typeof (obj as SharePackage).exportedAt === 'string' &&
    Boolean((obj as SharePackage).state) &&
    typeof (obj as SharePackage).state === 'object'
  );
}
