import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  label: string;
  progress: number; // 0-1
  current: number;
  target: number;
};

export function XPBar({ label, progress, current, target }: Props) {
  const widthPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {current} / {target}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${widthPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  value: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  track: {
    height: 8,
    backgroundColor: '#F0E4D5',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
});
