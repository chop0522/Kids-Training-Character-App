import { EffortLevel, TrainingSession } from '../types';

export function calculateXp(durationMinutes: number, effortLevel: EffortLevel): number {
  const basePerMinute = 5;
  const effortMultiplier = effortLevel; // 1x, 2x, 3x
  return durationMinutes * basePerMinute * effortMultiplier;
}

export function calculateCoins(durationMinutes: number, effortLevel: EffortLevel): number {
  const basePerSession = 5;
  const bonus = Math.floor(durationMinutes / 10) * effortLevel;
  return basePerSession + bonus;
}

export function getLevelFromXp(totalXp: number) {
  let remainingXp = totalXp;
  let level = 1;

  while (remainingXp >= xpNeededForLevel(level)) {
    remainingXp -= xpNeededForLevel(level);
    level += 1;
  }

  const xpForNextLevel = xpNeededForLevel(level);

  return {
    level,
    xpIntoLevel: remainingXp,
    xpForNextLevel,
    progressPercent: xpForNextLevel === 0 ? 0 : remainingXp / xpForNextLevel,
  };
}

function xpNeededForLevel(level: number) {
  // Simple ramp: each level needs 120 + 20*(level-1) XP
  return 120 + (level - 1) * 20;
}

export function computeStreaks(
  sessions: TrainingSession[],
  childId: string,
  today: Date = new Date()
) {
  const childSessions = sessions.filter((s) => s.childId === childId);
  const uniqueDays = Array.from(
    new Set(childSessions.map((s) => toDateKey(new Date(s.date))))
  ).sort((a, b) => (a > b ? -1 : 1)); // newest first

  const todayKey = toDateKey(today);
  let currentStreak = 0;
  let expectedDate = startOfDay(today);

  for (const dayKey of uniqueDays) {
    if (dayKey === toDateKey(expectedDate)) {
      currentStreak += 1;
      expectedDate = addDays(expectedDate, -1);
      continue;
    }

    const diff = daysBetween(startOfDay(new Date(dayKey)), expectedDate);
    if (diff > 1) {
      break; // gap found
    }
  }

  let bestStreak = 0;
  let streak = 0;
  let prevDate: Date | null = null;

  for (const dayKey of uniqueDays) {
    const date = startOfDay(new Date(dayKey));
    if (prevDate && daysBetween(prevDate, date) === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
    bestStreak = Math.max(bestStreak, streak);
    prevDate = date;
  }

  return { currentStreak, bestStreak, doneToday: uniqueDays.includes(todayKey) };
}

function toDateKey(date: Date) {
  return startOfDay(date).toISOString().split('T')[0];
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween(a: Date, b: Date) {
  const diffMs = Math.abs(startOfDay(a).getTime() - startOfDay(b).getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
