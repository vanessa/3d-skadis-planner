import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.xs,
    pointerEvents: 'none',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: '28px',
    paddingInline: space.md,
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.sm,
    whiteSpace: 'nowrap',
  },
  count: {
    fontWeight: 600,
  },
  detail: {
    color: colors.muted,
  },
  error: {
    color: colors.destructive,
  },
});

const mm = (n: number) => `${Math.round(n)}`;

export function SummaryChip({ plan, error }: { plan: Plan | null; error: string | null }) {
  const parts: string[] = [];
  if (plan) {
    parts.push(`${mm(plan.coveredWidthMm)} × ${mm(plan.coveredHeightMm)} mm`);
    if (Math.round(plan.leftoverWidthMm) > 0) parts.push(`${mm(plan.leftoverWidthMm)} mm left on the right`);
    if (Math.round(plan.leftoverHeightMm) > 0) parts.push(`${mm(plan.leftoverHeightMm)} mm left at the bottom`);
  }
  return (
    <div {...stylex.props(styles.wrap)}>
      {plan && (
        <div {...stylex.props(styles.chip)} data-testid="summary">
          <span {...stylex.props(styles.count)}>
            {plan.boards.length} {plan.boards.length === 1 ? 'board' : 'boards'}
          </span>
          <span {...stylex.props(styles.detail)}>{' · ' + parts.join(' · ')}</span>
        </div>
      )}
      {error && (
        <div role="alert" {...stylex.props(styles.chip, styles.error)}>
          {error}
        </div>
      )}
    </div>
  );
}
