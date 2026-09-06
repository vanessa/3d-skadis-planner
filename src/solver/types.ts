import type { BoardModel } from '../models/types';
import type { Printer } from '../printers';
import type { StrategyId } from './strategies';

export interface PlanRequest {
  widthMm: number;
  heightMm: number;
  model: BoardModel;
  printer: Printer;
  strategyId?: StrategyId;
  maxGapMm?: number;
}

export interface PlacedBoard {
  /** Grid indices, 0-based, left to right and top to bottom. */
  col: number;
  row: number;
  /** Hole counts. */
  cols: number;
  rows: number;
  /** Position and size in mm, origin top-left of the space. */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  mirrorX: boolean;
  mirrorY: boolean;
}

export interface BoardGroup {
  cols: number;
  rows: number;
  mirrorX: boolean;
  mirrorY: boolean;
  widthMm: number;
  heightMm: number;
  count: number;
}

export interface Plan {
  /** Hole columns per grid column, left to right. */
  columns: number[];
  /** Hole rows per grid row, top to bottom. */
  rows: number[];
  boards: PlacedBoard[];
  coveredWidthMm: number;
  coveredHeightMm: number;
  leftoverWidthMm: number;
  leftoverHeightMm: number;
  /** Print list, largest area first, unmirrored before mirrored. */
  groups: BoardGroup[];
  strategyId: StrategyId;
}
