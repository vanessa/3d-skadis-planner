import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  bg: '#fafaf9',
  surface: '#ffffff',
  text: '#1c1917',
  muted: '#78716c',
  border: '#e7e5e4',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  boardFill: '#eef2ff',
  boardFillMirror: '#e0e7ff',
  boardStroke: '#3730a3',
  leftover: '#d6d3d1',
});

export const space = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
});

export const radius = stylex.defineVars({
  sm: '6px',
  md: '10px',
});

export const font = stylex.defineVars({
  sizeSm: '13px',
  sizeMd: '15px',
  sizeLg: '22px',
});
