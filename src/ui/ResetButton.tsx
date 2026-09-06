import * as stylex from '@stylexjs/stylex';
import { colors, radius } from './tokens.stylex';

const styles = stylex.create({
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': colors.mutedBg, ':disabled': 'transparent' },
    color: { default: colors.muted, ':hover': colors.text, ':disabled': colors.muted },
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '1px',
    opacity: { default: 1, ':disabled': 0.5 },
  },
  icon: {
    width: '14px',
    height: '14px',
  },
});

export function ResetButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Reset to defaults"
      title="Reset to defaults"
      onClick={onClick}
      disabled={disabled}
      {...stylex.props(styles.button)}
    >
      <svg {...stylex.props(styles.icon)} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 12a9 9 0 1 1 3 6.7M3 12v6M3 12h6"
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
