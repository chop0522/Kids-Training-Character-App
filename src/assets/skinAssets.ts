import type { ImageSourcePropType } from 'react-native';
import { skinFullAssets, skinThumbAssets } from './skinAssets.generated';

const transparentPixel: ImageSourcePropType = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ZkAAAAASUVORK5CYII=',
};

export function hasSkinAsset(assetKey: string): boolean {
  return !!skinFullAssets[assetKey];
}

export function getSkinFullAsset(assetKey: string): ImageSourcePropType {
  return skinFullAssets[assetKey] ?? transparentPixel;
}

export function getSkinThumbAsset(assetKey: string): ImageSourcePropType {
  return skinThumbAssets[assetKey] ?? skinFullAssets[assetKey] ?? transparentPixel;
}
