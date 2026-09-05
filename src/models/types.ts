/**
 * A printable pegboard model. One file per model in this folder.
 * The solver assumes sizeMm(holes) === pitchMm * (holes + 1) when it
 * enumerates board sizes, so keep that linear form.
 */
export interface BoardModel {
  id: string;
  name: string;
  /** Link to the model page, shown in the UI. */
  url: string;
  /** Hole pitch in mm. Board sizes step by this amount. */
  pitchMm: number;
  minHoles: number;
  maxHoles: number;
  /** Outer board size along one axis for the given hole count. */
  sizeMm(holes: number): number;
  /** True when the hole pattern is symmetric and the board tiles without mirroring. */
  isSymmetric(cols: number, rows: number): boolean;
  /** True when boards of this column count must alternate mirroring along X. */
  needsMirrorX(cols: number): boolean;
  /** True when boards of this row count must alternate mirroring along Y. */
  needsMirrorY(rows: number): boolean;
  /** One paragraph shown under the print list. */
  mirrorNote: string;
}
