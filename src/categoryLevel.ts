import type { CategoryTrainingCount } from './types';

export type CategoryLevelInfo = {
  level: number;
  progress: number;
  required: number;
  remaining: number;
};

export function getCategoryLevelInfoFromCount(count: number): CategoryLevelInfo {
  let level = 1;
  let remainingCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  let required = level + 2;

  while (remainingCount >= required) {
    remainingCount -= required;
    level += 1;
    required = level + 2;
  }

  return {
    level,
    progress: remainingCount,
    required,
    remaining: Math.max(0, required - remainingCount),
  };
}

export function getCategoryLevelInfo(counts: CategoryTrainingCount, category: 'study' | 'exercise'): CategoryLevelInfo {
  const count = counts?.[category] ?? 0;
  return getCategoryLevelInfoFromCount(count);
}
