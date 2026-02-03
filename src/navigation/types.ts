export type HomeStackParamList = {
  Home: { childId?: string } | undefined;
  TrainingLog: { childId: string };
  TreasureProgress: { childId?: string } | undefined;
};

export type RecordStackParamList = {
  Record: { childId?: string } | undefined;
  TrainingLog: { childId: string };
  SessionDetail: { childId: string; sessionId: string };
  ActivityTimeline: { childId: string; activityId: string };
  SessionCompare: {
    childId: string;
    activityId: string;
    beforeSessionId: string;
    afterSessionId: string;
  };
  RecordSearch: { childId?: string; initialTag?: string; initialQuery?: string } | undefined;
};

export type RewardsStackParamList = {
  Rewards: { childId?: string } | undefined;
};

export type BuddyStackParamList = {
  Buddy: { childId?: string } | undefined;
  Encyclopedia: { childId?: string } | undefined;
  Achievements: { childId?: string } | undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  RecordTab: undefined;
  RewardsTab: undefined;
  BuddyTab: undefined;
};

export type SettingsStackParamList = {
  ParentSettings: undefined;
  FamilySharing: undefined;
  SkinGallery: undefined;
  AppInfo: undefined;
  LegalDocument: { type: 'privacy' | 'terms' | 'support' };
};

export type RootStackParamList = {
  FamilySelection: undefined;
  MainTabs: undefined;
  SettingsStack: undefined;
};
