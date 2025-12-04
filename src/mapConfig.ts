import { MapNode } from './types';

export const STAGE_NAMES: string[] = [
  'キャンプ場',
  '川のステージ',
  '山の丘',
  '雲のうえ',
  '星空キャンプ',
];

export function getStageName(stageIndex: number): string {
  if (stageIndex < 0 || stageIndex >= STAGE_NAMES.length) {
    return `ステージ ${stageIndex + 1}`;
  }
  return STAGE_NAMES[stageIndex];
}

export function generateInitialMapForChild(childId: string): MapNode[] {
  const nodes: MapNode[] = [];
  const stageIndex = 0;

  const baseIdPrefix = `map-${childId}-${stageIndex}-`;

  const pushNode = (
    nodeIndex: number,
    type: MapNode['type'],
    requiredSessions: number,
    rewardXp: number,
    rewardCoins: number
  ) => {
    const node: MapNode = {
      id: `${baseIdPrefix}${nodeIndex}`,
      childId,
      stageIndex,
      nodeIndex,
      type,
      requiredSessions,
      progress: 0,
      isCompleted: false,
      rewardXp,
      rewardCoins,
    };
    nodes.push(node);
  };

  pushNode(0, 'normal', 1, 10, 3);
  pushNode(1, 'normal', 1, 10, 3);
  pushNode(2, 'normal', 1, 10, 3);
  pushNode(3, 'normal', 2, 20, 5);
  pushNode(4, 'treasure', 2, 40, 10);

  return nodes;
}
