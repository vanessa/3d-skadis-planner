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
import { useTheme } from './useTheme';
import { lightTheme } from './themes.stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  app: {
    fontFamily: font.family,
    color: colors.text,
  },
  footerLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '28px',
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: mixes.border, ':hover': mixes.borderHover },
    backgroundColor: { default: mixes.inputBg, ':hover': colors.mutedBg },
    color: colors.text,
    fontSize: font.sm,
    fontWeight: 500,
    textDecoration: 'none',
    paddingInline: space.md,
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
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

  return (
    <div {...stylex.props(styles.app)}>
      <Canvas plan={state.lastPlan} error={state.outcome.error} model={model} />
      <Panel
        title="Board planner"
        headerEnd={<ThemeToggle preference={preference} onChange={setPreference} />}
        footer={
          <a {...stylex.props(styles.footerLink)} href={model.url} target="_blank" rel="noopener noreferrer">
            Open files on MakerWorld
          </a>
        }
      >
        <InputPanel form={state.form} onChange={onChange} />
        <PanelSection title="Print list">
          <PrintList plan={state.lastPlan} model={model} />
        </PanelSection>
      </Panel>
    </div>
  );
}
