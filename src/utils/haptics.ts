import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function safeSelection(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {
    return;
  }
}

export async function safeSuccess(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    return;
  }
}
