import type { MountSystem } from './types';

const multiMount = 'https://makerworld.com/en/models/861073';
const singleMount = 'https://makerworld.com/en/models/420877';
const spacers = 'https://makerworld.com/en/models/418874';
const au3d = { name: 'AU3D', url: 'https://makerworld.com/en/@AU3D' };

export const MOUNT_SYSTEMS: MountSystem[] = [
  {
    id: 'wall-mounts',
    name: 'Wall mounts (AU3D)',
    url: multiMount,
    author: au3d,
    profiles: { 10: `${multiMount}#profileId-1609221`, 20: `${multiMount}#profileId-811358` },
    description: 'One printed mount wherever corners meet.',
    markers: ['nodes'],
    nodeInsetMm: 9,
    items: [
      { name: 'Quad wall mount', per: { junction: 1 }, source: 'print' },
      { name: 'Double wall mount', per: { edgeNode: 1 }, source: 'print' },
      {
        name: 'Single wall mount',
        per: { outerCorner: 1 },
        source: 'print',
        link: singleMount,
        profiles: { 10: `${singleMount}#profileId-323619`, 20: `${singleMount}#profileId-323616` },
      },
      { name: 'M4 x 40-60 wall screw', per: { junction: 1, edgeNode: 1, outerCorner: 1 }, source: 'buy' },
      { name: 'M4 x 20 board screw', per: { board: 4 }, source: 'buy' },
    ],
  },
  {
    id: 'spacers',
    name: 'Screw spacers (AU3D)',
    url: spacers,
    author: au3d,
    profiles: {
      10: `${spacers}#profileId-321444`,
      15: `${spacers}#profileId-321441`,
      20: `${spacers}#profileId-321437`,
    },
    description: 'A spacer and screw at each board corner.',
    markers: ['boardCorners'],
    nodeInsetMm: 10,
    items: [
      { name: 'Screw spacer', per: { board: 4 }, source: 'print' },
      { name: 'M4 wall screw (30 mm or longer)', per: { board: 4 }, source: 'buy' },
      { name: 'Wall plug', per: { board: 4 }, source: 'buy' },
    ],
  },
];
