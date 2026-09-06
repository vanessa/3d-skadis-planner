import type { MountSystem } from './types';

export const MOUNT_SYSTEMS: MountSystem[] = [
  {
    id: 'wall-mounts',
    name: 'Wall mounts (AU3D)',
    url: 'https://makerworld.com/en/models/861073',
    description: 'One printed mount wherever corners meet.',
    markers: ['nodes'],
    items: [
      { name: 'Quad wall mount', per: { junction: 1 }, source: 'print' },
      { name: 'Double wall mount', per: { edgeNode: 1 }, source: 'print' },
      {
        name: 'Single wall mount',
        per: { outerCorner: 1 },
        source: 'print',
        link: 'https://makerworld.com/en/models/420877',
      },
      { name: 'M4 x 40-60 wall screw', per: { junction: 1, edgeNode: 1, outerCorner: 1 }, source: 'buy' },
      { name: 'M4 x 20 board screw', per: { board: 4 }, source: 'buy' },
    ],
  },
  {
    id: 'spacers',
    name: 'Screw spacers (AU3D)',
    url: 'https://makerworld.com/en/models/418874',
    description: 'A spacer and screw at each board corner.',
    markers: ['boardCorners'],
    items: [
      { name: 'Screw spacer (10, 15 or 20 mm)', per: { board: 4 }, source: 'print' },
      { name: 'M4 wall screw (30 mm or longer)', per: { board: 4 }, source: 'buy' },
      { name: 'Wall plug', per: { board: 4 }, source: 'buy' },
    ],
  },
];
