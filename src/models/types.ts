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
  /** Distance in mm from a board's edge to its mounting screw hole. */
  screwInsetMm: number;
  /** Outer board size along one axis for the given hole count. */
  sizeMm(holes: number): number;
  /** True when boards of this column count must alternate mirroring along X. */
  needsMirrorX(cols: number): boolean;
  /** True when boards of this row count must alternate mirroring along Y. */
  needsMirrorY(rows: number): boolean;
  /** One paragraph shown under the print list. */
  mirrorNote: string;
  /** File name in the author's download for a board with these hole counts. */
  fileName(cols: number, rows: number): string;
  /** Who designed the boards; shown in the footer, the export and the README. */
  author: { name: string; url: string; thanks: string };
}
