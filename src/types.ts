export type PlanType = 'free' | 'premium';

export type Family = {
  id: string;
  name: string;
  createdAt: string;
  planType: PlanType;
};

export type User = {
  id: string;
  familyId: string;
  email: string;
  passwordHash?: string;
  role: 'parent';
};

export type ChildProfile = {
  id: string;
  familyId: string;
  name: string;
  grade?: string;
  avatarType?: string;
  xp: number;
  level: number;
  coins: number;
  currentStreak: number;
  bestStreak: number;
  totalMinutes: number;
};

export type ActivityCategory = 'sports' | 'study' | 'music' | 'other';

export type Activity = {
  id: string;
  familyId: string | null; // null = default activity
  name: string;
  category: ActivityCategory;
  iconKey: string;
};

export type EffortLevel = 1 | 2 | 3;

export type TrainingSession = {
  id: string;
  childId: string;
  activityId: string;
  date: string; // ISO string
  dateKey: string; // YYYY-MM-DD (local date)
  durationMinutes: number;
  effortLevel: EffortLevel;
  xpGained: number;
  coinsGained: number;
  tags: string[];
  note?: string;
};

export type MediaType = 'photo' | 'video';

export type Media = {
  id: string;
  sessionId: string;
  type: MediaType;
  localUri: string; // local file URI (file:// or content://)
  createdAt: string;
  order: number;
};

export type CharacterSkinRarity = 'common' | 'rare' | 'epic';

export type SkinCategory = 'default' | 'study' | 'exercise';

export type SkinUnlockMethod = 'default' | 'shop' | 'gacha' | 'evolution';

export type CharacterSkin = {
  id: string;
  name: string;
  category: SkinCategory;
  unlockMethod: SkinUnlockMethod;
  rarity: CharacterSkinRarity;
  isDefault: boolean;
  shopCost?: number;
  gachaWeight?: number;
  minLevel?: number;
  assetKey: string; // key to find the image asset
  isSelectableBuddy?: boolean;
  isShopVisible?: boolean;
  isGachaVisible?: boolean;
  evolutionStageIndex?: number;
};

export type OwnedSkin = {
  childId: string;
  skinId: string;
};

export type BrainCharacter = {
  id: string;
  childId: string;
  level: number;
  xp: number;
  mood: number; // 0-100
  skinId: string; // CharacterSkin.id
  createdAt: string;
};

export type BuddyProgress = {
  level: number;
  xp: number;
  stageIndex: number;
  mood: number;
};

export type BuddyProgressById = Record<string, BuddyProgress>;
export type BuddyProgressByChildId = Record<string, BuddyProgressById>;
export type BuddyActiveByChildId = Record<string, string>;
export type BuddyDiscoveredFormsByChildId = Record<string, string[]>;

export type MapNodeType = 'normal' | 'treasure' | 'boss';

export type MapNode = {
  id: string;
  childId: string; // per child, generate their own map
  stageIndex: number; // 0,1,2...
  nodeIndex: number; // 0,1,2...
  type: MapNodeType;
  requiredSessions: number;
  progress: number;
  isCompleted: boolean;
  rewardXp: number;
  rewardCoins: number;
};

export type Achievement = {
  id: string;
  key: AchievementKey; // 'first_session', 'sessions_10', etc.
  title: string;
  description: string;
  iconEmoji: string;
};

export type ChildAchievement = {
  id: string;
  childId: string;
  achievementId: string;
  unlockedAt: string;
};

export type AchievementKey =
  | 'first_session'
  | 'sessions_10'
  | 'total_minutes_100'
  | 'streak_3'
  | 'streak_7'
  | 'map_nodes_3'
  | 'map_stage0_complete';

export type AppSettings = {
  enableMemeSkins: boolean;
  enableGacha: boolean;
  parentPin?: string;
};

export type SkinWalletCategory = {
  coins: number;
  tickets: number;
  ticketProgress: number;
  pity: number;
};

export type SkinWallet = {
  study: SkinWalletCategory;
  exercise: SkinWalletCategory;
};

export type SkinProgressCategory = {
  completedCount: number;
};

export type SkinProgress = {
  study: SkinProgressCategory;
  exercise: SkinProgressCategory;
};

export type CategoryTrainingCount = {
  study: number;
  exercise: number;
};

export type TreasureKind = 'small' | 'medium' | 'large';

export type TreasureReward = {
  type: 'coins' | 'tickets' | 'buddyXp';
  category?: 'study' | 'exercise';
  amount: number;
};

export type TreasureHistoryItem = {
  index: number;
  openedAtISO: string;
  kind: TreasureKind;
  rewards: TreasureReward[];
};

export type TreasureState = {
  chestIndex: number;
  progress: number;
  target: number;
  history: TreasureHistoryItem[];
};

export type TrainingResult = {
  sessionId: string;
  buddyLevelUps: number;
  buddyXpGained: number;
  skinCategory: 'study' | 'exercise';
  skinCoinsGained: number;
  ticketsGained: number;
  ticketProgress: number;
  ticketProgressMax: number;
  completedNodes: MapNode[];
  unlockedAchievements: Achievement[];
};

export type AppState = {
  families: Family[];
  users: User[];
  children: ChildProfile[];
  activities: Activity[];
  sessions: TrainingSession[];
  mediaItems: Media[];
  media?: Media[]; // legacy key for compatibility
  characterSkins: CharacterSkin[];
  ownedSkins: OwnedSkin[];
  brainCharacters: BrainCharacter[];
  mapNodes: MapNode[];
  achievements: Achievement[];
  childAchievements: ChildAchievement[];
  settings: AppSettings;
  wallet: SkinWallet;
  progress: SkinProgress;
  categoryTrainingCount: CategoryTrainingCount;
  activeBuddyKeyByChildId: BuddyActiveByChildId;
  buddyProgressByChildId: BuddyProgressByChildId;
  discoveredFormIdsByChildId: BuddyDiscoveredFormsByChildId;
  treasure: TreasureState;
  lastActivityCategory?: 'study' | 'exercise';
  openedTreasureNodeIds: string[];
};
