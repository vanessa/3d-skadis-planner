import { useId, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { Select } from './Select';

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
    '::-webkit-inner-spin-button': {
      appearance: 'none',
      margin: 0,
    },
    '::-webkit-outer-spin-button': {
      appearance: 'none',
      margin: 0,
    },
    MozAppearance: 'textfield',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: space.sm,
  },
  hint: {
    margin: 0,
    fontSize: font.xs,
    lineHeight: '15px',
    color: colors.muted,
  },
});

export function FieldRow({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.row)}>{children}</div>;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.hint)}>{children}</p>;
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
  const id = useId();
  return (
    <div {...stylex.props(styles.field)}>
      <label htmlFor={id} {...stylex.props(styles.label)}>
        {label}
      </label>
      <Select id={id} value={value} onChange={onChange} options={options} />
    </div>
  );
}
