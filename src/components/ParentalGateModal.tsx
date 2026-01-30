import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  onPassed: () => void;
  onCancel: () => void;
};

export function ParentalGateModal({ visible, onPassed, onCancel }: Props) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const question = useMemo(() => createQuestion(visible), [visible]);

  useEffect(() => {
    if (!visible) return;
    setAnswer('');
    setError('');
  }, [visible]);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const numeric = Number(answer);
    if (!Number.isFinite(numeric) || numeric !== question.result) {
      setError('ちがいます。もう一度ためしてね。');
      return;
    }
    setError('');
    onPassed();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>保護者の方へ</Text>
          <Text style={styles.subtitle}>次の計算に答えてください</Text>
          <Text style={styles.question}>
            {question.left} + {question.right} = ?
          </Text>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            keyboardType="number-pad"
            placeholder="答えを入力"
            placeholderTextColor={theme.colors.textDisabled}
            style={styles.input}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />
          {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>
            <Pressable style={styles.okButton} onPress={handleSubmit}>
              <Text style={styles.okButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createQuestion(seed: boolean) {
  const base = seed ? Date.now() : Math.random();
  const left = 5 + (base % 5);
  const right = 6 + ((base * 7) % 5);
  return {
    left: Math.floor(left),
    right: Math.floor(right),
    result: Math.floor(left + right),
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  title: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSub,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  question: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'center',
    fontSize: 18,
    color: theme.colors.textMain,
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  cancelButtonText: {
    ...theme.typography.label,
    color: theme.colors.textMain,
  },
  okButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  okButtonText: {
    ...theme.typography.label,
    color: '#fff',
  },
});
