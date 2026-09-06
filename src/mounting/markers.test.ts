import { describe, it, expect } from 'vitest';
import { hardwareMarkers } from './markers';
import { getMountSystem } from './index';
import type { HardwareMarker } from './types';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });

const byRole = (markers: HardwareMarker[]) => {
  const counts: Record<string, number> = {};
  for (const m of markers) {
    const key = m.role ?? 'none';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

describe('hardwareMarkers', () => {
  const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });

  it('places a node marker at every lattice point for wall mounts, with the right role counts', () => {
    const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
    expect(markers).toHaveLength(24);
    expect(byRole(markers)).toEqual({ junction: 8, edgeNode: 12, outerCorner: 4 });
    expect(markers).toContainEqual({ x: 0, y: 0, kind: 'nodes', role: 'outerCorner' });
    expect(markers).toContainEqual({ x: 200, y: 0, kind: 'nodes', role: 'edgeNode' });
    expect(markers).toContainEqual({ x: 200, y: 200, kind: 'nodes', role: 'junction' });
    expect(markers).toContainEqual({ x: 1000, y: 600, kind: 'nodes', role: 'outerCorner' });
  });

  it('places a corner marker inset from every board corner for spacers', () => {
    const markers = hardwareMarkers(p, getMountSystem('spacers'), skadisInfinity);
    expect(markers).toHaveLength(60);
    expect(markers.slice(0, 4)).toEqual([
      { x: 10, y: 10, kind: 'boardCorners' },
      { x: 190, y: 10, kind: 'boardCorners' },
      { x: 10, y: 190, kind: 'boardCorners' },
      { x: 190, y: 190, kind: 'boardCorners' },
    ]);
  });

  it('places seam midpoints and outer nodes for threaded connectors', () => {
    const markers = hardwareMarkers(p, getMountSystem('threaded-connectors'), skadisInfinity);
    const seams = markers.filter((m) => m.kind === 'seams');
    const outer = markers.filter((m) => m.kind === 'outerNodes');
    expect(seams).toHaveLength(22);
    expect(outer).toHaveLength(16);
    expect(seams).toContainEqual({ x: 200, y: 100, kind: 'seams', orientation: 'vertical' });
    expect(outer.every((m) => m.role !== 'junction')).toBe(true);
  });

  it('handles a single board with no seams', () => {
    const one = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    expect(hardwareMarkers(one, getMountSystem('wall-mounts'), skadisInfinity)).toHaveLength(4);
    expect(
      hardwareMarkers(one, getMountSystem('threaded-connectors'), skadisInfinity).filter((m) => m.kind === 'seams'),
    ).toHaveLength(0);
  });
});
