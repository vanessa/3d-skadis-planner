import * as stylex from '@stylexjs/stylex';
import type { ThemePreference } from './useTheme';
import { colors, radius } from './tokens.stylex';

const styles = stylex.create({
  group: {
    display: 'inline-flex',
    gap: '2px',
    padding: '2px',
    borderRadius: radius.md,
  },
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

const OPTIONS: { value: ThemePreference; label: string; path: string }[] = [
  { value: 'dark', label: 'Dark theme', path: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' },
  {
    value: 'light',
    label: 'Light theme',
    path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  },
  { value: 'system', label: 'System theme', path: 'M3 5h18v11H3zM8 20h8M12 16v4' },
];

export function ThemeToggle({
  preference,
  onChange,
}: {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
}) {
  return (
    <div {...stylex.props(styles.group)} role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={o.label}
          aria-pressed={preference === o.value}
          onClick={() => onChange(o.value)}
          {...stylex.props(styles.button, preference === o.value && styles.active)}
        >
          <svg {...stylex.props(styles.icon)} viewBox="0 0 24 24" aria-hidden="true">
            <path d={o.path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
