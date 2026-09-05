import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import { colors, font, radius, space } from './tokens.stylex';

export interface SummaryProps {
  plan: Plan | null;
  error: string | null;
}

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  headline: {
    fontSize: font.sizeLg,
    fontWeight: 600,
    margin: 0,
  },
  detail: {
    fontSize: font.sizeMd,
    color: colors.muted,
    margin: 0,
  },
  error: {
    fontSize: font.sizeSm,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    margin: 0,
  },
});

const mm = (n: number) => `${Math.round(n)} mm`;

export function Summary({ plan, error }: SummaryProps) {
  return (
    <div {...stylex.props(styles.wrap)}>
      {error && (
        <p role="alert" {...stylex.props(styles.error)}>
          {error}
        </p>
      )}
      {plan && (
        <>
          <p {...stylex.props(styles.headline)}>
            {plan.boards.length} {plan.boards.length === 1 ? 'board' : 'boards'}
          </p>
          <p {...stylex.props(styles.detail)}>
            Covers {mm(plan.coveredWidthMm)} × {mm(plan.coveredHeightMm)}
            {plan.leftoverWidthMm > 0 && ` · ${mm(plan.leftoverWidthMm)} left on the right`}
            {plan.leftoverHeightMm > 0 && ` · ${mm(plan.leftoverHeightMm)} left at the bottom`}
          </p>
        </>
      )}
    </div>
  );
}
