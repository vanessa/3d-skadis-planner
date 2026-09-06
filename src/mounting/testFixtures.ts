import type { MountSystem } from './types';

/**
 * A seam/outer-node based fixture system used only in tests: `seams`/`outerNodes`
 * markers are implemented but no shipped system uses them.
 */
export const seamSystem: MountSystem = {
  id: 'test-seams',
  name: 'Seams',
  url: 'https://example.com',
  description: '',
  markers: ['seams', 'outerNodes'],
  items: [
    { name: 'Connector', per: { seam: 1 }, source: 'print' },
    { name: 'Wall spacer', per: { outerCorner: 1, edgeNode: 1 }, source: 'print' },
  ],
};
