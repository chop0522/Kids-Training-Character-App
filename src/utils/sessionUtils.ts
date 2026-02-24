import { Media, TrainingSession } from '../types';
import { toDateKey } from './dateKey';

export function getLocalDateKey(date: Date): string {
  return toDateKey(date);
}

export function getLocalDateKeyFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  return getLocalDateKey(date);
}

export function getSessionDateKey(session: TrainingSession): string {
  return session.dateKey ?? getLocalDateKeyFromIso(session.date);
}

export function isPlannedSession(session: TrainingSession): boolean {
  return session.status === 'planned';
}

export function isCompletedSession(session: TrainingSession): boolean {
  return !isPlannedSession(session);
}

export function formatDateYmd(iso: string): string {
  const ymd = getLocalDateKeyFromIso(iso);
  const [y, m, d] = ymd.split('-');
  return `${y}/${m}/${d}`;
}

export function effortStars(effortLevel: number): string {
  return effortLevel > 0 ? '★'.repeat(effortLevel) : '未入力';
}

export function pickDefaultMainMedia(media: Media[]): Media | undefined {
  const video = media.find((m) => m.type === 'video');
  return video ?? media[0];
}

export function sortSessionsByDateAsc(sessions: TrainingSession[]): TrainingSession[] {
  return [...sessions].sort((a, b) => a.date.localeCompare(b.date));
}

export function sortSessionsByDateDesc(sessions: TrainingSession[]): TrainingSession[] {
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date));
}
