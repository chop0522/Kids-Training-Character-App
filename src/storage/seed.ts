import { nanoid } from 'nanoid/non-secure';
import { Activity, AppState, BrainCharacter, ChildProfile, Family, OwnedSkin } from '../types';
import { getLevelFromXp } from '../utils/progress';
import { generateInitialMapForChild } from '../mapConfig';
import { CHARACTER_SKINS } from '../characterSkinsConfig';
import { getBuddyForm } from '../characterEvolutionConfig';
import { createInitialTreasureState } from '../treasureConfig';

const defaultActivities: Activity[] = [
  { id: 'act-soccer', familyId: null, name: 'サッカー', category: 'sports', iconKey: '⚽️' },
  { id: 'act-core', familyId: null, name: '体幹トレ', category: 'sports', iconKey: '🤸' },
  { id: 'act-study', familyId: null, name: 'お勉強', category: 'study', iconKey: '📚' },
  { id: 'act-piano', familyId: null, name: 'ピアノ', category: 'music', iconKey: '🎹' },
];

function makeChild(familyId: string, name: string, avatarType: string, xp: number, coins: number): ChildProfile {
  const { level } = getLevelFromXp(xp);
  return {
    id: nanoid(8),
    familyId,
    name,
    avatarType,
    xp,
    level,
    coins,
    currentStreak: 0,
    bestStreak: 0,
    totalMinutes: 0,
  };
}

function makeBrainCharacter(childId: string, skinId: string, level: number, xp: number): BrainCharacter {
  return {
    id: nanoid(8),
    childId,
    level,
    xp,
    mood: 80,
    skinId,
    createdAt: new Date().toISOString(),
  };
}

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

export function createSeedState(): AppState {
  const family: Family = {
    id: 'family-default',
    name: 'わが家',
    createdAt: new Date().toISOString(),
    planType: 'free',
  };

  const children: ChildProfile[] = [
    makeChild(family.id, 'ハナ', 'happy', 240, 80),
    makeChild(family.id, 'ケン', 'lightning', 120, 45),
  ];

  const defaultSkins = CHARACTER_SKINS.filter((skin) => skin.unlockMethod === 'default');
  const defaultSkin = defaultSkins.find((s) => s.isDefault) ?? defaultSkins[0] ?? CHARACTER_SKINS[0];
  const brainCharacters: BrainCharacter[] = children.map((child) =>
    makeBrainCharacter(child.id, defaultSkin.id, child.level, child.xp)
  );

  const mapNodes = children.flatMap((child) => generateInitialMapForChild(child.id));
  const ownedSkins: OwnedSkin[] = defaultSkins.length
    ? children.flatMap((child) => defaultSkins.map((skin) => ({ childId: child.id, skinId: skin.id })))
    : [];
  const activeBuddyKeyByChildId = Object.fromEntries(children.map((child) => [child.id, defaultSkin.id]));
  const buddyProgressByChildId = Object.fromEntries(
    children.map((child) => {
      const progressById: Record<string, { level: number; xp: number; stageIndex: number; mood: number }> = {};
      defaultSkins.forEach((skin) => {
        const isActive = skin.id === defaultSkin.id;
        progressById[skin.id] = {
          level: isActive ? child.level : 1,
          xp: isActive ? child.xp : 0,
          stageIndex: 0,
          mood: 80,
        };
      });
      return [child.id, progressById];
    })
  );
  const discoveredFormIdsByChildId = Object.fromEntries(
    children.map((child) => [
      child.id,
      defaultSkins.map((skin) => getBuddyForm(skin.id, 0).formId),
    ])
  );

  return {
    families: [family],
    users: [],
    children,
    activities: defaultActivities,
    sessions: [],
    mediaItems: [],
    media: [],
    characterSkins: CHARACTER_SKINS,
    brainCharacters,
    mapNodes,
    achievements: [],
    childAchievements: [],
    ownedSkins,
    settings: { enableMemeSkins: false, enableGacha: true, parentPin: undefined },
    wallet: emptyWallet,
    progress: emptyProgress,
    categoryTrainingCount: emptyCategoryTrainingCount,
    activeBuddyKeyByChildId,
    buddyProgressByChildId,
    discoveredFormIdsByChildId,
    treasure: createInitialTreasureState(),
    lastActivityCategory: 'study',
    openedTreasureNodeIds: [],
  };
}
