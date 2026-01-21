import type { TrainingSession } from '../types';

const TAG_SPLIT_REGEX = /[\s\u3000]+/;

export function normalizeTag(input: string): string {
  const trimmed = input.trim().replace(/^[#＃]+/, '');
  if (!trimmed) return '';
  const squashed = trimmed.replace(/[\s\u3000]+/g, '');
  if (!squashed) return '';
  return squashed.toLowerCase();
}

export function parseTagsFromText(input: string): string[] {
  if (!input) return [];
  const tokens = input.split(TAG_SPLIT_REGEX).filter(Boolean);
  return uniqueTags(tokens.map(normalizeTag).filter(Boolean));
}

export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((tag) => {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(tag);
  });
  return result;
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) return [];
  return uniqueTags(tags.map(normalizeTag).filter(Boolean));
}

export function formatTag(tag: string): string {
  return `#${tag}`;
}

export function buildTagFrequency(sessions: TrainingSession[], limit = 10): string[] {
  const counts: Record<string, number> = {};
  sessions.forEach((session) => {
    (session.tags ?? []).forEach((tag) => {
      const key = tag.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}
