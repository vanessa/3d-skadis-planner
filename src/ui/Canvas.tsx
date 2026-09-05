import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { Preview } from './Preview';
import { SummaryChip } from './SummaryChip';

const MOBILE = '@media (max-width: 800px)';

const styles = stylex.create({
  canvas: {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
    backgroundColor: colors.bg,
    backgroundImage: `radial-gradient(${mixes.vizGrid} 1px, transparent 1px)`,
    backgroundSize: '16px 16px',
    overflow: 'hidden',
  },
  chip: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 1,
  },
  stage: {
    position: 'absolute',
    top: '56px',
    left: '24px',
    right: { default: '334px', [MOBILE]: '24px' },
    bottom: { default: '24px', [MOBILE]: 'calc(50dvh + 16px)' },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function Canvas({ plan, error }: { plan: Plan | null; error: string | null }) {
  return (
    <div {...stylex.props(styles.canvas)}>
      <div {...stylex.props(styles.chip)}>
        <SummaryChip plan={plan} error={error} />
      </div>
      <div {...stylex.props(styles.stage)}>
        <Preview plan={plan} />
      </div>
    </div>
  );
}
