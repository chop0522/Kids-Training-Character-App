import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecordStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { buildTagFrequency, formatTag, normalizeTag, normalizeTags, parseTagsFromText, uniqueTags } from '../utils/tagUtils';

type Props = NativeStackScreenProps<RecordStackParamList, 'RecordSearch'>;

export function RecordSearchScreen({ navigation, route }: Props) {
  const { selectedChildId, getChildById, getSessionsForChild, activities } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;
  const initialTag = route.params?.initialTag;
  const initialQuery = route.params?.initialQuery ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialTag ? normalizeTags([initialTag]) : []
  );

  useEffect(() => {
    if (!initialTag) return;
    setSelectedTags((prev) => uniqueTags([...prev, normalizeTag(initialTag)]));
  }, [initialTag]);

  const sessions = useMemo(() => (childId ? getSessionsForChild(childId) : []), [childId, getSessionsForChild]);
  const activityMap = useMemo(() => new Map(activities.map((activity) => [activity.id, activity])), [activities]);

  const frequentTags = useMemo(() => buildTagFrequency(sessions, 12), [sessions]);
  const suggestionTags = useMemo(() => {
    const merged = uniqueTags(frequentTags);
    const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));
    return merged.filter((tag) => !selected.has(tag.toLowerCase()));
  }, [frequentTags, selectedTags]);

  const addTagsFromInput = () => {
    const parsed = parseTagsFromText(tagInput);
    if (parsed.length === 0) return;
    setSelectedTags((prev) => uniqueTags([...prev, ...parsed]));
    setTagInput('');
  };

  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    setSelectedTags((prev) => uniqueTags([...prev, normalized]));
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((item) => item !== tag));
  };

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return sessions
      .filter((session) => {
        if (selectedTags.length > 0) {
          const tagSet = new Set((session.tags ?? []).map((tag) => tag.toLowerCase()));
          if (!selectedTags.every((tag) => tagSet.has(tag.toLowerCase()))) return false;
        }
        if (!keyword) return true;
        const activity = activityMap.get(session.activityId);
        const tagText = (session.tags ?? []).map((tag) => formatTag(tag)).join(' ');
        const haystack = `${activity?.name ?? ''} ${session.note ?? ''} ${tagText}`.toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [sessions, selectedTags, query, activityMap]);

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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>検索</Text>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.label}>キーワード</Text>
          <TextInput
            style={styles.textInput}
            value={query}
            onChangeText={setQuery}
            placeholder="メモや種目名で検索"
            placeholderTextColor={theme.colors.textDisabled}
          />

          <Text style={[styles.label, styles.sectionSpacing]}>タグ</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.textInput, styles.tagInput]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="#体幹 #宿題 など"
              placeholderTextColor={theme.colors.textDisabled}
              onSubmitEditing={addTagsFromInput}
              returnKeyType="done"
            />
            <Pressable style={styles.tagAddButton} onPress={addTagsFromInput}>
              <Text style={styles.tagAddButtonText}>追加</Text>
            </Pressable>
          </View>

          {selectedTags.length > 0 ? (
            <View style={styles.tagList}>
              {selectedTags.map((tag) => (
                <Pressable key={tag} style={styles.tagChip} onPress={() => removeTag(tag)}>
                  <Text style={styles.tagChipText}>{formatTag(tag)}</Text>
                  <Text style={styles.tagRemoveText}>×</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>タグを選ぶと絞り込めます</Text>
          )}

          {suggestionTags.length > 0 && (
            <View style={styles.tagSuggestions}>
              {suggestionTags.map((tag) => (
                <Pressable key={tag} style={styles.tagSuggestion} onPress={() => addTag(tag)}>
                  <Text style={styles.tagSuggestionText}>{formatTag(tag)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>結果</Text>
          <Text style={styles.sectionSub}>{results.length}件</Text>
        </View>

        {results.length === 0 && <Text style={styles.emptyText}>条件に合う記録がありません</Text>}

        {results.map((session) => {
          const activity = activityMap.get(session.activityId);
          return (
            <Pressable
              key={session.id}
              style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
              onPress={() => navigation.navigate('SessionDetail', { childId: child.id, sessionId: session.id })}
            >
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                <Text style={styles.sessionTitle}>
                  {activity?.iconKey ?? '⭐️'} {activity?.name ?? 'トレーニング'}
                </Text>
                <Text style={styles.sessionMeta}>
                  {session.durationMinutes}分 / {'★'.repeat(session.effortLevel)}
                </Text>
                {session.tags.length > 0 && (
                  <View style={styles.sessionTags}>
                    {session.tags.map((tag) => (
                      <View key={tag} style={styles.sessionTagChip}>
                        <Text style={styles.sessionTagText}>{formatTag(tag)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(dateIso: string) {
  try {
    const d = new Date(dateIso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch (e) {
    return dateIso;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
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
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  searchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  sectionSpacing: {
    marginTop: theme.spacing.md,
  },
  textInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textMain,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tagInput: {
    flex: 1,
  },
  tagAddButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tagAddButtonText: {
    ...theme.typography.label,
    color: '#FFFFFF',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    gap: theme.spacing.xs,
  },
  tagChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
  tagRemoveText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  tagSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagSuggestion: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  tagSuggestionText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  emptyHint: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  sectionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  pressed: {
    opacity: 0.95,
  },
  sessionInfo: {
    gap: 4,
  },
  sessionDate: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  sessionTitle: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  sessionMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  sessionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  sessionTagChip: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  sessionTagText: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
});
