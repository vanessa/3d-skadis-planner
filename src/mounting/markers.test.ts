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
    // Outer corners are inset 9mm on both axes (system.nodeInsetMm) — that mount
    // uses its lone board's own screw hole. Edge nodes inset on only the axis
    // with no interior neighbor (here, y — the top edge). Junctions need no
    // inset: the mount there sits at the shared meeting point of 4 boards.
    expect(markers).toContainEqual({ x: 9, y: 9, kind: 'nodes', role: 'outerCorner' });
    expect(markers).toContainEqual({ x: 200, y: 9, kind: 'nodes', role: 'edgeNode' });
    expect(markers).toContainEqual({ x: 200, y: 200, kind: 'nodes', role: 'junction' });
    expect(markers).toContainEqual({ x: 991, y: 591, kind: 'nodes', role: 'outerCorner' });
  });

  it('insets outer corners on both axes and edge nodes on only the axis with no interior neighbor', () => {
    const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
    const outerCorners = markers.filter((m) => m.role === 'outerCorner');
    expect(outerCorners).toEqual(
      expect.arrayContaining([
        { x: 9, y: 9, kind: 'nodes', role: 'outerCorner' }, // top-left: +x, +y
        { x: 991, y: 9, kind: 'nodes', role: 'outerCorner' }, // top-right: -x, +y
        { x: 9, y: 591, kind: 'nodes', role: 'outerCorner' }, // bottom-left: +x, -y
        { x: 991, y: 591, kind: 'nodes', role: 'outerCorner' }, // bottom-right: -x, -y
      ]),
    );
    expect(outerCorners).toHaveLength(4);

    const edgeNodes = markers.filter((m) => m.role === 'edgeNode');
    expect(edgeNodes).toHaveLength(12);
    // Top edge (y=0 -> +9) and bottom edge (y=600 -> 591): x stays on the lattice.
    for (const x of [200, 400, 600, 800]) {
      expect(edgeNodes).toContainEqual({ x, y: 9, kind: 'nodes', role: 'edgeNode' });
      expect(edgeNodes).toContainEqual({ x, y: 591, kind: 'nodes', role: 'edgeNode' });
    }
    // Left edge (x=0 -> +9) and right edge (x=1000 -> 991): y stays on the lattice.
    for (const y of [200, 400]) {
      expect(edgeNodes).toContainEqual({ x: 9, y, kind: 'nodes', role: 'edgeNode' });
      expect(edgeNodes).toContainEqual({ x: 991, y, kind: 'nodes', role: 'edgeNode' });
    }

    // Junctions are exactly on the lattice, on both axes.
    const junctions = markers.filter((m) => m.role === 'junction');
    for (const m of junctions) {
      expect([200, 400, 600, 800]).toContain(m.x);
      expect([200, 400]).toContain(m.y);
    }
  });

  it('defaults the node inset to 0 for a system that does not set nodeInsetMm', () => {
    const noInsetSystem = { ...getMountSystem('wall-mounts'), nodeInsetMm: undefined };
    const markers = hardwareMarkers(p, noInsetSystem, skadisInfinity);
    expect(markers).toContainEqual({ x: 0, y: 0, kind: 'nodes', role: 'outerCorner' });
    expect(markers).toContainEqual({ x: 1000, y: 600, kind: 'nodes', role: 'outerCorner' });
    expect(markers).toContainEqual({ x: 200, y: 0, kind: 'nodes', role: 'edgeNode' });
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
