import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { getPrivacyText } from '../content/privacy';
import { getTermsText } from '../content/terms';
import { getSupportText } from '../content/support';

type Props = NativeStackScreenProps<SettingsStackParamList, 'LegalDocument'>;

export function LegalDocumentScreen({ navigation, route }: Props) {
  const doc = useMemo(() => {
    switch (route.params.type) {
      case 'privacy':
        return getPrivacyText();
      case 'terms':
        return getTermsText();
      case 'support':
      default:
        return getSupportText();
    }
  }, [route.params.type]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{doc.title}</Text>
        </View>
        <View style={styles.card}>
          {doc.body.split('\n').map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.bodyText}>
              {line}
            </Text>
          ))}
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
    ...theme.shadows.card,
  },
  bodyText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
});
