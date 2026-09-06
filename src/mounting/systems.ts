import type { MountSystem } from './types';

export const MOUNT_SYSTEMS: MountSystem[] = [
  {
    id: 'wall-mounts',
    name: 'Wall mounts (AU3D)',
    url: 'https://makerworld.com/en/models/861073',
    description: 'One printed mount wherever corners meet.',
    markers: ['nodes'],
    items: [
      { name: 'Quad wall mount', per: { junction: 1 } },
      { name: 'Double wall mount', per: { edgeNode: 1 } },
      {
        name: 'Single wall mount',
        per: { outerCorner: 1 },
        link: 'https://makerworld.com/en/models/420877',
      },
      { name: 'M4 x 40-60 wall screw', per: { junction: 1, edgeNode: 1, outerCorner: 1 } },
      { name: 'M4 x 20 board screw', per: { board: 4 } },
    ],
  },
  {
    id: 'spacers',
    name: 'Screw spacers (AU3D)',
    url: 'https://makerworld.com/en/models/418874',
    description: 'A spacer and screw at each board corner.',
    markers: ['boardCorners'],
    items: [
      { name: 'Screw spacer (10, 15 or 20 mm)', per: { board: 4 } },
      { name: 'M4 wall screw (30 mm or longer)', per: { board: 4 } },
      { name: 'Wall plug', per: { board: 4 } },
    ],
  },
  {
    id: 'threaded-connectors',
    name: 'Threaded connectors (Printables)',
    url: 'https://www.printables.com/model/1371785',
    description: 'Connectors along every seam. Counts assumed.',
    assumed: true,
    markers: ['seams', 'outerNodes'],
    items: [
      { name: 'Threaded connector', per: { seam: 1 } },
      { name: 'Connector screw', per: { seam: 2 } },
      { name: 'Wall fixing (spacer + M4 screw)', per: { outerCorner: 1, edgeNode: 1 } },
    ],
  },
];
