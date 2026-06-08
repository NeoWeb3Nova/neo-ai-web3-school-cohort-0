// Centralized chart theme tokens — kept in sync with tailwind.config.js
// Kinpaku + Patina palette (impeccable.style inspired)

export const CHART = {
  grid: '#252217',
  axis: '#6b6558',
  tooltipBg: '#1a1712',
  tooltipBorder: '#3d382b',
  tooltipText: '#f7f4ef',
  tooltipMuted: '#a8a395',
  cursor: 'rgba(247,244,239,0.03)',
} as const;

export const COLORS = {
  patina: '#5a9e8a',
  gold: '#d4a843',
  amber: '#c98b3f',
  coral: '#b85c4f',
  slate: '#7a8e9e',
  purple: '#9b8aad',
} as const;

export const PIE_COLORS = [
  COLORS.patina,
  COLORS.gold,
  COLORS.amber,
  COLORS.slate,
  COLORS.coral,
] as const;
