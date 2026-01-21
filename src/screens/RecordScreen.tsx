import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecordStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import type { Media } from '../types';
import { getLocalDateKey, getSessionDateKey } from '../utils/sessionUtils';
import { formatTag } from '../utils/tagUtils';

type Props = NativeStackScreenProps<RecordStackParamList, 'Record'>;

type ViewMode = 'calendar' | 'timeline';
type SelectedDate = 'all' | string;

type CalendarCell = {
  dateKey: string;
  label: number;
  count: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

export function RecordScreen({ navigation, route }: Props) {
  const { selectedChildId, getChildById, getSessionsForChild, getMediaForSession, activities } = useAppStore();
  const childId = route.params?.childId ?? selectedChildId ?? null;
  const child = childId ? getChildById(childId) : undefined;
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<SelectedDate>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getLocalDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const didInitRef = useRef(false);

  const sessions = useMemo(() => {
    if (!childId) return [];
    return getSessionsForChild(childId).sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [childId, getSessionsForChild]);

  const dateCounts = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, session) => {
      const key = getSessionDateKey(session);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [sessions]);

  const todayKey = useMemo(() => getLocalDateKey(new Date()), []);
  const dateOptions = useMemo(() => {
    const options: Array<{ key: string; label: string; count: number; isToday: boolean }> = [];
    for (let i = 0; i < 14; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = getLocalDateKey(date);
      const label = formatShortDate(date);
      options.push({ key, label, count: dateCounts[key] ?? 0, isToday: key === todayKey });
    }
    return options;
  }, [dateCounts, todayKey]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (dateCounts[todayKey]) {
      setSelectedTimelineDate(todayKey);
    }
  }, [dateCounts, todayKey]);

  const filteredSessions = useMemo(() => {
    if (selectedTimelineDate === 'all') return sessions;
    return sessions.filter((session) => getSessionDateKey(session) === selectedTimelineDate);
  }, [sessions, selectedTimelineDate]);

  const activityMap = useMemo(() => {
    const map = new Map(activities.map((activity) => [activity.id, activity]));
    return map;
  }, [activities]);

  useEffect(() => {
    if (isDateKeyInMonth(selectedCalendarDate, calendarMonth)) return;
    const firstKey = findFirstDateKeyInMonth(dateCounts, calendarMonth);
    if (firstKey) {
      setSelectedCalendarDate(firstKey);
      return;
    }
    setSelectedCalendarDate(getLocalDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)));
  }, [calendarMonth, dateCounts, selectedCalendarDate]);

  const calendarWeeks = useMemo(
    () => buildCalendarWeeks(calendarMonth, dateCounts, selectedCalendarDate, todayKey),
    [calendarMonth, dateCounts, selectedCalendarDate, todayKey]
  );
  const calendarLabel = useMemo(() => formatMonthLabel(calendarMonth), [calendarMonth]);

  const calendarSessions = useMemo(() => {
    return sessions
      .filter((session) => getSessionDateKey(session) === selectedCalendarDate)
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [sessions, selectedCalendarDate]);

  const openSearch = () => {
    if (!childId) return;
    navigation.navigate('RecordSearch', { childId });
  };

  const openSearchWithTag = (tag: string) => {
    if (!childId) return;
    navigation.navigate('RecordSearch', { childId, initialTag: tag });
  };

  const goPrevMonth = () => {
    const next = new Date(calendarMonth);
    next.setMonth(next.getMonth() - 1);
    setCalendarMonth(next);
  };

  const goNextMonth = () => {
    const next = new Date(calendarMonth);
    next.setMonth(next.getMonth() + 1);
    setCalendarMonth(next);
  };

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
          <Text style={styles.headerTitle}>{child.name}のきろく</Text>
          <Pressable onPress={openSearch} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
            <Text style={styles.searchIcon}>🔍</Text>
          </Pressable>
        </View>

        <PrimaryButton
          title="⭐ トレーニングを記録する"
          onPress={() => navigation.navigate('TrainingLog', { childId: child.id })}
          style={styles.primaryButton}
        />

        <View style={styles.segmentRow}>
          {(['calendar', 'timeline'] as ViewMode[]).map((mode) => {
            const selected = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {mode === 'calendar' ? 'カレンダー' : 'タイムライン'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {viewMode === 'calendar' ? (
          <>
            <View style={styles.calendarHeader}>
              <Pressable onPress={goPrevMonth} style={styles.calendarNav}>
                <Text style={styles.calendarNavText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>{calendarLabel}</Text>
              <Pressable onPress={goNextMonth} style={styles.calendarNav}>
                <Text style={styles.calendarNavText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekHeader}>
              {['日', '月', '火', '水', '木', '金', '土'].map((label) => (
                <Text key={label} style={styles.weekHeaderText}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, index) => (
                <View key={`week-${index}`} style={styles.weekRow}>
                  {week.map((cell) => (
                    <Pressable
                      key={cell.dateKey}
                      onPress={() => cell.isCurrentMonth && setSelectedCalendarDate(cell.dateKey)}
                      style={[
                        styles.dayCell,
                        !cell.isCurrentMonth && styles.dayCellMuted,
                        cell.isSelected && styles.dayCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          cell.isToday && styles.dayLabelToday,
                          !cell.isCurrentMonth && styles.dayLabelMuted,
                          cell.isSelected && styles.dayLabelSelected,
                        ]}
                      >
                        {cell.label}
                      </Text>
                      {cell.count > 0 && (
                        <View style={styles.dayDot}>
                          <Text style={styles.dayDotText}>{cell.count}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{formatDateKey(selectedCalendarDate)}</Text>
              <Text style={styles.sectionSub}>{calendarSessions.length}件</Text>
            </View>

            {calendarSessions.length === 0 && <Text style={styles.emptyText}>この日の記録がありません</Text>}

            {calendarSessions.map((session) => {
              const activity = activityMap.get(session.activityId);
              const media = getMediaForSession(session.id);
              const thumb = pickThumbnail(media);
              return (
                <Pressable
                  key={session.id}
                  style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('SessionDetail', { childId: child.id, sessionId: session.id })}
                >
                  <View style={styles.thumbBox}>
                    {thumb ? (
                      thumb.type === 'photo' ? (
                        <Image source={{ uri: thumb.localUri }} style={styles.thumbImage} />
                      ) : (
                        <View style={styles.thumbVideo}>
                          <Text style={styles.thumbVideoIcon}>▶</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Text style={styles.thumbPlaceholderText}>なし</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                    <Text style={styles.sessionTitle}>
                      {activity?.iconKey ?? '⭐️'} {activity?.name ?? 'トレーニング'}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {session.durationMinutes}分 / {'★'.repeat(session.effortLevel)}
                    </Text>
                    {session.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {session.tags.map((tag) => (
                          <Pressable key={tag} style={styles.tagChip} onPress={() => openSearchWithTag(tag)}>
                            <Text style={styles.tagChipText}>{formatTag(tag)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            <View style={styles.dateStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  style={[styles.dateChip, selectedTimelineDate === 'all' && styles.dateChipSelected]}
                  onPress={() => setSelectedTimelineDate('all')}
                >
                  <Text style={[styles.dateChipText, selectedTimelineDate === 'all' && styles.dateChipTextSelected]}>
                    すべて
                  </Text>
                  <Text style={[styles.dateCount, selectedTimelineDate === 'all' && styles.dateCountSelected]}>
                    {sessions.length}
                  </Text>
                </Pressable>
                {dateOptions.map((option) => {
                  const selected = selectedTimelineDate === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.dateChip, selected && styles.dateChipSelected]}
                      onPress={() => setSelectedTimelineDate(option.key)}
                    >
                      <Text style={[styles.dateChipText, selected && styles.dateChipTextSelected]}>
                        {option.isToday ? 'きょう' : option.label}
                      </Text>
                      {option.count > 0 && <View style={styles.dateDot} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>タイムライン</Text>
              <Text style={styles.sectionSub}>{filteredSessions.length}件</Text>
            </View>

            {filteredSessions.length === 0 && <Text style={styles.emptyText}>まだ記録がありません</Text>}

            {filteredSessions.map((session) => {
              const activity = activityMap.get(session.activityId);
              const media = getMediaForSession(session.id);
              const thumb = pickThumbnail(media);
              return (
                <Pressable
                  key={session.id}
                  style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('SessionDetail', { childId: child.id, sessionId: session.id })}
                >
                  <View style={styles.thumbBox}>
                    {thumb ? (
                      thumb.type === 'photo' ? (
                        <Image source={{ uri: thumb.localUri }} style={styles.thumbImage} />
                      ) : (
                        <View style={styles.thumbVideo}>
                          <Text style={styles.thumbVideoIcon}>▶</Text>
                        </View>
                      )
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Text style={styles.thumbPlaceholderText}>なし</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                    <Text style={styles.sessionTitle}>
                      {activity?.iconKey ?? '⭐️'} {activity?.name ?? 'トレーニング'}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {session.durationMinutes}分 / {'★'.repeat(session.effortLevel)}
                    </Text>
                    {session.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {session.tags.map((tag) => (
                          <Pressable key={tag} style={styles.tagChip} onPress={() => openSearchWithTag(tag)}>
                            <Text style={styles.tagChipText}>{formatTag(tag)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function pickThumbnail(media: Media[]) {
  const video = media.find((m) => m.type === 'video');
  if (video) return video;
  return media[0];
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

function formatShortDate(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split('-');
  if (!y || !m || !d) return dateKey;
  return `${y}/${m}/${d}`;
}

function isDateKeyInMonth(dateKey: string, monthDate: Date) {
  const [y, m] = dateKey.split('-');
  if (!y || !m) return false;
  return Number(y) === monthDate.getFullYear() && Number(m) === monthDate.getMonth() + 1;
}

function findFirstDateKeyInMonth(dateCounts: Record<string, number>, monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    const key = getLocalDateKey(new Date(year, month, day));
    if (dateCounts[key]) return key;
  }
  return null;
}

function buildCalendarWeeks(
  monthDate: Date,
  dateCounts: Record<string, number>,
  selectedDateKey: string,
  todayKey: string
): CalendarCell[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startOffset);
  const weeks: CalendarCell[][] = [];

  for (let week = 0; week < 6; week += 1) {
    const days: CalendarCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + week * 7 + day);
      const dateKey = getLocalDateKey(cellDate);
      const isCurrentMonth = cellDate.getMonth() === month;
      days.push({
        dateKey,
        label: cellDate.getDate(),
        count: dateCounts[dateKey] ?? 0,
        isCurrentMonth,
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDateKey,
      });
    }
    weeks.push(days);
  }

  return weeks;
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
  pressed: {
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 18,
  },
  primaryButton: {
    marginBottom: theme.spacing.lg,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  segmentButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    ...theme.typography.label,
    color: theme.colors.textSub,
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  calendarNav: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  calendarTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  weekHeaderText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    textAlign: 'center',
    flex: 1,
  },
  calendarGrid: {
    marginBottom: theme.spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
    marginVertical: 2,
  },
  dayCellMuted: {
    opacity: 0.4,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayLabel: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  dayLabelToday: {
    color: theme.colors.accent,
  },
  dayLabelMuted: {
    color: theme.colors.textSub,
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  dayDot: {
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dayDotText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
  },
  dateStrip: {
    marginBottom: theme.spacing.md,
  },
  dateChip: {
    minWidth: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  dateChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dateChipText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  dateChipTextSelected: {
    color: '#FFFFFF',
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  dateCount: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
    marginTop: theme.spacing.xs,
  },
  dateCountSelected: {
    color: '#FFFFFF',
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
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  thumbBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbVideoIcon: {
    fontSize: 20,
    color: theme.colors.textMain,
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  tagChip: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  tagChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMain,
  },
});
