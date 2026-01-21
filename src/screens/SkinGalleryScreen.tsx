import React, { useMemo } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { getAllSkins } from '../characterSkinsConfig';
import { getSkinThumbAsset, hasSkinAsset } from '../assets/skinAssets';
import { theme } from '../theme';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SkinGallery'>;

export function SkinGalleryScreen({ navigation }: Props) {
  const { settings } = useAppStore();
  const skins = useMemo(() => getAllSkins(settings.enableMemeSkins), [settings.enableMemeSkins]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>スキン画像チェック</Text>
        </View>

        <View style={styles.grid}>
          {skins.map((skin) => {
            const assetExists = hasSkinAsset(skin.assetKey);
            return (
              <View key={skin.id} style={styles.gridItem}>
                <View style={styles.thumbContainer}>
                  {assetExists ? (
                    <Image
                      source={getSkinThumbAsset(skin.assetKey)}
                      style={styles.thumbImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.thumbPlaceholder, styles.thumbPlaceholderMissing]}>
                      <Text style={styles.thumbPlaceholderText}>MISSING</Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.skinName} numberOfLines={1}>
                    {skin.name}
                  </Text>
                  <Text style={[styles.statusBadge, assetExists ? styles.statusOk : styles.statusMissing]}>
                    {assetExists ? 'OK' : 'MISSING'}
                  </Text>
                </View>
                <Text style={styles.metaText} numberOfLines={1}>
                  {formatSkinMeta(skin)}
                </Text>
                <Text style={styles.assetKey} numberOfLines={1}>
                  {skin.assetKey}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  backText: {
    ...theme.typography.body,
    color: theme.colors.accent,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  thumbContainer: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderMissing: {
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  thumbPlaceholderText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skinName: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  assetKey: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  statusBadge: {
    ...theme.typography.caption,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    color: '#fff',
  },
  statusOk: {
    backgroundColor: theme.colors.success,
  },
  statusMissing: {
    backgroundColor: theme.colors.danger,
  },
});

function formatSkinMeta(skin: { category: string; unlockMethod: string; minLevel?: number; shopCost?: number; gachaWeight?: number }) {
  const parts = [skin.category, skin.unlockMethod];
  if (skin.minLevel) parts.push(`Lv.${skin.minLevel}+`);
  if (skin.shopCost) parts.push(`${skin.shopCost}c`);
  if (skin.gachaWeight) parts.push(`w${skin.gachaWeight}`);
  return parts.join(' / ');
}
