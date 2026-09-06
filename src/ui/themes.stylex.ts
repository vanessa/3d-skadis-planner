import * as stylex from '@stylexjs/stylex';
import { colors } from './tokens.stylex';

export const lightTheme = stylex.createTheme(colors, {
  bg: 'oklch(1 0 0)',
  surface: 'oklch(1 0 0)',
  text: 'oklch(0.145 0 0)',
  muted: 'oklch(0.556 0 0)',
  mutedBg: '#f8f8f8',
  attention: '#ea733a',
  destructive: 'hsl(0 84% 60%)',
  link: '#0c8ce9',
  ring: 'oklch(0.708 0 0)',
});
