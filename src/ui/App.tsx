import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { InputPanel } from './InputPanel';
import { Summary } from './Summary';
import { computePlan, DEFAULT_FORM, type FormState } from './planState';
import type { Plan } from '../solver';
import { colors, font, space } from './tokens.stylex';

const styles = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
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
    fontSize: font.sizeLg,
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    fontSize: font.sizeMd,
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

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const lastPlan = useRef<Plan | null>(null);

  const { plan, error } = computePlan(form);
  if (plan) lastPlan.current = plan;
  const shown = plan ?? lastPlan.current;

  const onChange = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

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
          <InputPanel form={form} onChange={onChange} />
          <section {...stylex.props(styles.results)}>
            <Summary plan={shown} error={error} />
          </section>
        </div>
      </div>
    </main>
  );
}
