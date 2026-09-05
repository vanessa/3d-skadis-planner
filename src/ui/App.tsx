import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { InputPanel } from './InputPanel';
import { Summary } from './Summary';
import { Preview } from './Preview';
import { PrintList } from './PrintList';
import { computePlan, DEFAULT_FORM, type FormState, type PlanOutcome } from './planState';
import type { Plan } from '../solver';
import { getModel } from '../models';
import { colors, font, space } from './tokens.stylex';

const styles = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: font.family,
    paddingBlock: space.xl,
    paddingInline: space.lg,
  },
  inner: {
    maxWidth: 1100,
    marginInline: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  title: {
    fontSize: font.lg,
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    fontSize: font.sm,
    color: colors.muted,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '320px minmax(0, 1fr)',
      '@media (max-width: 800px)': 'minmax(0, 1fr)',
    },
    gap: space.lg,
    alignItems: 'start',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    minWidth: 0,
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

export default function App() {
  const [state, setState] = useState<AppState>(() => stateFor(DEFAULT_FORM, null));

  const onChange = (patch: Partial<FormState>) =>
    setState((s) => stateFor({ ...s.form, ...patch }, s.lastPlan));

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.inner)}>
        <header {...stylex.props(styles.header)}>
          <h1 {...stylex.props(styles.title)}>Board planner</h1>
          <p {...stylex.props(styles.subtitle)}>
            Enter the space you want to cover. Get the fewest printable boards that fit.
          </p>
        </header>
        <div {...stylex.props(styles.grid)}>
          <InputPanel form={state.form} onChange={onChange} />
          <section {...stylex.props(styles.results)}>
            <Summary plan={state.lastPlan} error={state.outcome.error} />
            <Preview plan={state.lastPlan} />
            <PrintList plan={state.lastPlan} model={getModel(state.form.modelId)} />
          </section>
        </div>
      </div>
    </main>
  );
}
