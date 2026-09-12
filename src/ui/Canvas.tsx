import { useCallback } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import type { HardwareMarker } from '../mounting';
import { laneChains, marginMm, overlayLegible, scaleAwareMinGapMm } from '../mounting';
import type { Unit } from '../units';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { Preview, type PreviewMode } from './Preview';
import type { Highlight } from './highlight';
import { SummaryChip } from './SummaryChip';
import { useViewport } from './useViewport';
import { CanvasToolbar } from './CanvasToolbar';
import { stageLayout } from './stageLayout';
import { fitViewport, type Size } from './viewport';

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

/**
 * The margin `measurements` mode wants to reserve for its dimension lanes, or
 * `null` if reserving it would leave the boards too small to be legible — in
 * which case Canvas must fall back to the unmargined world so its fit scale
 * agrees with what Preview's own (identical) legibility check will decide.
 */
export function measurementsMargin(
  stage: Size, plan: Plan, markers: HardwareMarker[], totalW: number, totalH: number,
): { left: number; bottom: number } | null {
  // Lane spacing needs to know the scale labels will render at, but scale
  // depends on the margin the lanes need — so approximate it from the
  // unmargined fit first. Margin only ever shrinks the fit further, so this
  // slightly overestimates scale (and so underestimates the gap needed)
  // only by the margin's own share of the stage, which the legibility check
  // below still catches if it matters.
  const baseFit = fitViewport(stage, { width: totalW, height: totalH });
  const minGapMm = scaleAwareMinGapMm(baseFit.scale);
  const chains = laneChains(markers, totalH, minGapMm);
  const left = marginMm(chains.y);
  const bottom = marginMm(chains.x);
  const fit = fitViewport(stage, { width: totalW + left, height: totalH + bottom });
  return overlayLegible(plan.boards, fit.scale) ? { left, bottom } : null;
}

export function Canvas({
  plan, error, markers, highlight, mode, unit,
}: {
  plan: Plan | null;
  error: string | null;
  markers?: HardwareMarker[];
  highlight?: Highlight | null;
  mode: PreviewMode;
  unit?: Unit;
}) {
  const totalW = plan ? plan.coveredWidthMm + plan.leftoverWidthMm : 0;
  const totalH = plan ? plan.coveredHeightMm + plan.leftoverHeightMm : 0;
  const wantsMeasurements = mode === 'measurements' && !!markers && markers.length > 0;

  const worldFn = useCallback((stage: Size): Size | null => {
    if (!plan) return null;
    const base = { width: totalW, height: totalH };
    if (!wantsMeasurements || !markers) return base;
    const margin = measurementsMargin(stage, plan, markers, totalW, totalH);
    return margin ? { width: totalW + margin.left, height: totalH + margin.bottom } : base;
  }, [plan, wantsMeasurements, markers, totalW, totalH]);

  const { size, viewport, ratio, refit, handlers, dragging, stageRef } = useViewport(worldFn);

  const margin = plan && wantsMeasurements && markers ? measurementsMargin(size, plan, markers, totalW, totalH) : null;
  const marginLeft = margin?.left ?? 0;
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
            mode={mode}
            unit={unit}
            origin={{ x: marginLeft, y: 0 }}
          />
          {plan && <CanvasToolbar ratio={ratio} onFit={refit} />}
        </div>
      </div>
    </main>
  );
}
