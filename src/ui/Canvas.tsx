import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import type { HardwareMarker } from '../mounting';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { Preview } from './Preview';
import type { Highlight } from './highlight';
import { SummaryChip } from './SummaryChip';
import { useViewport } from './useViewport';
import { CanvasToolbar } from './CanvasToolbar';
import { stageLayout } from './stageLayout';

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
    pointerEvents: 'none',
  },
  surface: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
    overflow: 'hidden',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'grab',
  },
  dragging: {
    cursor: 'grabbing',
  },
});

export function Canvas({
  plan, error, markers, highlight,
}: { plan: Plan | null; error: string | null; markers?: HardwareMarker[]; highlight?: Highlight | null }) {
  const world = plan
    ? { width: plan.coveredWidthMm + plan.leftoverWidthMm, height: plan.coveredHeightMm + plan.leftoverHeightMm }
    : null;
  const { size, viewport, ratio, refit, handlers, dragging, stageRef } = useViewport(world);
  return (
    <main {...stylex.props(styles.canvas)}>
      <div {...stylex.props(styles.chip)}>
        <SummaryChip plan={plan} error={error} />
      </div>
      <div {...stylex.props(stageLayout.stage)}>
        <div ref={stageRef} {...handlers} {...stylex.props(styles.surface, dragging && styles.dragging)}>
          <Preview
            plan={plan}
            viewport={viewport}
            width={size.width}
            height={size.height}
            markers={markers}
            highlight={highlight}
          />
          {plan && <CanvasToolbar ratio={ratio} onFit={refit} />}
        </div>
      </div>
    </main>
  );
}
