import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ConfettiBurst } from './ConfettiBurst';
import { safeSuccess } from '../../utils/haptics';

type CelebrationEffectsProps = {
  visible: boolean;
  kind: 'chest' | 'evolution';
};

export function CelebrationEffects({ visible, kind }: CelebrationEffectsProps) {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const handler = (enabled: boolean) => setReduceMotionEnabled(enabled);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', handler);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      prevVisibleRef.current = true;
      void safeSuccess();
      // TODO: hook in safePlaySfx('chest'|'evolution') when audio assets are ready.
      if (reduceMotionEnabled) {
        scale.setValue(1);
        opacity.setValue(0);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        scale.setValue(0.8);
        opacity.setValue(0);
        Animated.parallel([
          Animated.sequence([
            Animated.spring(scale, { toValue: 1.1, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          ]),
          Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
      }
    }

    if (!visible && prevVisibleRef.current) {
      prevVisibleRef.current = false;
      opacity.setValue(0);
      scale.setValue(1);
    }
  }, [visible, reduceMotionEnabled, opacity, scale]);

  const iconName = kind === 'chest' ? 'treasure-chest' : 'star-four-points';
  const iconColor = kind === 'chest' ? '#F5C542' : '#FFD93D';
  const animatedStyle = reduceMotionEnabled ? { opacity } : { opacity, transform: [{ scale }] };

  return (
    <View pointerEvents="none" style={styles.container}>
      {!reduceMotionEnabled && <ConfettiBurst active={visible} />}
      <Animated.View style={[styles.iconWrap, animatedStyle]}>
        <MaterialCommunityIcons name={iconName} size={72} color={iconColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
