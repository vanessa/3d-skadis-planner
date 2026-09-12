import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { InputPanel } from './InputPanel';
import { Panel } from './Panel';
import { PanelSection } from './PanelSection';
import { ThemeToggle } from './ThemeToggle';
import { ResetButton } from './ResetButton';
import { MeasurementsToggle } from './MeasurementsToggle';
import { Canvas } from './Canvas';
import type { PreviewMode } from './Preview';
import { PrintList } from './PrintList';
import { computePlan, parseNonNegative, DEFAULT_FORM, type FormState, type PlanOutcome } from './planState';
import { readStoredForm, writeStoredForm, clearStoredForm } from './formStorage';
import { getModel } from '../models';
import type { Plan } from '../solver';
import { getPrinter } from '../printers';
import { getMountSystem, hardwareMarkers, resolveMountSystem } from '../mounting';
import { formatPrintList, printListFileName, creditLines } from '../export/printListText';
import { downloadText } from './download';
import type { Highlight } from './highlight';
import { useTheme } from './useTheme';
import { lightTheme } from './themes.stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  app: {
    fontFamily: font.family,
    color: colors.text,
  },
  headerEnd: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  footerLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '28px',
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: mixes.border, ':hover': mixes.borderHover },
    backgroundColor: { default: mixes.inputBg, ':hover': colors.mutedBg },
    color: colors.text,
    fontSize: font.sm,
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'default',
    paddingInline: space.md,
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
    opacity: { default: 1, ':disabled': 0.5 },
  },
  credit: {
    margin: 0,
    fontSize: font.xs,
    lineHeight: '15px',
    color: colors.muted,
    textAlign: 'center',
  },
  creditLink: {
    color: colors.link,
    textDecoration: 'none',
  },
});

interface AppState {
  form: FormState;
  outcome: PlanOutcome;
  lastPlan: Plan | null;
}

function stateFor(form: FormState, lastPlan: Plan | null): AppState {
  const outcome = computePlan(form);
  return { form, outcome, lastPlan: outcome.plan ?? lastPlan };
}

function isDefaultForm(form: FormState): boolean {
  return (Object.keys(DEFAULT_FORM) as (keyof FormState)[]).every((key) => form[key] === DEFAULT_FORM[key]);
}

const lightThemeClasses = (stylex.props(lightTheme).className ?? '').split(' ').filter(Boolean);

export default function App() {
  const [state, setState] = useState<AppState>(() => stateFor(readStoredForm() ?? DEFAULT_FORM, null));
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [mode, setMode] = useState<PreviewMode>('hardware');
  const { preference, resolvedTheme, setPreference } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'light') root.classList.add(...lightThemeClasses);
    else root.classList.remove(...lightThemeClasses);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (state.outcome.error !== null) return;
    if (isDefaultForm(state.form)) clearStoredForm();
    else writeStoredForm(state.form);
  }, [state.form, state.outcome.error]);

  const onChange = (patch: Partial<FormState>) => {
    setHighlight(null);
    setState((s) => stateFor({ ...s.form, ...patch }, s.lastPlan));
  };

  const onReset = () => {
    clearStoredForm();
    setHighlight(null);
    setState(stateFor(DEFAULT_FORM, null));
  };

  const model = getModel(state.form.modelId);
  const wallDistanceMm = Number(state.form.wallDistance);
  const nodePaddingMm = parseNonNegative(state.form.nodePaddingMm) ?? undefined;
  const system = resolveMountSystem(getMountSystem(state.form.mountId), wallDistanceMm, nodePaddingMm);
  const markers = state.lastPlan ? hardwareMarkers(state.lastPlan, system, model) : undefined;
  const credits = creditLines(model, system);

  const download = () => {
    const p = state.lastPlan;
    if (!p) return;
    const custom = { bedWidthMm: Number(state.form.customBedWidth), bedDepthMm: Number(state.form.customBedDepth) };
    const printer = getPrinter(state.form.printerId, custom);
    const widthMm = p.coveredWidthMm + p.leftoverWidthMm;
    const heightMm = p.coveredHeightMm + p.leftoverHeightMm;
    downloadText(
      printListFileName(widthMm, heightMm),
      formatPrintList({
        plan: p, model, printer, widthMm, heightMm, date: new Date(), system, wallDistanceMm, unit: state.form.unit,
      }),
    );
  };

  return (
    <div {...stylex.props(styles.app)}>
      <Canvas
        plan={state.lastPlan}
        error={state.outcome.error}
        markers={markers}
        highlight={highlight}
        mode={mode}
        unit={state.form.unit}
      />
      <Panel
        title="Skadis Planner"
        headerEnd={
          <div {...stylex.props(styles.headerEnd)}>
            <ResetButton onClick={onReset} disabled={isDefaultForm(state.form)} />
            <MeasurementsToggle mode={mode} onChange={setMode} />
            <ThemeToggle preference={preference} onChange={setPreference} />
          </div>
        }
        footer={
          <div {...stylex.props(styles.footer)}>
            <button
              type="button"
              onClick={download}
              disabled={!state.lastPlan || state.outcome.error !== null}
              {...stylex.props(styles.footerLink)}
            >
              Download print list
            </button>
            <p {...stylex.props(styles.credit)}>
              {credits.map((c, i) => (
                <span key={c.label}>
                  {i > 0 && ', '}
                  {c.label} by{' '}
                  <a {...stylex.props(styles.creditLink)} href={c.url} target="_blank" rel="noopener noreferrer">
                    {c.name}
                  </a>
                </span>
              ))}
              . {model.author.thanks}
            </p>
          </div>
        }
      >
        <InputPanel form={state.form} onChange={onChange} />
        <PanelSection title="Print list" tone="emphasis">
          <PrintList plan={state.lastPlan} model={model} system={system} onHighlight={setHighlight} />
        </PanelSection>
      </Panel>
    </div>
  );
}
