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
 * The laned dimension chains for both axes, ready to render or to size a
 * margin from. The origin corner (0 mm on either axis) is dropped — it's the
 * drawing's own corner and needs no dimension line.
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
