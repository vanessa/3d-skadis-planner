import type { BoardModel } from './types';

const PITCH_MM = 20;

export const skadisInfinity: BoardModel = {
  id: 'skadis-infinity',
  name: 'IKEA Skadis Infinity',
  url: 'https://makerworld.com/en/models/1309689-ikea-skadis-infinity',
  pitchMm: PITCH_MM,
  minHoles: 2,
  maxHoles: 15,
  sizeMm: (holes) => PITCH_MM * (holes + 1),
  needsMirrorX: (cols) => cols % 2 === 0,
  needsMirrorY: (rows) => rows % 2 === 0,
  mirrorNote:
    'Boards with an even hole count are not symmetric. In Bambu Studio, right-click the board, ' +
    'choose Mirror, and pick the axis listed. Lines mixing odd and even boards use the same ' +
    'alternating rule but have not been checked on a physical print.',
  pattern: {
    thicknessMm: 5,
    slotWidthMm: 5,
    slotHeightMm: 15,
    isHole: (col, row) => (col + row) % 2 === 1,
    screwHoleRadiusMm: 1.5,
    screwInsetMm: 10,
  },
};
