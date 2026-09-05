import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    minWidth: 0,
  },
  label: {
    fontSize: font.xs,
    lineHeight: '14px',
    color: colors.muted,
    userSelect: 'none',
  },
  control: {
    height: '28px',
    width: '100%',
    minWidth: 0,
    paddingBlock: 0,
    paddingInline: space.sm,
    fontSize: font.sm,
    lineHeight: '1.625',
    color: colors.text,
    backgroundColor: mixes.inputBg,
    backgroundClip: 'padding-box',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: mixes.border,
      ':hover': mixes.borderHover,
      ':focus': mixes.borderFocus,
    },
    borderRadius: radius.lg,
    outlineWidth: {
      default: '0px',
      ':focus-visible': '2px',
    },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
    transitionProperty: 'border-color',
    transitionDuration: '120ms',
  },
  selectWrap: {
    position: 'relative',
  },
  select: {
    appearance: 'none',
    paddingInlineEnd: '28px',
    cursor: 'default',
  },
  chevron: {
    position: 'absolute',
    insetInlineEnd: space.sm,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '12px',
    height: '12px',
    color: colors.muted,
    pointerEvents: 'none',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: space.sm,
  },
});

export function FieldRow({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.row)}>{children}</div>;
}

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <input
        {...stylex.props(styles.control)}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <span {...stylex.props(styles.selectWrap)}>
        <select
          {...stylex.props(styles.control, styles.select)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg {...stylex.props(styles.chevron)} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      </span>
    </label>
  );
}
