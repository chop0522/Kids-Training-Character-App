import AsyncStorage from '@react-native-async-storage/async-storage';

// Increment this when breaking changes happen in persisted structure
export const APP_STATE_VERSION = 1;

// Storage key should include version for clarity
const STORAGE_KEY = `@kids_training_app/app_state_v${APP_STATE_VERSION}`;

export type PersistedEnvelope<T> = {
  version: number;
  savedAt: string; // ISO string
  state: T;
};

export async function loadPersistedState<T>(): Promise<PersistedEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedEnvelope<T>;

    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== APP_STATE_VERSION) {
      // For now: ignore mismatched versions (reset). Later we can implement migrations.
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to load persisted state', e);
    return null;
  }
}

export async function savePersistedState<T>(state: T): Promise<void> {
  try {
    const envelope: PersistedEnvelope<T> = {
      version: APP_STATE_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (e) {
    console.warn('Failed to save persisted state', e);
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear persisted state', e);
  }
}
