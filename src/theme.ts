export const colors = {
  background: '#FFF9F1', // warm cream background
  surface: '#FFFFFF', // main card background
  surfaceAlt: '#FFF2DC', // highlight card background (e.g. TodayQuest)

  primary: '#FFB84A', // main orange for CTAs and active elements
  primaryDark: '#F39A00', // pressed state / stronger highlight
  accent: '#4EC8C0', // secondary accent (e.g. map, character details)

  textMain: '#333333',
  textSub: '#666666',
  textDisabled: '#B3B3B3',

  borderSoft: '#E3D5C5',

  success: '#22C55E',
  warning: '#F97316',
  danger: '#EF4444',
  info: '#3B82F6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 16, // cards
  lg: 24, // big buttons
  full: 999,
};

export const typography = {
  heading1: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

export const shadows = {
  card: {
    // iOS shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Android
    elevation: 3,
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
};
