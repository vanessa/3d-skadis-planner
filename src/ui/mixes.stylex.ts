import * as stylex from '@stylexjs/stylex';
import { colors } from './tokens.stylex';

/**
 * Derived colours. They reference `colors` through var(), so they follow the
 * active theme as long as the theme class is applied to <html> (see App).
 */
export const mixes = stylex.defineVars({
  border: `color-mix(in oklab, ${colors.text} 12%, transparent)`,
  borderHover: `color-mix(in oklab, ${colors.text} 20%, transparent)`,
  borderFocus: `color-mix(in oklab, ${colors.text} 30%, transparent)`,
  divider: `color-mix(in oklab, ${colors.text} 8%, transparent)`,
  inputBg: `color-mix(in oklab, ${colors.text} 5%, transparent)`,
  panelBg: `color-mix(in oklab, ${colors.surface} 75%, transparent)`,
  vizGrid: `color-mix(in oklab, ${colors.text} 7%, ${colors.surface})`,
  vizFillDim: `color-mix(in oklab, ${colors.text} 14%, ${colors.surface})`,
  vizFill: `color-mix(in oklab, ${colors.text} 20%, ${colors.surface})`,
  vizFillLit: `color-mix(in oklab, ${colors.text} 22%, ${colors.surface})`,
  vizLine: `color-mix(in oklab, ${colors.text} 30%, ${colors.surface})`,
  vizLineStrong: `color-mix(in oklab, ${colors.text} 45%, ${colors.surface})`,
  vizData: `color-mix(in oklab, ${colors.text} 62%, ${colors.surface})`,
});
