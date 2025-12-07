export type EffortLevel = 1 | 2 | 3;

/**
 * Calculate XP from duration and effort.
 * - Base: 5 XP per minute.
 * - Effort acts as a multiplier: 1x, 2x, 3x.
 */
export function calculateXp(durationMinutes: number, effortLevel: EffortLevel): number {
  const basePerMinute = 5;
  const effortMultiplier = effortLevel;
  return durationMinutes * basePerMinute * effortMultiplier;
}

/**
 * Calculate coins from duration and effort.
 * - Base: 5 coins per session.
 * - Bonus: + (floor(duration / 10) * effortLevel)
 */
export function calculateCoins(durationMinutes: number, effortLevel: EffortLevel): number {
  const basePerSession = 5;
  const bonus = Math.floor(durationMinutes / 10) * effortLevel;
  return basePerSession + bonus;
}

/**
 * Simple helper: given current XP and newly gained XP, return
 * updated XP and level. For now:
 * - XP needed per level = 100 * level
 * (We can adjust later; keep implementation simple and predictable.)
 */
export function applyXpToLevel(
  currentLevel: number,
  currentXp: number,
  gainedXp: number
): { level: number; xp: number } {
  let level = currentLevel;
  let xp = currentXp + gainedXp;

  // Example rule: level-up threshold grows linearly
  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
  }

  return { level, xp };
}

export function getMoodBonus(mood: number): { xpMultiplier: number; extraCoins: number } {
  if (mood >= 70) {
    return { xpMultiplier: 1.1, extraCoins: 1 };
  }
  return { xpMultiplier: 1.0, extraCoins: 0 };
}
