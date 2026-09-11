import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import {
  laneChains, overlayLegible, scaleAwareMinGapMm,
  type DimensionValue, type HardwareMarker, BASE_GAP_MM, LANE_SPACING_MM,
} from '../mounting';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { IDENTITY, fitViewport, type Viewport } from './viewport';
import { boardMatches, markerMatches, boardsFallback, type Highlight } from './highlight';

/** Boards narrower than this on screen get no labels. */
const MIN_LABEL_PX = 64;
const LABEL_PX = 13;
const DETAIL_PX = 11;
const HATCH_PX = 8;
const DIM_LABEL_PX = 11;
/** Seam tick length in screen px, split evenly across the seam. */
const TICK_PX = 12;
/**
 * How far (screen px) a dimension label sits back from the point it measures,
 * along its own line — enough to clear the end tick and stay inside the
 * reserved margin, but close enough to read as labelling that point. Clamped
 * to half the line so it never crosses the midpoint on very short lines.
 */
export const DIM_LABEL_INSET_PX = 20;
/**
 * Screen px a dimension label sits off its own line (perpendicular to it), so
 * the line's stroke runs beside the label instead of through the middle of
 * its glyphs.
 */
export const DIM_LABEL_LINE_GAP_PX = 12;
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
    fill: mixes.vizFillLit,
  },
  boardDim: {
    opacity: 0.7,
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
    transitionProperty: 'opacity, stroke',
    transitionDuration: '120ms',
  },
  tickLit: {
    stroke: colors.text,
  },
  tickDim: {
    opacity: 0.25,
  },
  dimExt: {
    stroke: mixes.vizLine,
    strokeWidth: 1,
    opacity: 0.6,
    pointerEvents: 'none',
  },
  dimLine: {
    stroke: mixes.vizLineStrong,
    strokeWidth: 1,
    pointerEvents: 'none',
  },
  dimTick: {
    stroke: mixes.vizLineStrong,
    strokeWidth: 1.5,
    pointerEvents: 'none',
  },
  dimLabel: {
    fill: colors.text,
    pointerEvents: 'none',
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

function XDimensionGeometry({ value, lane, baseY, scale }: { value: number; lane: number; baseY: number; scale: number }) {
  const lineY = baseY + BASE_GAP_MM + (lane + 1) * LANE_SPACING_MM;
  const tick = TICK_PX / 2 / scale;
  return (
    <g data-dim-line data-axis="x" data-value={value}>
      <line {...stylex.props(styles.dimExt)} x1={0} y1={baseY} x2={0} y2={lineY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimExt)} x1={value} y1={baseY} x2={value} y2={lineY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimLine)} x1={0} y1={lineY} x2={value} y2={lineY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={0} y1={lineY - tick} x2={0} y2={lineY + tick} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={value} y1={lineY - tick} x2={value} y2={lineY + tick} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function XDimensionLabel({ value, lane, baseY, scale }: { value: number; lane: number; baseY: number; scale: number }) {
  const lineY = baseY + BASE_GAP_MM + (lane + 1) * LANE_SPACING_MM;
  const fs = DIM_LABEL_PX / scale;
  // Label at the measured end (x = value), pulled back toward the wall by a
  // fixed screen distance; never past the midpoint on lines too short for it.
  const labelX = value - Math.min(DIM_LABEL_INSET_PX / scale, value / 2);
  // Sits above the line (toward the boards, away from the outer margin edge)
  // so the line's stroke doesn't run through the glyphs.
  const labelY = lineY - DIM_LABEL_LINE_GAP_PX / scale;
  return (
    <text
      data-dim-label
      data-axis="x"
      data-value={value}
      {...stylex.props(styles.dimLabel)}
      x={labelX}
      y={labelY}
      fontSize={fs}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {value} mm
    </text>
  );
}

function YDimensionGeometry({ value, lane, baseY, scale }: { value: number; lane: number; baseY: number; scale: number }) {
  const pointY = baseY - value;
  const lineX = -(BASE_GAP_MM + (lane + 1) * LANE_SPACING_MM);
  const tick = TICK_PX / 2 / scale;
  return (
    <g data-dim-line data-axis="y" data-value={value}>
      <line {...stylex.props(styles.dimExt)} x1={0} y1={baseY} x2={lineX} y2={baseY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimExt)} x1={0} y1={pointY} x2={lineX} y2={pointY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimLine)} x1={lineX} y1={baseY} x2={lineX} y2={pointY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={lineX - tick} y1={baseY} x2={lineX + tick} y2={baseY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={lineX - tick} y1={pointY} x2={lineX + tick} y2={pointY} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function YDimensionLabel({ value, lane, baseY, scale }: { value: number; lane: number; baseY: number; scale: number }) {
  const pointY = baseY - value;
  const lineX = -(BASE_GAP_MM + (lane + 1) * LANE_SPACING_MM);
  const fs = DIM_LABEL_PX / scale;
  // Label at the measured end (y = pointY, above the floor at baseY), pulled
  // back down toward the floor by a fixed screen distance; never past the
  // midpoint on lines too short for it.
  const labelY = pointY + Math.min(DIM_LABEL_INSET_PX / scale, value / 2);
  // Sits beside the line (toward the boards) rather than centered on it, so
  // after rotation the line's stroke doesn't run through the glyphs. The
  // rotation pivots on this same shifted anchor.
  const labelX = lineX + DIM_LABEL_LINE_GAP_PX / scale;
  return (
    <text
      data-dim-label
      data-axis="y"
      data-value={value}
      {...stylex.props(styles.dimLabel)}
      x={labelX}
      y={labelY}
      fontSize={fs}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(-90 ${labelX} ${labelY})`}
    >
      {value} mm
    </text>
  );
}

function DimensionOverlay({
  markers, totalHeightMm, scale, minGapMm,
}: { markers: HardwareMarker[]; totalHeightMm: number; scale: number; minGapMm: number }) {
  const { x, y } = laneChains(markers, totalHeightMm, minGapMm);
  return (
    <g data-dimensions>
      {/* All geometry first, then all labels: dimension lines for different
          values often share a lane and overlap (they all run from 0), so a
          label painted inside its own value's group could still end up
          underneath a later, longer line sharing that lane. Drawing every
          label after every line guarantees labels are always on top. */}
      <g data-dim-geometry>
        {x.map((v: DimensionValue) => (
          <XDimensionGeometry key={`x-${v.mm}`} value={v.mm} lane={v.lane} baseY={totalHeightMm} scale={scale} />
        ))}
        {y.map((v: DimensionValue) => (
          <YDimensionGeometry key={`y-${v.mm}`} value={v.mm} lane={v.lane} baseY={totalHeightMm} scale={scale} />
        ))}
      </g>
      <g data-dim-labels>
        {x.map((v: DimensionValue) => (
          <XDimensionLabel key={`x-${v.mm}`} value={v.mm} lane={v.lane} baseY={totalHeightMm} scale={scale} />
        ))}
        {y.map((v: DimensionValue) => (
          <YDimensionLabel key={`y-${v.mm}`} value={v.mm} lane={v.lane} baseY={totalHeightMm} scale={scale} />
        ))}
      </g>
    </g>
  );
}

export type PreviewMode = 'hardware' | 'measurements';

export function Preview({
  plan, viewport, width, height, markers, highlight, mode = 'hardware', origin = { x: 0, y: 0 },
}: {
  plan: Plan | null;
  viewport: Viewport;
  width: number;
  height: number;
  markers?: HardwareMarker[];
  highlight?: Highlight | null;
  mode?: PreviewMode;
  origin?: { x: number; y: number };
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
  const legible = overlayLegible(plan.boards, s);
  const showMarkers = !!markers && markers.length > 0 && markers.length <= MAX_MARKERS && legible;
  const showMeasurements = mode === 'measurements' && !!markers && markers.length > 0 && legible;
  // Same approximation Canvas.tsx's measurementsMargin uses when sizing the
  // margin, from the same stage/plan inputs — so the lane count (and thus
  // gap) this renders with matches what margin was actually reserved for.
  const baseFit = fitViewport({ width, height }, { width: totalW, height: totalH });
  const minGapMm = scaleAwareMinGapMm(baseFit.scale);
  const litMarkers = highlight && showMarkers && markers ? markers.filter((m) => markerMatches(highlight, m)) : [];
  const boardsLitFallback = !!highlight && boardsFallback(highlight, litMarkers.length > 0);
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
      <g transform={`translate(${v.tx} ${v.ty}) scale(${s}) translate(${origin.x} ${origin.y})`}>
        {plan.leftoverWidthMm > 0 && (
          <rect data-leftover x={plan.coveredWidthMm} y={0} width={plan.leftoverWidthMm} height={totalH} fill={`url(#${hatchId})`} />
        )}
        {plan.leftoverHeightMm > 0 && (
          <rect data-leftover x={0} y={plan.coveredHeightMm} width={plan.coveredWidthMm} height={plan.leftoverHeightMm} fill={`url(#${hatchId})`} />
        )}
        {plan.boards.map((b) => {
          const lit = !!highlight && (boardMatches(highlight, b) || boardsLitFallback);
          const dim = !!highlight && highlight.kind === 'boards' && !lit;
          return <Board key={`${b.col}-${b.row}`} b={b} scale={s} lit={lit} dim={dim} />;
        })}
        {showMarkers && markers && (
          <g data-markers>
            {markers.map((m) => {
              const lit = !!highlight && markerMatches(highlight, m);
              const dim = litMarkers.length > 0 && !lit;
              return <MarkerDot key={`${m.kind}-${m.x}-${m.y}`} m={m} scale={s} lit={lit} dim={dim} />;
            })}
          </g>
        )}
        {showMeasurements && markers && (
          <DimensionOverlay markers={markers} totalHeightMm={totalH} scale={s} minGapMm={minGapMm} />
        )}
        <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
