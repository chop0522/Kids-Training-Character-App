import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { SettingsStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { useParentalGate } from '../hooks/useParentalGate';
import { pickMediaFilesWeb } from '../utils/webFilePicker';
import { createBackupZip, estimateBackupMediaBytes, inspectBackupZip, restoreBackupZip } from '../services/backup/backupService';
import { downloadBytesAsFile } from '../services/backup/backupUtils';

type Props = NativeStackScreenProps<SettingsStackParamList, 'FamilySharing'>;

export function FamilySharingScreen({ navigation }: Props) {
  const { appState, importSharedState } = useAppStore();
  const [isBusy, setIsBusy] = useState(false);
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);
  const [includeMedia, setIncludeMedia] = useState(true);
  const { requestParentalGate, ParentalGate } = useParentalGate();

  const lastExportText = useMemo(() => {
    if (!lastExportedAt) return null;
    return `最終書き出し: ${formatDateTime(lastExportedAt)}`;
  }, [lastExportedAt]);

  const handleExport = async () => {
    const ok = await requestParentalGate();
    if (!ok) return;
    if (!appState) {
      Alert.alert('書き出しできません', 'データの読み込み中です。しばらくお待ちください。');
      return;
    }
    setIsBusy(true);
    try {
      if (includeMedia) {
        const estimatedBytes = await estimateBackupMediaBytes(appState);
        if (estimatedBytes > 200 * 1024 * 1024) {
          const message =
            '写真・動画を含むためサイズが大きくなります。時間がかかる場合があります。続行しますか？';
          if (Platform.OS === 'web') {
            const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(message) : false;
            if (!confirmed) return;
          } else {
            const confirmed = await new Promise<boolean>((resolve) => {
              Alert.alert('サイズ警告', message, [
                { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
                { text: '続行', onPress: () => resolve(true) },
              ]);
            });
            if (!confirmed) return;
          }
        }
      }
      const result = await createBackupZip({ state: appState, includeMedia });
      if (Platform.OS === 'web') {
        if (result.data) {
          downloadBytesAsFile(result.data, result.fileName);
        }
      } else if (result.uri) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/zip' });
      }
      setLastExportedAt(result.exportedAtISO);
    } catch (e) {
      Alert.alert('書き出しに失敗しました', 'もう一度お試しください。');
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    const ok = await requestParentalGate();
    if (!ok) return;
    setIsBusy(true);
    try {
      const picked = await pickBackupZip();
      if (!picked) return;
      const preview = await inspectBackupZip(picked);
      const summaryText = formatBackupSummary(preview.stats);
      const message = `${summaryText}\n\n読み込むとこの端末のデータは上書きされます。`;
      if (Platform.OS === 'web') {
        const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(message) : false;
        if (!confirmed) return;
        const restored = await restoreBackupZip(picked);
        importSharedState(restored.state);
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
          onPress: async () => {
            const restored = await restoreBackupZip(picked);
            importSharedState(restored.state);
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
        {ParentalGate}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>家族共有（β）</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>家族共有（β）</Text>
          <Text style={styles.cardText}>この機能はデータを書き出して、別の端末で読み込む方式です。</Text>
          <Text style={styles.cardText}>写真/動画を含めるとサイズが大きくなる場合があります。</Text>
          <Text style={styles.cardText}>PINは共有されません（端末ごと）</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>書き出し</Text>
          <Text style={styles.cardText}>現在のデータをZIPファイルとして共有します。</Text>
          <View style={styles.switchRow}>
            <Text style={styles.cardText}>写真/動画を含める</Text>
            <Switch value={includeMedia} onValueChange={setIncludeMedia} />
          </View>
          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={isBusy}
          >
            <Text style={styles.primaryButtonText}>バックアップを書き出す</Text>
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
            <Text style={styles.secondaryButtonText}>バックアップを読み込む</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

async function pickBackupZip(): Promise<{ uri?: string; data?: Uint8Array; fileName?: string } | null> {
  if (Platform.OS === 'web') {
    const files = await pickMediaFilesWeb({ accept: '.zip,application/zip', multiple: false });
    const file = files[0];
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    return { data: new Uint8Array(buffer), fileName: file.name };
  }
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return null;
  const uri = res.assets?.[0]?.uri;
  return uri ? { uri } : null;
}

function formatBackupSummary(summary: {
  childrenCount: number;
  sessionsCount: number;
  attachmentsCount: number;
  imageCount: number;
  videoCount: number;
}) {
  return [
    `子ども: ${summary.childrenCount}人`,
    `記録: ${summary.sessionsCount}件`,
    `添付: ${summary.attachmentsCount}件（写真${summary.imageCount} / 動画${summary.videoCount}）`,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
