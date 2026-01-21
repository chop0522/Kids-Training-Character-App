import React, { useMemo } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BuddyStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { getAllBuddyForms } from '../characterEvolutionConfig';
import { BuddyAvatar } from '../components/BuddyAvatar';
import { getSkinById } from '../characterSkinsConfig';

type Props = NativeStackScreenProps<BuddyStackParamList, 'Encyclopedia'>;

export function BuddyEncyclopediaScreen({ navigation, route }: Props) {
  const { selectedChildId, getChildById, appState } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;

  const forms = useMemo(() => getAllBuddyForms(), []);
  const discoveredSet = new Set(appState?.discoveredFormIdsByChildId?.[childId ?? ''] ?? []);
  const ownedSet = new Set(
    appState?.ownedSkins?.filter((owned) => owned.childId === (childId ?? '')).map((owned) => owned.skinId) ?? []
  );

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>子どもが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>図鑑</Text>
      </View>
      <FlatList
        data={forms}
        keyExtractor={(item) => item.formId}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const discovered = discoveredSet.has(item.formId);
          const isMemory = discovered && !ownedSet.has(item.formId);
          const backgroundColor = getSkinColor(item.formId);
          return (
            <View style={[styles.card, !discovered && styles.cardLocked]}>
              <View style={styles.thumbBox}>
                {discovered ? (
                  <BuddyAvatar
                    formId={item.formId}
                    size={100}
                    backgroundColor={backgroundColor}
                    showFrame
                    showStageBadge
                  />
                ) : (
                  <Text style={styles.lockedText}>？</Text>
                )}
              </View>
              <Text style={styles.cardTitle}>{discovered ? item.displayName : '？？？'}</Text>
              {discovered && isMemory && <Text style={styles.cardBadge}>思い出</Text>}
              {!discovered && <Text style={styles.cardBadge}>未発見</Text>}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function getSkinColor(skinId: string) {
  const skin = getSkinById(skinId);
  switch (skin?.category) {
    case 'study':
      return '#E6F3FF';
    case 'exercise':
      return '#E8F8EE';
    case 'default':
    default:
      return '#FFE5EC';
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  backText: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    margin: theme.spacing.xs,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  cardLocked: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  thumbBox: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  lockedText: {
    fontSize: 36,
    color: theme.colors.textDisabled,
  },
  cardTitle: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  cardBadge: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
});
