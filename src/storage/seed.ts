import { nanoid } from 'nanoid/non-secure';
import { Activity, AppState, BrainCharacter, ChildProfile, Family, OwnedSkin } from '../types';
import { getLevelFromXp } from '../utils/progress';
import { generateInitialMapForChild } from '../mapConfig';
import { CHARACTER_SKINS } from '../characterSkinsConfig';

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

  const defaultSkin = CHARACTER_SKINS.find((s) => s.isDefault) ?? CHARACTER_SKINS[0];
  const brainCharacters: BrainCharacter[] = children.map((child) =>
    makeBrainCharacter(child.id, defaultSkin.id, child.level, child.xp)
  );

  const mapNodes = children.flatMap((child) => generateInitialMapForChild(child.id));
  const ownedSkins: OwnedSkin[] = defaultSkin
    ? children.map((child) => ({ childId: child.id, skinId: defaultSkin.id }))
    : [];

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
  };
}
