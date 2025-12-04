export type RootStackParamList = {
  FamilySelection: undefined;
  ChildDashboard: { childId?: string } | undefined;
  TrainingLog: { childId: string };
  Map: { childId: string };
  BrainCharacter: { childId: string };
  Achievements: { childId: string };
  SessionDetail: { childId: string; sessionId: string };
  ActivityTimeline: { childId: string; activityId: string };
};
