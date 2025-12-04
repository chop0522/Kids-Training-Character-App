import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';
import { createSeedState } from './seed';

const STORAGE_KEY = 'kids-training-app-state';

export async function loadAppState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(raw) as AppState;
  } catch (error) {
    console.warn('保存済みデータの読み込みに失敗したため、初期データを再生成します。', error);
    const seed = createSeedState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export async function saveAppState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearAppState() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
