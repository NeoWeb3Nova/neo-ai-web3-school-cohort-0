// Centralized chart theme tokens — impeccable.style palette

export const CHART = {
  grid: 'var(--color-rule)',
  axis: 'var(--color-ash)',
  tooltipBg: 'var(--color-paper)',
  tooltipBorder: 'var(--color-rule-hover)',
  tooltipText: 'var(--color-text)',
  tooltipMuted: 'var(--color-ash)',
  cursor: 'var(--color-mist)',
} as const;

export const COLORS = {
  patina: 'var(--color-patina)',
  gold: 'var(--color-kinpaku)',
  amber: 'var(--color-amber)',
  coral: 'var(--color-vermilion)',
  slate: 'var(--color-slate)',
  purple: '#9b8aad',
} as const;

export const PIE_COLORS = [
  COLORS.patina,
  COLORS.gold,
  COLORS.amber,
  COLORS.slate,
  COLORS.coral,
] as const;
