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
    'Boards with an even number of holes are not symmetric, so every other one along a row ' +
    '(mirrored X) or down a column (mirrored Y) must be printed as a mirror image, or the slots ' +
    'will not line up across the seam. In Bambu Studio: select the board, right-click, Mirror, ' +
    'then X or Y. The preview marks which positions get mirrored boards.',
  fileName: (cols, rows) => `${cols} x ${rows}.stl`,
  author: { name: 'AU3D', url: 'https://makerworld.com/en/@AU3D', thanks: 'Thank you for sharing them!' },
};
