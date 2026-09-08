import { describe, it, expect } from 'vitest';
import { hardwareMarkers } from './markers';
import { getMountSystem } from './index';
import { countNodes, hardwareList } from './hardware';
import { seamSystem } from './testFixtures';
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

  it('places seam midpoints and outer nodes for a seam-based system', () => {
    const markers = hardwareMarkers(p, seamSystem, skadisInfinity);
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
      hardwareMarkers(one, seamSystem, skadisInfinity).filter((m) => m.kind === 'seams'),
    ).toHaveLength(0);
  });
});

const byName = (rows: { name: string; qty: number }[]) => Object.fromEntries(rows.map((r) => [r.name, r.qty]));

describe('hardwareMarkers cross-checks against the grid facts and the Hardware table', () => {
  const plans = [
    {
      label: '5 x 3 default plan',
      p: plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 }),
    },
    {
      label: '820 x 1000 plan (columns [10,9,9,9], rows [9x5])',
      p: plan({ widthMm: 820, heightMm: 1000, model: skadisInfinity, printer: a1 }),
    },
  ];

  for (const { label, p } of plans) {
    const nodes = countNodes(p.columns.length, p.rows.length);

    it(`matches countNodes' grid facts, per kind, for ${label}`, () => {
      const wallMarkers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
      const roles = byRole(wallMarkers);
      expect(wallMarkers).toHaveLength(nodes.junction + nodes.edgeNode + nodes.outerCorner);
      expect(roles.junction ?? 0).toBe(nodes.junction);
      expect(roles.edgeNode ?? 0).toBe(nodes.edgeNode);
      expect(roles.outerCorner ?? 0).toBe(nodes.outerCorner);

      const spacerMarkers = hardwareMarkers(p, getMountSystem('spacers'), skadisInfinity);
      expect(spacerMarkers).toHaveLength(4 * nodes.board);

      const seamMarkers = hardwareMarkers(p, seamSystem, skadisInfinity);
      expect(seamMarkers.filter((m) => m.kind === 'seams')).toHaveLength(nodes.seam);
      expect(seamMarkers.filter((m) => m.kind === 'outerNodes')).toHaveLength(nodes.edgeNode + nodes.outerCorner);
    });

    it(`matches the Hardware table's counts for ${label}`, () => {
      const wallRows = byName(hardwareList(p, getMountSystem('wall-mounts')));
      const wallRoles = byRole(hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity));
      expect(wallRows['Quad wall mount']).toBe(wallRoles.junction ?? 0);
      expect(wallRows['Double wall mount']).toBe(wallRoles.edgeNode ?? 0);
      expect(wallRows['Single wall mount']).toBe(wallRoles.outerCorner ?? 0);

      const spacerRows = byName(hardwareList(p, getMountSystem('spacers')));
      const spacerMarkers = hardwareMarkers(p, getMountSystem('spacers'), skadisInfinity);
      expect(spacerRows['Screw spacer']).toBe(spacerMarkers.length);

      const seamRows = byName(hardwareList(p, seamSystem));
      const seamMarkers = hardwareMarkers(p, seamSystem, skadisInfinity);
      expect(seamRows['Connector']).toBe(seamMarkers.filter((m) => m.kind === 'seams').length);
      expect(seamRows['Wall spacer']).toBe(
        seamMarkers.filter((m) => m.kind === 'outerNodes').length,
      );
    });
  }
});
