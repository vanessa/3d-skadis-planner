import * as stylex from '@stylexjs/stylex';
import { colors, radius } from './tokens.stylex';
import type { PreviewMode } from './Preview';

const styles = stylex.create({
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': colors.mutedBg },
    color: { default: colors.muted, ':hover': colors.text },
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '1px',
  },
  active: {
    backgroundColor: colors.mutedBg,
    color: colors.text,
  },
  icon: {
    width: '14px',
    height: '14px',
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
    <button
      type="button"
      aria-label="Measurements view"
      title="Measurements"
      aria-pressed={active}
      onClick={() => onChange(active ? 'hardware' : 'measurements')}
      {...stylex.props(styles.button, active && styles.active)}
    >
      <svg {...stylex.props(styles.icon)} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 19h18M4 19v-6M8 19v-3M12 19v-6M16 19v-3M20 19v-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
