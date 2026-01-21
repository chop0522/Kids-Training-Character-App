import type { TreasureKind, TreasureState } from './types';

const CHEST_CYCLE: TreasureKind[] = ['small', 'small', 'medium', 'medium', 'large'];

export const TREASURE_KIND_LABELS: Record<TreasureKind, string> = {
  small: '小',
  medium: '中',
  large: '大',
};

export function getTreasureKind(index: number): TreasureKind {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return CHEST_CYCLE[safeIndex % CHEST_CYCLE.length];
}

export function getTreasureTarget(kind: TreasureKind): number {
  switch (kind) {
    case 'small':
      return 3;
    case 'medium':
      return 4;
    case 'large':
      return 6;
    default:
      return 3;
  }
}

export function getTreasureTargetForIndex(index: number): number {
  return getTreasureTarget(getTreasureKind(index));
}

export function createInitialTreasureState(): TreasureState {
  return {
    chestIndex: 0,
    progress: 0,
    target: getTreasureTargetForIndex(0),
    history: [],
  };
}
