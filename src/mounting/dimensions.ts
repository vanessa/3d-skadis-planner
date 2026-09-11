import type { HardwareMarker } from './types';

export interface DimensionValue {
  mm: number;
  lane: number;
}

/** Minimum mm gap between two values sharing a lane before the later one bumps out. */
export const MIN_GAP_MM = 60;
/** Lanes beyond this share the outermost one instead of growing further. */
export const MAX_LANES = 4;
/** mm spacing between adjacent lanes in the rendered margin. */
export const LANE_SPACING_MM = 40;
/** mm gap between the boards' edge and the first lane. */
export const BASE_GAP_MM = 24;
/** Boards with a shorter side under this on screen get no hardware markers or dimension overlay. */
export const MIN_MARKER_PX = 32;
/**
 * Screen px a dimension label needs between its center and its neighbor's to
 * avoid touching. Dimension labels render at the midpoint of their baseline
 * (from 0 to the value), so two same-lane values only end up this far apart
 * on screen once the *value* gap between them is `2 * LABEL_GAP_PX / scale`
 * (see `scaleAwareMinGapMm`) — half of the value gap is "spent" by the
 * midpoint halving before it ever reaches the screen.
 */
export const LABEL_GAP_PX = 50;

function uniqueSorted(values: number[]): number[] {
  const rounded = values.map((v) => Math.round(v));
  return [...new Set(rounded)].sort((a, b) => a - b);
}

/**
 * Unique X values (distance from the left wall) and Y values (height from the
 * floor) across every drill point, ascending. Markers use top-down SVG y, so
 * height from the floor is `totalHeightMm - marker.y`.
 */
export function dimensionAxes(
  markers: HardwareMarker[],
  totalHeightMm: number,
): { x: number[]; y: number[] } {
  return {
    x: uniqueSorted(markers.map((m) => m.x)),
    y: uniqueSorted(markers.map((m) => totalHeightMm - m.y)),
  };
}

/**
 * Assigns each ascending value to the lowest lane whose last placed value is
 * at least `minGapMm` away. Values that still collide once `maxLanes` lanes
 * exist share the outermost lane. `values` must already be sorted ascending.
 */
export function assignLanes(values: number[], minGapMm: number, maxLanes: number = MAX_LANES): DimensionValue[] {
  const lastInLane: number[] = [];
  const result: DimensionValue[] = [];
  for (const v of values) {
    let lane = lastInLane.findIndex((last) => v - last >= minGapMm);
    if (lane === -1) {
      lane = lastInLane.length < maxLanes ? lastInLane.length : maxLanes - 1;
    }
    lastInLane[lane] = v;
    result.push({ mm: v, lane });
  }
  return result;
}

/** Number of lanes actually used (0 if there are no values). */
export function laneCount(laned: DimensionValue[]): number {
  return laned.reduce((max, v) => Math.max(max, v.lane + 1), 0);
}

/** mm reserved for an axis's dimension lanes, including the gap before the first lane. */
export function marginMm(laned: DimensionValue[]): number {
  const count = laneCount(laned);
  return count === 0 ? 0 : BASE_GAP_MM + count * LANE_SPACING_MM;
}

/**
 * The mm gap same-lane values need at `scale` (screen px per mm) so their
 * labels don't overlap, given labels render at the baseline's midpoint (see
 * `LABEL_GAP_PX`). Never smaller than `MIN_GAP_MM`, the original fixed floor,
 * so zoomed-in views keep at least that much breathing room too.
 */
export function scaleAwareMinGapMm(scale: number): number {
  if (scale <= 0) return MIN_GAP_MM;
  return Math.max(MIN_GAP_MM, (2 * LABEL_GAP_PX) / scale);
}

/**
 * The laned dimension chains for both axes, ready to render or to size a
 * margin from. The origin corner (0 mm on either axis) is dropped — it's the
 * drawing's own corner and needs no dimension line. `minGapMm` defaults to
 * the fixed floor; pass `scaleAwareMinGapMm(scale)` for a threshold that
 * actually keeps labels legible at the current zoom.
 */
export function laneChains(
  markers: HardwareMarker[],
  totalHeightMm: number,
  minGapMm: number = MIN_GAP_MM,
): { x: DimensionValue[]; y: DimensionValue[] } {
  const { x, y } = dimensionAxes(markers, totalHeightMm);
  return {
    x: assignLanes(x.filter((v) => v > 0), minGapMm),
    y: assignLanes(y.filter((v) => v > 0), minGapMm),
  };
}

/**
 * Whether hardware markers / the dimension overlay are legible at `scale`: the
 * shortest side of the smallest board maps to at least `MIN_MARKER_PX` screen px.
 * Shared by Canvas (deciding whether to reserve margin for the overlay) and Preview
 * (deciding whether to draw markers or the overlay), so the two can never disagree.
 */
export function overlayLegible(boards: { widthMm: number; heightMm: number }[], scale: number): boolean {
  if (boards.length === 0) return false;
  const minSideMm = Math.min(...boards.map((b) => Math.min(b.widthMm, b.heightMm)));
  return minSideMm * scale >= MIN_MARKER_PX;
}
