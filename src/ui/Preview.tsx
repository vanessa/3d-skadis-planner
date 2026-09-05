import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { IDENTITY, type Viewport } from './viewport';

/** Boards narrower than this on screen get no labels. */
const MIN_LABEL_PX = 64;
const LABEL_PX = 13;
const DETAIL_PX = 11;
const HATCH_PX = 8;

const styles = stylex.create({
  svg: {
    display: 'block',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  board: {
    fill: mixes.vizFillDim,
    stroke: { default: colors.surface, ':hover': colors.accent },
    strokeWidth: 2,
    transitionProperty: 'stroke',
    transitionDuration: '100ms',
  },
  boardMirrored: {
    fill: mixes.vizFill,
  },
  value: {
    fill: colors.text,
    fontWeight: 600,
    pointerEvents: 'none',
  },
  detail: {
    fill: colors.muted,
    pointerEvents: 'none',
  },
  outline: {
    fill: 'none',
    stroke: mixes.vizLine,
    strokeWidth: 1,
  },
  hatch: {
    stroke: mixes.vizGrid,
  },
});

function Board({ b, scale }: { b: PlacedBoard; scale: number }) {
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel =
    mirror === 'xy' ? 'mirror X+Y' : mirror === 'x' ? 'mirror X' : mirror === 'y' ? 'mirror Y' : null;
  const showLabels = Math.min(b.widthMm, b.heightMm) * scale >= MIN_LABEL_PX;
  const fs = LABEL_PX / scale;
  const ds = DETAIL_PX / scale;
  const cx = b.xMm + b.widthMm / 2;
  const cy = b.yMm + b.heightMm / 2;
  return (
    <g data-board data-mirror={mirror}>
      <rect
        {...stylex.props(styles.board, mirror !== undefined && styles.boardMirrored)}
        x={b.xMm}
        y={b.yMm}
        width={b.widthMm}
        height={b.heightMm}
        vectorEffect="non-scaling-stroke"
      />
      {showLabels && (
        <>
          <text {...stylex.props(styles.value)} x={cx} y={cy - 2 / scale} fontSize={fs} textAnchor="middle">
            {b.cols}×{b.rows}
          </text>
          <text {...stylex.props(styles.detail)} x={cx} y={cy + 12 / scale} fontSize={ds} textAnchor="middle">
            {b.widthMm}×{b.heightMm} mm
          </text>
          {mirrorLabel && (
            <text {...stylex.props(styles.detail)} x={cx} y={cy + 25 / scale} fontSize={ds} textAnchor="middle">
              {mirrorLabel}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function Preview({
  plan, viewport, width, height,
}: { plan: Plan | null; viewport: Viewport; width: number; height: number }) {
  const hatchId = useId();
  if (!plan) return null;
  const totalW = plan.coveredWidthMm + plan.leftoverWidthMm;
  const totalH = plan.coveredHeightMm + plan.leftoverHeightMm;
  const hasLayout = width > 0 && height > 0;
  const v = hasLayout ? viewport : IDENTITY;
  const s = v.scale;
  const viewBox = hasLayout ? `0 0 ${width} ${height}` : `0 0 ${totalW} ${totalH}`;
  const hatch = HATCH_PX / s;
  return (
    <svg
      {...stylex.props(styles.svg)}
      viewBox={viewBox}
      role="img"
      aria-label="Board layout preview"
    >
      <defs>
        <pattern id={hatchId} width={hatch} height={hatch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line {...stylex.props(styles.hatch)} x1={hatch / 2} y1={0} x2={hatch / 2} y2={hatch} strokeWidth={3 / s} />
        </pattern>
      </defs>
      <g transform={`translate(${v.tx} ${v.ty}) scale(${s})`}>
        {plan.leftoverWidthMm > 0 && (
          <rect data-leftover x={plan.coveredWidthMm} y={0} width={plan.leftoverWidthMm} height={totalH} fill={`url(#${hatchId})`} />
        )}
        {plan.leftoverHeightMm > 0 && (
          <rect data-leftover x={0} y={plan.coveredHeightMm} width={plan.coveredWidthMm} height={plan.leftoverHeightMm} fill={`url(#${hatchId})`} />
        )}
        {plan.boards.map((b) => (
          <Board key={`${b.col}-${b.row}`} b={b} scale={s} />
        ))}
        <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
