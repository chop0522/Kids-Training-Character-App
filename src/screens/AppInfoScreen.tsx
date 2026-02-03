import React from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { useParentalGate } from '../hooks/useParentalGate';
import { buildPublicWebUrl, getPublicWebBaseUrl, PUBLIC_WEB_PATHS } from '../config/publicWeb';
import { SUPPORT_EMAIL } from '../config/legalLinks';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AppInfo'>;

export function AppInfoScreen({ navigation }: Props) {
  const { requestParentalGate, ParentalGate } = useParentalGate();
  const appName = Constants.expoConfig?.name ?? 'がんばりアルバム';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const baseUrl = getPublicWebBaseUrl();
  const hasBaseUrl = Boolean(baseUrl);

  const openExternal = async (url: string) => {
    const ok = await requestParentalGate();
    if (!ok) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const openMail = async () => {
    const ok = await requestParentalGate();
    if (!ok) return;
    const mailto = `mailto:${SUPPORT_EMAIL}`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(mailto);
      }
      return;
    }
    await WebBrowser.openBrowserAsync(mailto);
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
          <Text style={styles.label}>お問い合わせ</Text>
          <Text style={styles.value}>{SUPPORT_EMAIL}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>アプリ内文書</Text>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}>
            <Text style={styles.linkButtonText}>プライバシーポリシー</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}>
            <Text style={styles.linkButtonText}>利用規約</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('LegalDocument', { type: 'support' })}>
            <Text style={styles.linkButtonText}>サポート/お問い合わせ</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={openMail}>
            <Text style={styles.linkButtonText}>メールで問い合わせる</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>外部リンク</Text>
          <Pressable
            style={[styles.linkButton, !hasBaseUrl && styles.linkButtonDisabled]}
            onPress={() => openExternal(buildPublicWebUrl(PUBLIC_WEB_PATHS.privacy))}
            disabled={!hasBaseUrl}
          >
            <Text style={styles.linkButtonText}>プライバシーポリシー</Text>
          </Pressable>
          <Pressable
            style={[styles.linkButton, !hasBaseUrl && styles.linkButtonDisabled]}
            onPress={() => openExternal(buildPublicWebUrl(PUBLIC_WEB_PATHS.terms))}
            disabled={!hasBaseUrl}
          >
            <Text style={styles.linkButtonText}>利用規約</Text>
          </Pressable>
          <Pressable
            style={[styles.linkButton, !hasBaseUrl && styles.linkButtonDisabled]}
            onPress={() => openExternal(buildPublicWebUrl(PUBLIC_WEB_PATHS.support))}
            disabled={!hasBaseUrl}
          >
            <Text style={styles.linkButtonText}>サポート/お問い合わせ</Text>
          </Pressable>
          {!hasBaseUrl ? (
            <Text style={styles.helperText}>外部URL未設定（GitHub Pages公開後に設定してください）</Text>
          ) : null}
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
  linkButtonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
});
