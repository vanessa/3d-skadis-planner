import type { Plan, PlacedBoard } from '../solver';
import type { BoardModel } from '../models/types';
import type { HardwareMarker, MountSystem } from './types';

/** Prefix sums, starting at 0, of a list of sizes in mm. */
function boundaries(sizes: number[]): number[] {
  const result = [0];
  let acc = 0;
  for (const size of sizes) {
    acc += size;
    result.push(acc);
  }
  return result;
}

/**
 * Every lattice point, with its role by position. A junction or edge node is
 * the shared meeting point of 2-4 boards' corners, so the mount's own screw
 * sits right there. An outer corner belongs to a single board with no
 * neighbor to share the point with, so its mount uses that board's own screw
 * hole — inset from the true corner the same way `boardCorners` insets from
 * each board's edge, not placed exactly at the corner.
 */
function nodeMarkers(colB: number[], rowB: number[], outerCornerInsetMm: number): HardwareMarker[] {
  const c = colB.length - 1;
  const r = rowB.length - 1;
  const markers: HardwareMarker[] = [];
  for (let j = 0; j <= r; j++) {
    for (let i = 0; i <= c; i++) {
      const xInterior = i > 0 && i < c;
      const yInterior = j > 0 && j < r;
      const role = xInterior && yInterior ? 'junction' : xInterior !== yInterior ? 'edgeNode' : 'outerCorner';
      const x = role === 'outerCorner' ? colB[i] + (i === 0 ? outerCornerInsetMm : -outerCornerInsetMm) : colB[i];
      const y = role === 'outerCorner' ? rowB[j] + (j === 0 ? outerCornerInsetMm : -outerCornerInsetMm) : rowB[j];
      markers.push({ x, y, kind: 'nodes', role });
    }
  }
  return markers;
}

/** Lattice points on the outer edge only: edge nodes and the four corners. */
function outerNodeMarkers(colB: number[], rowB: number[], outerCornerInsetMm: number): HardwareMarker[] {
  return nodeMarkers(colB, rowB, outerCornerInsetMm)
    .filter((m) => m.role !== 'junction')
    .map((m) => ({ ...m, kind: 'outerNodes' as const }));
}

/** Four points inset from each board's corners. */
function boardCornerMarkers(boards: PlacedBoard[], insetMm: number): HardwareMarker[] {
  const markers: HardwareMarker[] = [];
  for (const b of boards) {
    markers.push(
      { x: b.xMm + insetMm, y: b.yMm + insetMm, kind: 'boardCorners' },
      { x: b.xMm + b.widthMm - insetMm, y: b.yMm + insetMm, kind: 'boardCorners' },
      { x: b.xMm + insetMm, y: b.yMm + b.heightMm - insetMm, kind: 'boardCorners' },
      { x: b.xMm + b.widthMm - insetMm, y: b.yMm + b.heightMm - insetMm, kind: 'boardCorners' },
    );
  }
  return markers;
}

/** Midpoints of every shared edge between two adjacent boards. */
function seamMarkers(boards: PlacedBoard[], colCount: number, rowCount: number, colB: number[], rowB: number[]): HardwareMarker[] {
  const at = new Map<string, PlacedBoard>();
  for (const b of boards) at.set(`${b.row},${b.col}`, b);
  const boardAt = (row: number, col: number) => at.get(`${row},${col}`);
  const markers: HardwareMarker[] = [];
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount - 1; col++) {
      const b = boardAt(row, col);
      if (!b) continue;
      markers.push({ x: colB[col + 1], y: b.yMm + b.heightMm / 2, kind: 'seams', orientation: 'vertical' });
    }
  }
  for (let col = 0; col < colCount; col++) {
    for (let row = 0; row < rowCount - 1; row++) {
      const b = boardAt(row, col);
      if (!b) continue;
      markers.push({ x: b.xMm + b.widthMm / 2, y: rowB[row + 1], kind: 'seams', orientation: 'horizontal' });
    }
  }
  return markers;
}

/** Marker positions for the given system's hardware on the given plan. */
export function hardwareMarkers(plan: Plan, system: MountSystem, model: BoardModel): HardwareMarker[] {
  const c = plan.columns.length;
  const r = plan.rows.length;
  if (c === 0 || r === 0) return [];
  const colB = boundaries(plan.columns.map((h) => model.sizeMm(h)));
  const rowB = boundaries(plan.rows.map((h) => model.sizeMm(h)));
  const markers: HardwareMarker[] = [];
  const outerCornerInsetMm = system.outerCornerInsetMm ?? 0;
  for (const kind of system.markers) {
    if (kind === 'nodes') markers.push(...nodeMarkers(colB, rowB, outerCornerInsetMm));
    else if (kind === 'outerNodes') markers.push(...outerNodeMarkers(colB, rowB, outerCornerInsetMm));
    else if (kind === 'boardCorners') markers.push(...boardCornerMarkers(plan.boards, model.screwInsetMm));
    else if (kind === 'seams') markers.push(...seamMarkers(plan.boards, c, r, colB, rowB));
  }
  return markers;
}
