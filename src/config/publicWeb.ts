import Constants from 'expo-constants';

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getPublicWebBaseUrl(): string {
  const base = Constants.expoConfig?.extra?.publicWebBaseUrl;
  if (typeof base !== 'string') return '';
  return normalizeBaseUrl(base);
}

export function buildPublicWebUrl(path: string): string {
  const base = getPublicWebBaseUrl();
  if (!base) return '';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${cleanPath}`;
}

export const PUBLIC_WEB_PATHS = {
  privacy: 'privacy.html',
  terms: 'terms.html',
  support: 'support.html',
  home: 'index.html',
};
