import * as stylex from '@stylexjs/stylex';
import type { FormState } from './planState';
import { MODELS } from '../models';
import { PRINTERS, CUSTOM_PRINTER_ID } from '../printers';
import { UNITS, toMm, fromMm, type Unit } from '../units';
import { STRATEGIES, getStrategy, type StrategyId } from '../solver';
import { MOUNT_SYSTEMS, getMountSystem } from '../mounting';
import { PanelSection } from './PanelSection';
import { FieldRow, FieldHint, NumberField, SelectField } from './fields';
import { colors, font } from './tokens.stylex';

const styles = stylex.create({
  mountLink: {
    fontSize: font.xs,
    lineHeight: '15px',
    color: colors.muted,
    textDecoration: 'underline',
    alignSelf: 'flex-start',
  },
});

export interface InputPanelProps {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

function convert(value: string, from: Unit, to: Unit): string {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n)) return value;
  const converted = fromMm(toMm(n, from), to);
  return String(Math.round(converted * 100) / 100);
}

export function InputPanel({ form, onChange }: InputPanelProps) {
  const isCustom = form.printerId === CUSTOM_PRINTER_ID;
  const mountSystem = getMountSystem(form.mountId);

  const changeUnit = (unit: Unit) => {
    onChange({
      unit,
      width: convert(form.width, form.unit, unit),
      height: convert(form.height, form.unit, unit),
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <PanelSection title="Space">
        <FieldRow>
          <NumberField label="Width" value={form.width} onChange={(width) => onChange({ width })} />
          <NumberField label="Height" value={form.height} onChange={(height) => onChange({ height })} />
        </FieldRow>
        <SelectField
          label="Unit"
          value={form.unit}
          onChange={(u) => changeUnit(u as Unit)}
          options={UNITS.map((u) => ({ value: u, label: u }))}
        />
      </PanelSection>

      <PanelSection title="Board">
        <SelectField
          label="Model"
          value={form.modelId}
          onChange={(modelId) => onChange({ modelId })}
          options={MODELS.map((m) => ({ value: m.id, label: m.name }))}
        />
      </PanelSection>

      <PanelSection title="Printer">
        <SelectField
          label="Printer"
          value={form.printerId}
          onChange={(printerId) => onChange({ printerId })}
          options={[
            ...PRINTERS.map((p) => ({ value: p.id, label: p.name })),
            { value: CUSTOM_PRINTER_ID, label: 'Custom bed size' },
          ]}
        />
        {isCustom && (
          <FieldRow>
            <NumberField
              label="Bed width"
              value={form.customBedWidth}
              onChange={(customBedWidth) => onChange({ customBedWidth })}
            />
            <NumberField
              label="Bed depth"
              value={form.customBedDepth}
              onChange={(customBedDepth) => onChange({ customBedDepth })}
            />
          </FieldRow>
        )}
      </PanelSection>

      <PanelSection title="Layout">
        <SelectField
          label="Strategy"
          value={form.strategyId}
          onChange={(strategyId) => onChange({ strategyId: strategyId as StrategyId })}
          options={STRATEGIES.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FieldHint>{getStrategy(form.strategyId).description}</FieldHint>
        {form.strategyId === 'allow-gap' && (
          <NumberField label="Max gap (mm)" value={form.maxGap} onChange={(maxGap) => onChange({ maxGap })} />
        )}
      </PanelSection>

      <PanelSection title="Mounting">
        <SelectField
          label="System"
          value={form.mountId}
          onChange={(mountId) => onChange({ mountId })}
          options={MOUNT_SYSTEMS.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FieldHint>{mountSystem.description}</FieldHint>
        <a
          {...stylex.props(styles.mountLink)}
          href={mountSystem.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Mount files
        </a>
      </PanelSection>
    </form>
  );
}
