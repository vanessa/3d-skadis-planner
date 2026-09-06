import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { InputPanel } from './InputPanel';
import { Panel } from './Panel';
import { PanelSection } from './PanelSection';
import { ThemeToggle } from './ThemeToggle';
import { Canvas } from './Canvas';
import { PrintList } from './PrintList';
import { computePlan, DEFAULT_FORM, type FormState, type PlanOutcome } from './planState';
import { getModel } from '../models';
import type { Plan } from '../solver';
import { getPrinter } from '../printers';
import { getMountSystem, hardwareMarkers } from '../mounting';
import { formatPrintList, printListFileName } from '../export/printListText';
import { downloadText } from './download';
import { useTheme } from './useTheme';
import { lightTheme } from './themes.stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  app: {
    fontFamily: font.family,
    color: colors.text,
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

const lightThemeClasses = (stylex.props(lightTheme).className ?? '').split(' ').filter(Boolean);

export default function App() {
  const [state, setState] = useState<AppState>(() => stateFor(DEFAULT_FORM, null));
  const { preference, resolvedTheme, setPreference } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'light') root.classList.add(...lightThemeClasses);
    else root.classList.remove(...lightThemeClasses);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const onChange = (patch: Partial<FormState>) =>
    setState((s) => stateFor({ ...s.form, ...patch }, s.lastPlan));

  const model = getModel(state.form.modelId);
  const system = getMountSystem(state.form.mountId);
  const markers = state.lastPlan ? hardwareMarkers(state.lastPlan, system, model) : undefined;

  const download = () => {
    const p = state.lastPlan;
    if (!p) return;
    const custom = { bedWidthMm: Number(state.form.customBedWidth), bedDepthMm: Number(state.form.customBedDepth) };
    const printer = getPrinter(state.form.printerId, custom);
    const widthMm = p.coveredWidthMm + p.leftoverWidthMm;
    const heightMm = p.coveredHeightMm + p.leftoverHeightMm;
    downloadText(
      printListFileName(widthMm, heightMm),
      formatPrintList({ plan: p, model, printer, widthMm, heightMm, date: new Date(), system }),
    );
  };

  return (
    <div {...stylex.props(styles.app)}>
      <Canvas plan={state.lastPlan} error={state.outcome.error} markers={markers} />
      <Panel
        title="Skadis Planner"
        headerEnd={<ThemeToggle preference={preference} onChange={setPreference} />}
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
            <a {...stylex.props(styles.footerLink)} href={model.url} target="_blank" rel="noopener noreferrer">
              Open files on MakerWorld
            </a>
            <p {...stylex.props(styles.credit)}>
              Boards by{' '}
              <a {...stylex.props(styles.creditLink)} href={model.author.url} target="_blank" rel="noopener noreferrer">
                {model.author.name}
              </a>
              . {model.author.thanks}
            </p>
          </div>
        }
      >
        <InputPanel form={state.form} onChange={onChange} />
        <PanelSection title="Print list">
          <PrintList plan={state.lastPlan} model={model} system={system} />
        </PanelSection>
      </Panel>
    </div>
  );
}
