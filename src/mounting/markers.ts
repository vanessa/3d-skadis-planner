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
 * Every lattice point, with its role by position. A junction is the shared
 * meeting point of 4 boards' corners — symmetric on every side, so the
 * mount's own screw sits right there. An edge node (2 boards, along the outer
 * boundary) or an outer corner (1 board, no neighbor) each has at least one
 * side with no board beyond it, so on that side the mount uses the board's
 * own screw hole instead — inset along whichever axis has no interior
 * neighbor, the same way `boardCorners` insets from each board's own edge.
 * An edge node insets on a single axis (it has an interior neighbor on the
 * other); an outer corner insets on both.
 */
function nodeMarkers(colB: number[], rowB: number[], insetMm: number): HardwareMarker[] {
  const c = colB.length - 1;
  const r = rowB.length - 1;
  const markers: HardwareMarker[] = [];
  for (let j = 0; j <= r; j++) {
    for (let i = 0; i <= c; i++) {
      const xInterior = i > 0 && i < c;
      const yInterior = j > 0 && j < r;
      const role = xInterior && yInterior ? 'junction' : xInterior !== yInterior ? 'edgeNode' : 'outerCorner';
      const x = xInterior ? colB[i] : colB[i] + (i === 0 ? insetMm : -insetMm);
      const y = yInterior ? rowB[j] : rowB[j] + (j === 0 ? insetMm : -insetMm);
      markers.push({ x, y, kind: 'nodes', role });
    }
  }
  return markers;
}

/** Lattice points on the outer edge only: edge nodes and the four corners. */
function outerNodeMarkers(colB: number[], rowB: number[], insetMm: number): HardwareMarker[] {
  return nodeMarkers(colB, rowB, insetMm)
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
  const nodeInsetMm = system.nodeInsetMm ?? 0;
  // boardCorners falls back to the board's own physical screw-hole inset when
  // the system (and so the user-editable padding field) doesn't override it.
  const boardCornerInsetMm = system.nodeInsetMm ?? model.screwInsetMm;
  for (const kind of system.markers) {
    if (kind === 'nodes') markers.push(...nodeMarkers(colB, rowB, nodeInsetMm));
    else if (kind === 'outerNodes') markers.push(...outerNodeMarkers(colB, rowB, nodeInsetMm));
    else if (kind === 'boardCorners') markers.push(...boardCornerMarkers(plan.boards, boardCornerInsetMm));
    else if (kind === 'seams') markers.push(...seamMarkers(plan.boards, c, r, colB, rowB));
  }
  return markers;
}
