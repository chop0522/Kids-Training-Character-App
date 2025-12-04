import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/AppStoreContext';
import { theme } from '../theme';
import { getStageName } from '../mapConfig';
import { MapNode } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

export function MapScreen({ route, navigation }: Props) {
  const { getChildById, getMapNodesForChild } = useAppStore();
  const childId = route.params.childId;
  const child = getChildById(childId);

  const nodes = useMemo(() => (child ? getMapNodesForChild(child.id) : []), [child?.id, getMapNodesForChild]);
  const currentNode = nodes.find((n) => !n.isCompleted);
  const stageIndex = currentNode?.stageIndex ?? nodes[0]?.stageIndex ?? 0;
  const stageName = getStageName(stageIndex);

  if (!child) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.content, styles.centered]}>
          <Text style={styles.nodeTitle}>子どもの情報が見つかりません</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{child.name}のマップ</Text>
        </View>

        <View style={styles.stageCard}>
          <Text style={styles.stageTitle}>今は「{stageName}」</Text>
          <Text style={styles.stageSubtitle}>トレーニングをすると道がのびるよ</Text>
        </View>

        <View style={styles.pathContainer}>
          {nodes.length === 0 ? (
            <Text style={styles.emptyText}>まだマップがありません。トレーニングをして進んでみよう！</Text>
          ) : (
            nodes.map((node, index) => {
              const isCompleted = node.isCompleted;
              const isCurrent = currentNode ? node.id === currentNode.id : index === 0;
              const nodeLabel = getNodeLabel(node);
              return (
                <View key={node.id} style={styles.nodeRow}>
                  <View style={styles.nodeLeftColumn}>
                    <View
                      style={[
                        styles.nodeCircleBase,
                        isCompleted && styles.nodeCircleCompleted,
                        isCurrent && styles.nodeCircleCurrent,
                      ]}
                    >
                      {isCompleted ? (
                        <Text style={styles.nodeCheck}>✓</Text>
                      ) : (
                        <Text style={styles.nodeIcon}>{getNodeIcon(node.type)}</Text>
                      )}
                    </View>
                    {index < nodes.length - 1 && (
                      <View style={[styles.nodeLine, isCompleted ? styles.nodeLineCompleted : undefined]} />
                    )}
                  </View>
                  <View style={styles.nodeContent}>
                    <Text style={styles.nodeTitle}>
                      マス {node.nodeIndex + 1} · {nodeLabel}
                    </Text>
                    <Text style={styles.nodeProgressText}>
                      進捗：{Math.min(node.progress, node.requiredSessions)} / {node.requiredSessions}
                    </Text>
                    {isCurrent && <Text style={styles.nodeCurrentLabel}>ここが いまのマス</Text>}
                    {isCompleted && <Text style={styles.nodeCompletedLabel}>クリア！</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getNodeLabel(node: MapNode) {
  switch (node.type) {
    case 'treasure':
      return 'おたから';
    case 'boss':
      return 'ボス';
    default:
      return 'ふつう';
  }
}

function getNodeIcon(type: MapNode['type']) {
  switch (type) {
    case 'treasure':
      return '💎';
    case 'boss':
      return '🐉';
    default:
      return '⭐️';
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
    paddingBottom: theme.spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  backIcon: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  backText: {
    ...theme.typography.body,
    color: theme.colors.textMain,
  },
  headerTitle: {
    ...theme.typography.heading1,
    color: theme.colors.textMain,
  },
  stageCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  stageTitle: {
    ...theme.typography.heading2,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  stageSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  pathContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSub,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  nodeLeftColumn: {
    width: 40,
    alignItems: 'center',
  },
  nodeCircleBase: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  nodeCircleCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  nodeCircleCurrent: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  nodeCheck: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  nodeIcon: {
    fontSize: 12,
  },
  nodeLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.borderSoft,
    marginVertical: theme.spacing.xs,
  },
  nodeLineCompleted: {
    backgroundColor: theme.colors.primary,
  },
  nodeContent: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  nodeTitle: {
    ...theme.typography.body,
    color: theme.colors.textMain,
    marginBottom: theme.spacing.xs,
  },
  nodeProgressText: {
    ...theme.typography.caption,
    color: theme.colors.textSub,
  },
  nodeCurrentLabel: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginTop: theme.spacing.xs,
  },
  nodeCompletedLabel: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    marginTop: theme.spacing.xs,
  },
});
