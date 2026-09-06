import type { MountSystem } from './types';

export const MOUNT_SYSTEMS: MountSystem[] = [
  {
    id: 'wall-mounts',
    name: 'Wall mounts (AU3D)',
    url: 'https://makerworld.com/en/models/861073',
    description:
      'One printed mount under every point where board corners meet, one wall hole per mount.',
    items: [
      { name: 'Quad wall mount', per: { junction: 1 } },
      { name: 'Double wall mount', per: { edgeNode: 1 } },
      {
        name: 'Single wall mount',
        per: { outerCorner: 1 },
        note: 'Separate model: makerworld.com/en/models/420877',
      },
      { name: 'M4 x 40-60 wall screw', per: { junction: 1, edgeNode: 1, outerCorner: 1 } },
      { name: 'M4 x 20 board screw', per: { board: 4 } },
    ],
  },
  {
    id: 'spacers',
    name: 'Screw spacers (AU3D)',
    url: 'https://makerworld.com/en/models/418874',
    description: 'A spacer and a screw at every board corner, straight into the wall.',
    items: [
      { name: 'Screw spacer (10, 15 or 20 mm)', per: { board: 4 } },
      { name: 'M4 wall screw (30 mm or longer)', per: { board: 4 } },
      { name: 'Wall plug', per: { board: 4 }, note: 'If the wall needs them' },
    ],
  },
  {
    id: 'threaded-connectors',
    name: 'Threaded connectors (Printables)',
    url: 'https://www.printables.com/model/1371785',
    description:
      'Boards screwed to each other with printed threaded connectors along every seam, plus wall ' +
      'fixing around the outside. Counts are assumed; check the model page.',
    assumed: true,
    items: [
      { name: 'Threaded connector', per: { seam: 1 } },
      {
        name: 'Connector screw',
        per: { seam: 2 },
        note: 'Assumed two per connector; check the model page',
      },
      {
        name: 'Spacer and M4 wall screw',
        per: { outerCorner: 1, edgeNode: 1 },
        note: 'The outside of the assembly still needs fixing to the wall',
      },
    ],
  },
];
