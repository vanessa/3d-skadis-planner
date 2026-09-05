import { splitAxis } from './axis';
import type { BoardGroup, PlacedBoard, Plan, PlanRequest } from './types';

export function plan(req: PlanRequest): Plan {
  const { model, printer } = req;
  const x = splitAxis(req.widthMm, printer.bedWidthMm, model);
  const y = splitAxis(req.heightMm, printer.bedDepthMm, model);

  const colWidths = x.holes.map((h) => model.sizeMm(h));
  const rowHeights = y.holes.map((h) => model.sizeMm(h));
  const colX = prefixSums(colWidths);
  const rowY = prefixSums(rowHeights);
  const mirrorXByCol = carryFlags(x.holes, (h) => model.needsMirrorX(h));
  const mirrorYByRow = carryFlags(y.holes, (h) => model.needsMirrorY(h));

  const boards: PlacedBoard[] = [];
  for (let row = 0; row < y.holes.length; row++) {
    for (let col = 0; col < x.holes.length; col++) {
      boards.push({
        col,
        row,
        cols: x.holes[col],
        rows: y.holes[row],
        xMm: colX[col],
        yMm: rowY[row],
        widthMm: colWidths[col],
        heightMm: rowHeights[row],
        mirrorX: mirrorXByCol[col],
        mirrorY: mirrorYByRow[row],
      });
    }
  }

  return {
    columns: x.holes,
    rows: y.holes,
    boards,
    coveredWidthMm: req.widthMm - x.leftoverMm,
    coveredHeightMm: req.heightMm - y.leftoverMm,
    leftoverWidthMm: x.leftoverMm,
    leftoverHeightMm: y.leftoverMm,
    groups: groupBoards(boards),
  };
}

/** [0, a, a+b, ...] without the final total. */
function prefixSums(values: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of values) {
    out.push(acc);
    acc += v;
  }
  return out;
}

/**
 * Walk a line of boards. Boards that need mirroring take the current flag
 * and toggle it; boards that do not need it leave the flag alone.
 * A line of identical even boards becomes false, true, false, true...
 */
function carryFlags(holes: number[], needsMirror: (h: number) => boolean): boolean[] {
  let flag = false;
  return holes.map((h) => {
    if (!needsMirror(h)) return false;
    const mirrored = flag;
    flag = !flag;
    return mirrored;
  });
}

function groupBoards(boards: PlacedBoard[]): BoardGroup[] {
  const groups = new Map<string, BoardGroup>();
  for (const b of boards) {
    const key = `${b.cols}x${b.rows}:${b.mirrorX}:${b.mirrorY}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        cols: b.cols,
        rows: b.rows,
        mirrorX: b.mirrorX,
        mirrorY: b.mirrorY,
        widthMm: b.widthMm,
        heightMm: b.heightMm,
        count: 1,
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const area = b.widthMm * b.heightMm - a.widthMm * a.heightMm;
    if (area !== 0) return area;
    const mirrorRank = (g: BoardGroup) => (g.mirrorY ? 2 : 0) + (g.mirrorX ? 1 : 0);
    return mirrorRank(a) - mirrorRank(b);
  });
}
