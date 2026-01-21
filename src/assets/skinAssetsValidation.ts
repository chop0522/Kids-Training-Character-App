import { CHARACTER_SKINS } from '../characterSkinsConfig';
import { hasSkinAsset } from './skinAssets';

export function warnMissingSkinAssets(settingsEnableMemeSkins: boolean) {
  const skinsToCheck = settingsEnableMemeSkins
    ? CHARACTER_SKINS
    : CHARACTER_SKINS.filter((skin) => skin.unlockMethod === 'default' || skin.unlockMethod === 'evolution');

  skinsToCheck.forEach((skin) => {
    if (!hasSkinAsset(skin.assetKey)) {
      console.warn(`[skinAssets] Missing asset for skin ${skin.id} (assetKey: ${skin.assetKey})`);
    }
  });
}
