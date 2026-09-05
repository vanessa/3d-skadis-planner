import type { BoardModel } from '../models/types';

export interface Slot {
  cxMm: number;
  cyMm: number;
  widthMm: number;
  heightMm: number;
}

export interface ScrewHole {
  cxMm: number;
  cyMm: number;
  radiusMm: number;
}

/** Everything needed to cut one board: outer size plus every hole, in mm, origin bottom-left. */
export interface BoardOutline {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  slots: Slot[];
  screwHoles: ScrewHole[];
}

/**
 * Mirroring is applied to the pattern lookup, not to the geometry, so a
 * mirrored board is a normal board with a flipped hole layout.
 */
export function boardOutline(
  cols: number,
  rows: number,
  mirrorX: boolean,
  mirrorY: boolean,
  model: BoardModel,
): BoardOutline {
  const { pitchMm, pattern } = model;
  const widthMm = model.sizeMm(cols);
  const heightMm = model.sizeMm(rows);

  const slots: Slot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const patternCol = mirrorX ? cols - 1 - col : col;
      const patternRow = mirrorY ? rows - 1 - row : row;
      if (!pattern.isHole(patternCol, patternRow)) continue;
      slots.push({
        cxMm: pitchMm * (col + 1),
        cyMm: pitchMm * (row + 1),
        widthMm: pattern.slotWidthMm,
        heightMm: pattern.slotHeightMm,
      });
    }
  }

  const inset = pattern.screwInsetMm;
  const corners: [number, number][] = [
    [inset, inset],
    [widthMm - inset, inset],
    [inset, heightMm - inset],
    [widthMm - inset, heightMm - inset],
  ];
  const screwHoles = corners.map(([cxMm, cyMm]) => ({ cxMm, cyMm, radiusMm: pattern.screwHoleRadiusMm }));

  return { widthMm, heightMm, thicknessMm: pattern.thicknessMm, slots, screwHoles };
}
