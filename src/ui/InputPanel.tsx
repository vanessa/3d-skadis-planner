import * as stylex from '@stylexjs/stylex';
import type { FormState } from './planState';
import { MODELS } from '../models';
import { PRINTERS, CUSTOM_PRINTER_ID } from '../printers';
import { UNITS, toMm, fromMm, type Unit } from '../units';
import { colors, font, radius, space } from './tokens.stylex';

export interface InputPanelProps {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: space.sm,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  label: {
    fontSize: font.sizeSm,
    color: colors.muted,
  },
  control: {
    fontSize: font.sizeMd,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: colors.border,
      ':focus': colors.accent,
    },
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    outline: 'none',
    width: '100%',
  },
});

function convert(value: string, from: Unit, to: Unit): string {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n)) return value;
  const converted = fromMm(toMm(n, from), to);
  return String(Math.round(converted * 100) / 100);
}

export function InputPanel({ form, onChange }: InputPanelProps) {
  const isCustom = form.printerId === CUSTOM_PRINTER_ID;

  const changeUnit = (unit: Unit) => {
    onChange({
      unit,
      width: convert(form.width, form.unit, unit),
      height: convert(form.height, form.unit, unit),
    });
  };

  return (
    <form {...stylex.props(styles.panel)} onSubmit={(e) => e.preventDefault()}>
      <div {...stylex.props(styles.row)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Width</span>
          <input
            {...stylex.props(styles.control)}
            type="number"
            inputMode="decimal"
            min={0}
            value={form.width}
            onChange={(e) => onChange({ width: e.target.value })}
          />
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Height</span>
          <input
            {...stylex.props(styles.control)}
            type="number"
            inputMode="decimal"
            min={0}
            value={form.height}
            onChange={(e) => onChange({ height: e.target.value })}
          />
        </label>
      </div>

      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Unit</span>
        <select
          {...stylex.props(styles.control)}
          value={form.unit}
          onChange={(e) => changeUnit(e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Board model</span>
        <select
          {...stylex.props(styles.control)}
          value={form.modelId}
          onChange={(e) => onChange({ modelId: e.target.value })}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Printer</span>
        <select
          {...stylex.props(styles.control)}
          value={form.printerId}
          onChange={(e) => onChange({ printerId: e.target.value })}
        >
          {PRINTERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value={CUSTOM_PRINTER_ID}>Custom bed size</option>
        </select>
      </label>

      {isCustom && (
        <div {...stylex.props(styles.row)}>
          <label {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.label)}>Bed width</span>
            <input
              {...stylex.props(styles.control)}
              type="number"
              inputMode="decimal"
              min={0}
              value={form.customBedWidth}
              onChange={(e) => onChange({ customBedWidth: e.target.value })}
            />
          </label>
          <label {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.label)}>Bed depth</span>
            <input
              {...stylex.props(styles.control)}
              type="number"
              inputMode="decimal"
              min={0}
              value={form.customBedDepth}
              onChange={(e) => onChange({ customBedDepth: e.target.value })}
            />
          </label>
        </div>
      )}
    </form>
  );
}
