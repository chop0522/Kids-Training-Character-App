import { CharacterSkin } from './types';

export const CHARACTER_SKINS: CharacterSkin[] = [
  {
    id: 'brain_default_pink',
    name: 'ピンクブレイン',
    type: 'original',
    rarity: 'common',
    isDefault: true,
    priceCoins: undefined,
    availableIn: 'shop',
    assetKey: 'brain_default_pink',
  },
  {
    id: 'brain_cool_blue',
    name: 'クールブルー',
    type: 'original',
    rarity: 'common',
    isDefault: false,
    priceCoins: 80,
    availableIn: 'shop',
    assetKey: 'brain_cool_blue',
  },
  {
    id: 'brain_green_stamina',
    name: 'スタミナグリーン',
    type: 'original',
    rarity: 'rare',
    isDefault: false,
    priceCoins: 150,
    availableIn: 'shop',
    assetKey: 'brain_green_stamina',
  },
  {
    id: 'monkey_banana_pixel',
    name: 'バナナモンキー',
    type: 'meme',
    rarity: 'epic',
    isDefault: false,
    priceCoins: undefined,
    availableIn: 'gacha',
    assetKey: 'monkey_banana_pixel',
  },
];

export function getAllSkins(includeMeme: boolean): CharacterSkin[] {
  return CHARACTER_SKINS.filter((skin) => (includeMeme ? true : skin.type !== 'meme'));
}

export function getSkinById(id: string): CharacterSkin | undefined {
  return CHARACTER_SKINS.find((s) => s.id === id);
}
