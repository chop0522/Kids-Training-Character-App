import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getSkinFullAsset, getSkinThumbAsset, hasSkinAsset } from '../assets/skinAssets';
import { resolveAssetKey } from '../characterSkinsConfig';
import { getStageIndexByFormId } from '../characterEvolutionConfig';
import { theme } from '../theme';

type BuddyAvatarProps = {
  formId: string;
  size: number;
  variant?: 'thumb' | 'full';
  showFrame?: boolean;
  showStageBadge?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
};

export function BuddyAvatar({
  formId,
  size,
  variant = 'thumb',
  showFrame = true,
  showStageBadge = true,
  backgroundColor,
  style,
}: BuddyAvatarProps) {
  const assetKey = resolveAssetKey(formId);
  const stageIndex = getStageIndexByFormId(formId) ?? 0;
  const isEvolved = stageIndex >= 1;
  const borderWidth = showFrame ? (isEvolved ? 3 : 1) : 0;
  const borderColor = isEvolved ? '#F5C542' : theme.colors.borderSoft;
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.2),
    borderWidth,
    borderColor,
    backgroundColor: backgroundColor ?? theme.colors.surfaceAlt,
  };
  const imageSource = variant === 'full' ? getSkinFullAsset(assetKey) : getSkinThumbAsset(assetKey);
  const canShow = hasSkinAsset(assetKey);

  return (
    <View style={[styles.container, avatarStyle, style]}>
      {canShow ? (
        <Image source={imageSource} style={styles.image} resizeMode="contain" />
      ) : (
        <Text style={styles.placeholder}>🧠</Text>
      )}
      {showStageBadge && isEvolved && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>★</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 28,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5C542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    color: '#5A3A00',
    fontWeight: '700',
  },
});
