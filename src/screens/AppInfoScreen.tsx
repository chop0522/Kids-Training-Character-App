import React from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_URL } from '../constants/appLinks';
import { useParentalGate } from '../hooks/useParentalGate';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AppInfo'>;

export function AppInfoScreen({ navigation }: Props) {
  const { requestParentalGate, ParentalGate } = useParentalGate();
  const appName = Constants.expoConfig?.name ?? 'がんばりアルバム';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const openExternal = async (url: string) => {
    const ok = await requestParentalGate();
    if (!ok) return;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ParentalGate}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>アプリ情報</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>アプリ名</Text>
          <Text style={styles.value}>{appName}</Text>
          <Text style={styles.label}>バージョン</Text>
          <Text style={styles.value}>{appVersion}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>外部リンク</Text>
          <Pressable style={styles.linkButton} onPress={() => openExternal(PRIVACY_POLICY_URL)}>
            <Text style={styles.linkButtonText}>プライバシーポリシー</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => openExternal(TERMS_URL)}>
            <Text style={styles.linkButtonText}>利用規約</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => openExternal(SUPPORT_URL)}>
            <Text style={styles.linkButtonText}>サポート/お問い合わせ</Text>
          </Pressable>
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
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  value: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  linkButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  linkButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
});
