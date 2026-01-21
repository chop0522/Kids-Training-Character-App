import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { buildSharePackage } from '../sharing/sharePackage';
import { pickShareFile, readSharePackageFromUri, shareFile, writeShareFile } from '../sharing/shareFileService';

type Props = NativeStackScreenProps<SettingsStackParamList, 'FamilySharing'>;

export function FamilySharingScreen({ navigation }: Props) {
  const { appState, importSharedState } = useAppStore();
  const [isBusy, setIsBusy] = useState(false);
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);

  const lastExportText = useMemo(() => {
    if (!lastExportedAt) return null;
    return `最終書き出し: ${formatDateTime(lastExportedAt)}`;
  }, [lastExportedAt]);

  const handleExport = async () => {
    if (!appState) {
      Alert.alert('書き出しできません', 'データの読み込み中です。しばらくお待ちください。');
      return;
    }
    setIsBusy(true);
    try {
      const pkg = buildSharePackage({ state: appState });
      const path = await writeShareFile(pkg);
      await shareFile(path);
      setLastExportedAt(pkg.exportedAt);
    } catch (e) {
      Alert.alert('書き出しに失敗しました', 'もう一度お試しください。');
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    setIsBusy(true);
    try {
      const uri = await pickShareFile();
      if (!uri) return;
      const pkg = await readSharePackageFromUri(uri);
      if (!pkg) {
        Alert.alert('読み込みに失敗しました', '共有データが正しくありません。');
        return;
      }
      const summaryText = formatSummary(pkg.summary);
      const message = `${summaryText}\n\n読み込むとこの端末のデータは上書きされます。`;
      if (Platform.OS === 'web') {
        const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(message) : false;
        if (!confirmed) return;
        importSharedState(pkg.state);
        if (typeof window !== 'undefined' && window.alert) {
          window.alert('読み込みが完了しました。');
        }
        return;
      }
      Alert.alert('読み込み確認', message, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '読み込む（上書き）',
          style: 'destructive',
          onPress: () => {
            importSharedState(pkg.state);
            Alert.alert('読み込み完了', 'データを読み込みました。');
          },
        },
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>家族共有（β）</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>家族共有（β）</Text>
          <Text style={styles.cardText}>
            この機能はデータを書き出して、別の端末で読み込む方式です。
          </Text>
          <Text style={styles.cardText}>写真/動画ファイルは共有されません（今後クラウドで対応予定）</Text>
          <Text style={styles.cardText}>PINは共有されません（端末ごと）</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>書き出し</Text>
          <Text style={styles.cardText}>現在のデータをJSONファイルとして共有します。</Text>
          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={isBusy}
          >
            <Text style={styles.primaryButtonText}>データを書き出して共有する</Text>
          </Pressable>
          {lastExportText ? <Text style={styles.cardSubText}>{lastExportText}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>読み込み</Text>
          <Text style={styles.cardText}>共有データを読み込むと、この端末のデータは上書きされます。</Text>
          <Pressable
            style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={isBusy}
          >
            <Text style={styles.secondaryButtonText}>共有データを読み込む</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatSummary(summary: {
  childrenCount: number;
  sessionsCount: number;
  activitiesCount: number;
  achievementsCount: number;
  mapNodesCount: number;
  ownedSkinsCount: number;
}) {
  return [
    `子ども: ${summary.childrenCount}人`,
    `記録: ${summary.sessionsCount}件`,
    `アクティビティ: ${summary.activitiesCount}件`,
    `バッジ解除: ${summary.achievementsCount}件`,
    `マップ: ${summary.mapNodesCount}マス`,
    `スキン: ${summary.ownedSkinsCount}個`,
  ].join('\n');
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
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
  cardText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    marginBottom: theme.spacing.xs,
  },
  cardSubText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  secondaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  secondaryButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
});
