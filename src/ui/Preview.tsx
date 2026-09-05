import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const MIN_LABEL_MM = 80; // 2-hole (60 mm) boards are too small to label
// 0.07: a 1000 mm wall fills roughly 900 px of viewport, so a 200 mm board
// (the smallest common board) renders its hole-count label at ~13 px, in
// line with the type scale's font.md.
const LABEL_SCALE = 0.07;

const styles = stylex.create({
  svg: {
    display: 'block',
    width: '100%',
    height: '100%',
    overflow: 'visible',
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

function Board({ b }: { b: PlacedBoard }) {
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel =
    mirror === 'xy' ? 'mirror X+Y' : mirror === 'x' ? 'mirror X' : mirror === 'y' ? 'mirror Y' : null;
  const showLabels = Math.min(b.widthMm, b.heightMm) >= MIN_LABEL_MM;
  const fontSize = Math.min(b.widthMm, b.heightMm) * LABEL_SCALE;
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
          <text {...stylex.props(styles.value)} x={cx} y={cy - fontSize * 0.2} fontSize={fontSize} textAnchor="middle">
            {b.cols}×{b.rows}
          </text>
          <text {...stylex.props(styles.detail)} x={cx} y={cy + fontSize * 1.0} fontSize={fontSize * 0.85} textAnchor="middle">
            {b.widthMm}×{b.heightMm} mm
          </text>
          {mirrorLabel && (
            <text {...stylex.props(styles.detail)} x={cx} y={cy + fontSize * 2.0} fontSize={fontSize * 0.85} textAnchor="middle">
              {mirrorLabel}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function Preview({ plan }: { plan: Plan | null }) {
  const hatchId = useId();
  if (!plan) return null;
  const totalW = plan.coveredWidthMm + plan.leftoverWidthMm;
  const totalH = plan.coveredHeightMm + plan.leftoverHeightMm;
  return (
    <svg
      {...stylex.props(styles.svg)}
      viewBox={`0 0 ${totalW} ${totalH}`}
      role="img"
      aria-label="Board layout preview"
    >
      <defs>
        <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line {...stylex.props(styles.hatch)} x1="4" y1="0" x2="4" y2="8" strokeWidth="3" />
        </pattern>
      </defs>
      {plan.leftoverWidthMm > 0 && (
        <rect data-leftover x={plan.coveredWidthMm} y={0} width={plan.leftoverWidthMm} height={totalH} fill={`url(#${hatchId})`} />
      )}
      {plan.leftoverHeightMm > 0 && (
        <rect data-leftover x={0} y={plan.coveredHeightMm} width={plan.coveredWidthMm} height={plan.leftoverHeightMm} fill={`url(#${hatchId})`} />
      )}
      {plan.boards.map((b) => (
        <Board key={`${b.col}-${b.row}`} b={b} />
      ))}
      <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
