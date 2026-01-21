import { Media, TrainingSession } from '../types';

export function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

export function formatDateYmd(iso: string): string {
  const ymd = getLocalDateKeyFromIso(iso);
  const [y, m, d] = ymd.split('-');
  return `${y}/${m}/${d}`;
}

export function effortStars(effortLevel: 1 | 2 | 3): string {
  return '★'.repeat(effortLevel);
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
