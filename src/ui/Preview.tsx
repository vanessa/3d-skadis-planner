import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import { colors, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  frame: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  svg: {
    display: 'block',
    width: '100%',
    height: 'auto',
    maxHeight: '60vh',
  },
});

function Board({ b }: { b: PlacedBoard }) {
  const fontSize = Math.min(b.widthMm, b.heightMm) * 0.14;
  const cx = b.xMm + b.widthMm / 2;
  const cy = b.yMm + b.heightMm / 2;
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel = mirror === 'xy' ? 'mirror X+Y' : mirror === 'x' ? 'mirror X' : mirror === 'y' ? 'mirror Y' : null;
  return (
    <g data-board data-mirror={mirror}>
      <rect
        x={b.xMm}
        y={b.yMm}
        width={b.widthMm}
        height={b.heightMm}
        fill={mirror ? mixes.vizFill : mixes.vizFillDim}
        stroke={mixes.vizLineStrong}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <text x={cx} y={cy - fontSize * 0.2} fontSize={fontSize} textAnchor="middle" fill={colors.text} fontWeight={600}>
        {b.cols}×{b.rows}
      </text>
      <text x={cx} y={cy + fontSize * 0.9} fontSize={fontSize * 0.7} textAnchor="middle" fill={colors.text} opacity={0.7}>
        {b.widthMm}×{b.heightMm} mm
      </text>
      {mirrorLabel && (
        <text x={cx} y={cy + fontSize * 1.8} fontSize={fontSize * 0.6} textAnchor="middle" fill={mixes.vizLineStrong}>
          {mirrorLabel}
        </text>
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
    <div {...stylex.props(styles.frame)}>
      <svg
        {...stylex.props(styles.svg)}
        viewBox={`0 0 ${totalW} ${totalH}`}
        role="img"
        aria-label="Board layout preview"
      >
        <defs>
          <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={mixes.vizGrid} strokeWidth="3" />
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
      </svg>
    </div>
  );
}
