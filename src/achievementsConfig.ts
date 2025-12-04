import { Achievement, AchievementKey } from './types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_session',
    key: 'first_session',
    title: 'はじめの一歩',
    description: 'トレーニングをはじめて1回記録したよ',
    iconEmoji: '👣',
  },
  {
    id: 'sessions_10',
    key: 'sessions_10',
    title: 'れんしゅう名人',
    description: 'トレーニングを10回記録したよ',
    iconEmoji: '🎯',
  },
  {
    id: 'total_minutes_100',
    key: 'total_minutes_100',
    title: '100分チャレンジ',
    description: '合計100分トレーニングしたよ',
    iconEmoji: '⏱️',
  },
  {
    id: 'streak_3',
    key: 'streak_3',
    title: '3日れんぞく',
    description: '3日連続でトレーニングを記録したよ',
    iconEmoji: '🔥',
  },
  {
    id: 'streak_7',
    key: 'streak_7',
    title: '7日れんぞく',
    description: '7日連続でトレーニングを記録したよ',
    iconEmoji: '🔥🔥',
  },
  {
    id: 'map_nodes_3',
    key: 'map_nodes_3',
    title: '道をひらくもの',
    description: 'マップのマスを3つクリアしたよ',
    iconEmoji: '🗺️',
  },
  {
    id: 'map_stage0_complete',
    key: 'map_stage0_complete',
    title: 'キャンプ場マスター',
    description: 'さいしょのステージ「キャンプ場」をクリアしたよ',
    iconEmoji: '🏕️',
  },
];

export function getAchievementByKey(key: AchievementKey): Achievement {
  const found = ACHIEVEMENTS.find((a) => a.key === key);
  if (!found) {
    throw new Error(`Unknown achievement key: ${key}`);
  }
  return found;
}
