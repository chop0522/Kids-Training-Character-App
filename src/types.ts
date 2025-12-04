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
  durationMinutes: number;
  effortLevel: EffortLevel;
  xpGained: number;
  coinsGained: number;
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

export type CharacterSkin = {
  id: string;
  name: string;
  type: 'original' | 'meme';
  isPremium: boolean;
  assetKey: string; // key to find the image asset
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
  brainCharacters: BrainCharacter[];
  mapNodes: MapNode[];
  achievements: Achievement[];
  childAchievements: ChildAchievement[];
  settings: AppSettings;
};
