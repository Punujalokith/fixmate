// One place for colours, spacing and text styles, so every screen looks consistent.

export const colors = {
  primary: '#0F766E', // teal: trust, cleanliness
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  accent: '#F59E0B', // amber: stars, highlights
  accentSoft: '#FEF3C7',

  bg: '#F6F8FA',
  card: '#FFFFFF',
  border: '#E5E9F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  white: '#FFFFFF',

  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const font = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  tiny: { fontSize: 11, color: colors.textMuted, fontWeight: '600' as const, letterSpacing: 0.3 },
};

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
