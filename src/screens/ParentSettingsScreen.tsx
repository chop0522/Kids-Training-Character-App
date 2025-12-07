import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSettings'>;

export function ParentSettingsScreen({ navigation }: Props) {
  const { settings, updateSettings, setParentPin, resetAllData } = useAppStore();
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const hasPin = useMemo(() => Boolean(settings.parentPin), [settings.parentPin]);

  const handleSetInitialPin = () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      showAlert('4桁のPINを入力してください');
      return;
    }
    if (newPin !== confirmPin) {
      showAlert('PINが一致しません');
      return;
    }
    setParentPin(newPin);
    setIsAuthorized(true);
    showAlert('PINを設定しました');
  };

  const handleAuthorize = () => {
    if (!settings.parentPin) {
      setIsAuthorized(true);
      return;
    }
    if (pinInput === settings.parentPin) {
      setIsAuthorized(true);
      setPinInput('');
    } else {
      showAlert('PINが違います');
    }
  };

  const handleReset = () => {
    const message = 'この操作は元に戻せません';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(message) : false;
      if (confirmed) {
        resetAllData();
        navigation.popToTop();
      }
      return;
    }
    Alert.alert('すべてのデータをリセットしますか？', message, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセットする',
        style: 'destructive',
        onPress: () => {
          resetAllData();
          navigation.popToTop();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>親モード設定</Text>
        </View>

        {!hasPin && !isAuthorized && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>初回PIN設定（4桁）</Text>
            <TextInput
              style={styles.input}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="新しいPIN"
              placeholderTextColor={theme.colors.textDisabled}
            />
            <TextInput
              style={styles.input}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="確認用PIN"
              placeholderTextColor={theme.colors.textDisabled}
            />
            <Pressable style={styles.primaryButton} onPress={handleSetInitialPin}>
              <Text style={styles.primaryButtonText}>設定する</Text>
            </Pressable>
          </View>
        )}

        {hasPin && !isAuthorized && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>親用PINを入力</Text>
            <TextInput
              style={styles.input}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="4桁のPIN"
              placeholderTextColor={theme.colors.textDisabled}
            />
            <Pressable style={styles.primaryButton} onPress={handleAuthorize}>
              <Text style={styles.primaryButtonText}>OK</Text>
            </Pressable>
          </View>
        )}

        {isAuthorized && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>スイッチ</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>ミームスキンを表示する</Text>
                <Switch
                  value={settings.enableMemeSkins}
                  onValueChange={(v) => updateSettings({ enableMemeSkins: v })}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>ガチャ機能を有効にする</Text>
                <Switch value={settings.enableGacha} onValueChange={(v) => updateSettings({ enableGacha: v })} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>開発・テスト用</Text>
              <Pressable style={[styles.primaryButton, styles.dangerButton]} onPress={handleReset}>
                <Text style={styles.primaryButtonText}>すべてのデータをリセット</Text>
              </Pressable>
            </View>
          </>
        )}
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textMain,
    backgroundColor: theme.colors.surface,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
  },
  primaryButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  toggleLabel: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    flex: 1,
    marginRight: theme.spacing.sm,
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
