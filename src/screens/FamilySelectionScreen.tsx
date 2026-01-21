import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilySelection'>;

export function FamilySelectionScreen({ navigation }: Props) {
  const { children, selectChild, addChild, getActiveBuddyKeyForChild, getBuddyProgressForChild } = useAppStore();

  const handleSelect = (childId: string) => {
    selectChild(childId);
    navigation.navigate('MainTabs');
  };

  const handleAddChild = async () => {
    const name = `ニューキッズ${children.length + 1}`;
    const created = await addChild(name);
    if (created) {
      navigation.navigate('MainTabs');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>だれのマイページに行く？</Text>
      <Text style={styles.subtitle}>トレーニングする子を選んでね</Text>

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => handleSelect(item.id)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                相棒Lv.{getBuddyProgressForChild(item.id, getActiveBuddyKeyForChild(item.id))?.level ?? 1} ・ {item.coins} コイン
              </Text>
              <Text style={styles.streak}>連続 {item.currentStreak} 日</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </Pressable>
        )}
      />

      <PrimaryButton title="＋ 子どもを追加" onPress={handleAddChild} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
  },
  list: {
    paddingVertical: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  cardBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
  },
  streak: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 16,
    color: colors.muted,
  },
});
