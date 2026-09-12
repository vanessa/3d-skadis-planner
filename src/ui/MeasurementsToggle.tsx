import * as stylex from '@stylexjs/stylex';
import { colors, font, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import type { PreviewMode } from './Preview';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    cursor: 'default',
  },
  label: {
    fontSize: font.sm,
    color: colors.text,
    userSelect: 'none',
  },
  track: {
    position: 'relative',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    width: '32px',
    height: '18px',
    padding: 0,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: '9999px',
    backgroundColor: mixes.inputBg,
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '120ms',
  },
  trackActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  thumb: {
    position: 'absolute',
    top: '1px',
    insetInlineStart: '1px',
    width: '14px',
    height: '14px',
    borderRadius: '9999px',
    backgroundColor: colors.muted,
    transitionProperty: 'transform, background-color',
    transitionDuration: '120ms',
  },
  thumbActive: {
    backgroundColor: colors.surface,
    transform: 'translateX(14px)',
  },
});

export function MeasurementsToggle({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  const active = mode === 'measurements';
  return (
    <label {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.label)}>Measurements view</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => onChange(active ? 'hardware' : 'measurements')}
        {...stylex.props(styles.track, active && styles.trackActive)}
      >
        <span {...stylex.props(styles.thumb, active && styles.thumbActive)} />
      </button>
    </label>
  );
}
