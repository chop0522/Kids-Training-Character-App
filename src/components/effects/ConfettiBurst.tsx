import React, { useEffect, useMemo } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

type ConfettiBurstProps = {
  active: boolean;
  durationMs?: number;
  pieceCount?: number;
};

type ConfettiPiece = {
  id: string;
  progress: Animated.Value;
  dx: number;
  dy: number;
  rotate: string;
  delay: number;
  size: number;
  color: string;
};

const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#845EC2', '#FF9F1C'];

export function ConfettiBurst({ active, durationMs = 1200, pieceCount = 24 }: ConfettiBurstProps) {
  const { width, height } = Dimensions.get('window');
  const maxX = Math.max(120, Math.round(width * 0.35));
  const maxY = Math.max(240, Math.round(height * 0.35));

  const pieces = useMemo(() => buildPieces(pieceCount, maxX, maxY), [pieceCount, maxX, maxY]);

  useEffect(() => {
    if (!active) {
      pieces.forEach((piece) => {
        piece.progress.stopAnimation();
        piece.progress.setValue(0);
      });
      return;
    }

    pieces.forEach((piece) => piece.progress.setValue(0));
    const animations = pieces.map((piece) =>
      Animated.timing(piece.progress, {
        toValue: 1,
        duration: durationMs,
        delay: piece.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, [active, durationMs, pieces]);

  if (pieceCount <= 0) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {pieces.map((piece) => {
        const translateX = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.dx],
        });
        const translateY = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.dy],
        });
        const rotate = piece.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', piece.rotate],
        });
        const opacity = piece.progress.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0, 1, 0],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.piece,
              {
                width: piece.size,
                height: piece.size * 1.6,
                backgroundColor: piece.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function buildPieces(count: number, maxX: number, maxY: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i += 1) {
    const dx = randomBetween(-maxX, maxX);
    const dy = randomBetween(Math.round(maxY * 0.6), maxY);
    const rotate = `${randomBetween(-240, 240)}deg`;
    const delay = randomBetween(0, 180);
    const size = randomBetween(6, 12);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    pieces.push({
      id: `confetti-${i}`,
      progress: new Animated.Value(0),
      dx,
      dy,
      rotate,
      delay,
      size,
      color,
    });
  }
  return pieces;
}

function randomBetween(min: number, max: number): number {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  piece: {
    position: 'absolute',
    top: 0,
    left: '50%',
    borderRadius: 4,
  },
});
