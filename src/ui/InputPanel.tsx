import * as stylex from '@stylexjs/stylex';
import type { FormState } from './planState';
import { MODELS, getModel } from '../models';
import { PRINTERS, CUSTOM_PRINTER_ID } from '../printers';
import { UNITS, toMm, fromMm, type Unit } from '../units';
import { STRATEGIES, getStrategy, type StrategyId } from '../solver';
import { MOUNT_SYSTEMS, getMountSystem, defaultWallDistance, resolveMountSystem, wallDistances } from '../mounting';
import { PanelSection } from './PanelSection';
import { FieldRow, FieldHint, NumberField, SelectField } from './fields';
import { colors, font } from './tokens.stylex';

const styles = stylex.create({
  fileLink: {
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
  const model = getModel(form.modelId);
  const mountSystem = getMountSystem(form.mountId);
  const distances = wallDistances(mountSystem);
  const usesNodePadding = mountSystem.markers.includes('nodes') || mountSystem.markers.includes('outerNodes');

  const changeMount = (mountId: string) => {
    const next = getMountSystem(mountId);
    const keep = wallDistances(next).includes(Number(form.wallDistance));
    onChange({
      mountId,
      wallDistance: keep ? form.wallDistance : String(defaultWallDistance(next)),
      nodePaddingMm: String(next.nodeInsetMm ?? 0),
    });
  };

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

      <PanelSection title="Board" defaultOpen={false}>
        <SelectField
          label="Model"
          value={form.modelId}
          onChange={(modelId) => onChange({ modelId })}
          options={MODELS.map((m) => ({ value: m.id, label: m.name }))}
        />
        <a {...stylex.props(styles.fileLink)} href={model.url} target="_blank" rel="noopener noreferrer">
          Board files
        </a>
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
          onChange={changeMount}
          options={MOUNT_SYSTEMS.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FieldHint>{mountSystem.description}</FieldHint>
        {distances.length > 0 && (
          <SelectField
            label="Wall distance"
            value={form.wallDistance}
            onChange={(wallDistance) => onChange({ wallDistance })}
            options={distances.map((mm) => ({ value: String(mm), label: `${mm} mm` }))}
          />
        )}
        {usesNodePadding && (
          <>
            <NumberField
              label="Screw hole padding (mm)"
              value={form.nodePaddingMm}
              onChange={(nodePaddingMm) => onChange({ nodePaddingMm })}
            />
            <FieldHint>How far a corner or edge mount's screw sits in from the board edge.</FieldHint>
          </>
        )}
        <a
          {...stylex.props(styles.fileLink)}
          href={resolveMountSystem(mountSystem, Number(form.wallDistance)).url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Mount files
        </a>
      </PanelSection>
    </form>
  );
}
