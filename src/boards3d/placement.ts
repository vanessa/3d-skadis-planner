import type { Plan, PlacedBoard } from '../solver';
import type { BoardModel } from '../models/types';
import { boardGeometryKey } from './geometry';

export { MAX_3D_BOARDS } from './limits';

/** Boards that share one geometry, with where each copy goes. */
export interface InstanceGroup {
  key: string;
  cols: number;
  rows: number;
  mirrorX: boolean;
  mirrorY: boolean;
  widthMm: number;
  heightMm: number;
  /** Board bottom-left corner in scene units (mm), one per board. */
  positions: [number, number, number][];
  /** The solver boards, in the same order as `positions`. */
  boards: PlacedBoard[];
}

/**
 * Scene coordinates: the wall's top-left is the origin, x grows right and
 * y grows up. The solver's yMm grows downward, so a board's bottom edge is
 * at -(yMm + heightMm).
 */
export function instancesFor(plan: Plan, model: BoardModel): InstanceGroup[] {
  const groups = new Map<string, InstanceGroup>();
  for (const b of plan.boards) {
    const key = boardGeometryKey(b.cols, b.rows, b.mirrorX, b.mirrorY, model.id);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        cols: b.cols,
        rows: b.rows,
        mirrorX: b.mirrorX,
        mirrorY: b.mirrorY,
        widthMm: b.widthMm,
        heightMm: b.heightMm,
        positions: [],
        boards: [],
      };
      groups.set(key, group);
    }
    group.positions.push([b.xMm, -(b.yMm + b.heightMm), 0]);
    group.boards.push(b);
  }
  return [...groups.values()];
}
