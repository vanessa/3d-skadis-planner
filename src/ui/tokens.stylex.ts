import * as stylex from '@stylexjs/stylex';

/** Dark is the base theme. `themes.stylex.ts` overrides these for light. */
export const colors = stylex.defineVars({
  bg: 'oklch(0.145 0 0)',
  surface: 'oklch(0.205 0 0)',
  text: 'oklch(0.985 0 0)',
  muted: 'oklch(0.708 0 0)',
  mutedBg: '#262626',
  accent: '#0c8ce9',
  attention: '#ea733a',
  destructive: 'hsl(0 84% 60%)',
  link: '#70b0fa',
  ring: 'oklch(0.556 0 0)',
});

export const space = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
});

export const radius = stylex.defineVars({
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
});

export const font = stylex.defineVars({
  xs: '11px',
  sm: '12px',
  md: '13px',
  lg: '15px',
  xl: '20px',
  family: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});
