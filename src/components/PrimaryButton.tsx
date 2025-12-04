import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  icon?: string;
  variant?: Variant;
  style?: ViewStyle;
  disabled?: boolean;
};

export function PrimaryButton({ title, onPress, icon, variant = 'primary', style, disabled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed &&
          !disabled &&
          (variant === 'primary'
            ? styles.primaryPressed
            : variant === 'secondary'
              ? styles.secondaryPressed
              : styles.ghostPressed),
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.text, variant === 'ghost' && styles.textGhost]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xs,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  primaryPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  secondary: {
    backgroundColor: theme.colors.accent,
  },
  secondaryPressed: {
    backgroundColor: '#3BB0A8',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  ghostPressed: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  text: {
    ...theme.typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textGhost: {
    color: theme.colors.textMain,
  },
  icon: {
    fontSize: 16,
  },
});
