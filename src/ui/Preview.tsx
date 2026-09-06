import { useEffect, useId, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import type { HardwareMarker } from '../mounting';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { IDENTITY, type Viewport } from './viewport';

/** Boards narrower than this on screen get no labels. */
const MIN_LABEL_PX = 64;
/** Boards with a shorter side under this on screen get no hardware markers. */
const MIN_MARKER_PX = 32;
const LABEL_PX = 13;
const DETAIL_PX = 11;
const HATCH_PX = 8;
/** Seam tick length in screen px, split evenly across the seam. */
const TICK_PX = 12;
/** Hard cap on markers drawn, to bound SVG node count for pathological plans. */
const MAX_MARKERS = 4000;

/** Screen-px radius for a marker, constant under zoom. */
function markerRadiusPx(m: HardwareMarker): number {
  if (m.kind === 'nodes') return m.role === 'junction' ? 5 : 4;
  if (m.kind === 'boardCorners') return 3;
  return 4; // seams, outerNodes
}

const styles = stylex.create({
  svg: {
    display: 'block',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  board: {
    fill: mixes.vizFillDim,
    stroke: colors.surface,
    strokeWidth: 2,
  },
  /** Drawn once, after every board, so neighbouring strokes cannot cover it. */
  highlight: {
    fill: 'none',
    stroke: colors.accent,
    strokeWidth: 2,
    pointerEvents: 'none',
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
  marker: {
    fill: mixes.vizData,
    stroke: colors.surface,
    strokeWidth: 1.5,
    pointerEvents: 'none',
  },
  tick: {
    stroke: mixes.vizLineStrong,
    strokeWidth: 1.5,
    pointerEvents: 'none',
  },
});

function Board({
  b, scale, onHover,
}: { b: PlacedBoard; scale: number; onHover: (hovered: boolean) => void }) {
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel =
    mirror === 'xy' ? 'mirrored X + Y' : mirror === 'x' ? 'mirrored X' : mirror === 'y' ? 'mirrored Y' : null;
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
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
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

function MarkerDot({ m, scale }: { m: HardwareMarker; scale: number }) {
  const r = markerRadiusPx(m) / scale;
  const tickHalf = TICK_PX / 2 / scale;
  return (
    <>
      {m.kind === 'seams' && (
        <line
          data-tick
          {...stylex.props(styles.tick)}
          x1={m.orientation === 'vertical' ? m.x - tickHalf : m.x}
          y1={m.orientation === 'vertical' ? m.y : m.y - tickHalf}
          x2={m.orientation === 'vertical' ? m.x + tickHalf : m.x}
          y2={m.orientation === 'vertical' ? m.y : m.y + tickHalf}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <circle
        data-marker
        data-kind={m.kind}
        {...stylex.props(styles.marker)}
        cx={m.x}
        cy={m.y}
        r={r}
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

export function Preview({
  plan, viewport, width, height, markers,
}: { plan: Plan | null; viewport: Viewport; width: number; height: number; markers?: HardwareMarker[] }) {
  const hatchId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => setHovered(null), [plan]);
  if (!plan) return null;
  const hoveredBoard = hovered !== null ? plan.boards[hovered] : undefined;
  const totalW = plan.coveredWidthMm + plan.leftoverWidthMm;
  const totalH = plan.coveredHeightMm + plan.leftoverHeightMm;
  const hasLayout = width > 0 && height > 0;
  const v = hasLayout ? viewport : IDENTITY;
  const s = v.scale;
  const viewBox = hasLayout ? `0 0 ${width} ${height}` : `0 0 ${totalW} ${totalH}`;
  const hatch = HATCH_PX / s;
  const showMarkers =
    !!markers &&
    markers.length > 0 &&
    markers.length <= MAX_MARKERS &&
    Math.min(...plan.boards.map((b) => Math.min(b.widthMm, b.heightMm))) * s >= MIN_MARKER_PX;
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
        {plan.boards.map((b, i) => (
          <Board key={`${b.col}-${b.row}`} b={b} scale={s} onHover={(on) => setHovered(on ? i : null)} />
        ))}
        {showMarkers && markers && (
          <g data-markers>
            {markers.map((m) => (
              <MarkerDot key={`${m.kind}-${m.x}-${m.y}`} m={m} scale={s} />
            ))}
          </g>
        )}
        <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
        {hoveredBoard && (
          <rect
            data-highlight
            {...stylex.props(styles.highlight)}
            x={hoveredBoard.xMm}
            y={hoveredBoard.yMm}
            width={hoveredBoard.widthMm}
            height={hoveredBoard.heightMm}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </g>
    </svg>
  );
}
