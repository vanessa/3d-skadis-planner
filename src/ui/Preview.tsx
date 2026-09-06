import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import type { HardwareMarker } from '../mounting';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { IDENTITY, type Viewport } from './viewport';
import { boardMatches, markerMatches, type Highlight } from './highlight';

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
    transitionProperty: 'opacity, fill',
    transitionDuration: '120ms',
  },
  boardMirrored: {
    fill: mixes.vizFill,
  },
  boardLit: {
    fill: mixes.vizLine,
  },
  boardDim: {
    opacity: 0.45,
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
    transitionProperty: 'opacity, fill',
    transitionDuration: '120ms',
  },
  markerLit: {
    fill: colors.text,
  },
  markerDim: {
    opacity: 0.25,
  },
  tick: {
    stroke: mixes.vizLineStrong,
    strokeWidth: 1.5,
    pointerEvents: 'none',
    transitionProperty: 'opacity, fill',
    transitionDuration: '120ms',
  },
  tickLit: {
    stroke: colors.text,
  },
  tickDim: {
    opacity: 0.25,
  },
});

function Board({
  b, scale, lit, dim,
}: { b: PlacedBoard; scale: number; lit: boolean; dim: boolean }) {
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
        {...stylex.props(
          styles.board,
          mirror !== undefined && styles.boardMirrored,
          lit && styles.boardLit,
          dim && styles.boardDim,
        )}
        data-lit={lit ? '' : undefined}
        data-dim={dim ? '' : undefined}
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

function MarkerDot({
  m, scale, lit, dim,
}: { m: HardwareMarker; scale: number; lit: boolean; dim: boolean }) {
  const r = (markerRadiusPx(m) + (lit ? 1 : 0)) / scale;
  const tickHalf = TICK_PX / 2 / scale;
  return (
    <>
      {m.kind === 'seams' && (
        <line
          data-tick
          {...stylex.props(styles.tick, lit && styles.tickLit, dim && styles.tickDim)}
          data-lit={lit ? '' : undefined}
          data-dim={dim ? '' : undefined}
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
        {...stylex.props(styles.marker, lit && styles.markerLit, dim && styles.markerDim)}
        data-lit={lit ? '' : undefined}
        data-dim={dim ? '' : undefined}
        cx={m.x}
        cy={m.y}
        r={r}
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

export function Preview({
  plan, viewport, width, height, markers, highlight,
}: {
  plan: Plan | null;
  viewport: Viewport;
  width: number;
  height: number;
  markers?: HardwareMarker[];
  highlight?: Highlight | null;
}) {
  const hatchId = useId();
  if (!plan) return null;
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
        {plan.boards.map((b) => {
          const lit = !!highlight && boardMatches(highlight, b);
          const dim = !!highlight && highlight.kind === 'boards' && !lit;
          return <Board key={`${b.col}-${b.row}`} b={b} scale={s} lit={lit} dim={dim} />;
        })}
        {showMarkers && markers && (
          <g data-markers>
            {markers.map((m) => {
              const lit = !!highlight && markerMatches(highlight, m);
              const dim = !!highlight && highlight.kind === 'hardware' && !lit;
              return <MarkerDot key={`${m.kind}-${m.x}-${m.y}`} m={m} scale={s} lit={lit} dim={dim} />;
            })}
          </g>
        )}
        <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
