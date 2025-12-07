import React, { useMemo } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { getAllSkins } from '../characterSkinsConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'SkinShop'>;

export function SkinShopScreen({ route, navigation }: Props) {
  const childId = route.params.childId;
  const { settings, getChildById, getOwnedSkinsForChild, purchaseSkin, rollSkinGacha } = useAppStore();
  const child = getChildById(childId);
  const ownedSkins = getOwnedSkinsForChild(childId);
  const ownedIds = new Set(ownedSkins.map((s) => s.id));

  const allSkins = useMemo(() => getAllSkins(settings.enableMemeSkins), [settings.enableMemeSkins]);

  const shopSkins = allSkins.filter(
    (s) => (s.availableIn === 'shop' || s.availableIn === 'both') && s.priceCoins !== undefined
  );
  const gachaSkins = allSkins.filter((s) => s.availableIn === 'gacha' || s.availableIn === 'both');

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.headerTitle}>子どもが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePurchase = (skinId: string) => {
    const res = purchaseSkin({ childId, skinId });
    switch (res) {
      case 'ok':
        showAlert('購入しました！', 'スキンが追加されました');
        break;
      case 'not_enough_coins':
        showAlert('コインが足りません');
        break;
      case 'already_owned':
        showAlert('すでに持っています');
        break;
      case 'not_available':
        showAlert('このスキンはショップで購入できません');
        break;
      default:
        showAlert('購入に失敗しました');
        break;
    }
  };

  const handleGacha = () => {
    const res = rollSkinGacha({ childId });
    if (res.result === 'not_enough_coins') {
      showAlert('コインが足りません', '30コイン必要です');
      return;
    }
    if (res.result === 'gacha_disabled') {
      showAlert('ガチャは無効化されています');
      return;
    }
    showAlert(
      'スキンゲット！',
      `${res.skin.name} ${res.isNew ? '（あたらしく手に入れたよ）' : '（すでに持っているスキンでした）'}`
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>ショップ</Text>
        </View>

        <Text style={styles.coinText}>所持コイン: {child.coins}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ショップ</Text>
          {shopSkins.map((skin) => {
            const owned = ownedIds.has(skin.id) || skin.isDefault;
            return (
              <View key={skin.id} style={styles.skinRow}>
                <View style={[styles.skinThumb, { backgroundColor: getSkinColor(skin.id) }]}>
                  <Text style={styles.skinEmoji}>🧠</Text>
                </View>
                <View style={styles.skinInfo}>
                  <Text style={styles.skinName}>{skin.name}</Text>
                  <Text style={styles.skinMeta}>
                    {skin.rarity} / {skin.priceCoins ?? '-'}コイン
                  </Text>
                </View>
                <Pressable
                  style={[styles.buyButton, owned && styles.buyButtonDisabled]}
                  onPress={() => handlePurchase(skin.id)}
                  disabled={owned}
                >
                  <Text style={styles.buyButtonText}>{owned ? '入手済み' : '購入'}</Text>
                </Pressable>
              </View>
            );
          })}
          {shopSkins.length === 0 && <Text style={styles.emptyText}>購入できるスキンがありません</Text>}
        </View>

        {settings.enableGacha && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ガチャ（30コイン）</Text>
            <Pressable style={styles.gachaButton} onPress={handleGacha}>
              <Text style={styles.gachaButtonText}>ガチャを回す</Text>
            </Pressable>
            <Text style={styles.gachaNote}>ラインナップ: {gachaSkins.length}種類</Text>
          </View>
        )}
        {!settings.enableGacha && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ガチャ</Text>
            <Text style={styles.emptyText}>親設定でガチャが無効化されています</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getSkinColor(skinId: string) {
  if (skinId.includes('cool') || skinId.includes('blue')) return '#DCEFFF';
  if (skinId.includes('green')) return '#E0F8E0';
  if (skinId.includes('monkey') || skinId.includes('banana')) return '#FFF5D9';
  return '#FFE5EC';
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
  coinText: {
    ...theme.typography.label,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.sm,
    textAlign: 'right',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  skinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  skinThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  skinEmoji: {
    fontSize: 24,
  },
  skinInfo: {
    flex: 1,
  },
  skinName: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  skinMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  buyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  buyButtonDisabled: {
    backgroundColor: theme.colors.borderSoft,
  },
  buyButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  gachaButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  gachaButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  gachaNote: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
});

function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}${message ? `\n${message}` : ''}`);
    } else {
      console.log(title, message);
    }
  } else {
    Alert.alert(title, message);
  }
}
