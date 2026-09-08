import { describe, it, expect } from 'vitest';
import { countNodes, hardwareList } from './hardware';
import { getMountSystem } from './index';
import { MOUNT_SYSTEMS } from './systems';
import { seamSystem } from './testFixtures';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const byName = (rows: { name: string; qty: number }[]) => Object.fromEntries(rows.map((r) => [r.name, r.qty]));

describe('countNodes', () => {
  it('counts a 5 x 3 grid', () => {
    expect(countNodes(5, 3)).toEqual({ board: 15, junction: 8, edgeNode: 12, outerCorner: 4, seam: 22 });
  });
  it('counts single boards and single lines', () => {
    expect(countNodes(1, 1)).toEqual({ board: 1, junction: 0, edgeNode: 0, outerCorner: 4, seam: 0 });
    expect(countNodes(4, 1)).toEqual({ board: 4, junction: 0, edgeNode: 6, outerCorner: 4, seam: 3 });
    expect(countNodes(1, 4)).toEqual({ board: 4, junction: 0, edgeNode: 6, outerCorner: 4, seam: 3 });
  });
});

describe('hardwareList', () => {
  const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
  it('counts wall mounts for the default plan', () => {
    expect(byName(hardwareList(p, getMountSystem('wall-mounts')))).toEqual({
      'Quad wall mount': 8, 'Double wall mount': 12, 'Single wall mount': 4, 'M4 x 40-60 wall screw': 24, 'M4 x 20 board screw': 60,
    });
  });
  it('counts spacers', () => {
    expect(byName(hardwareList(p, getMountSystem('spacers')))).toEqual({
      'Screw spacer': 60, 'M4 wall screw (30 mm or longer)': 60, 'Wall plug': 60,
    });
  });
  it('counts a seam-based system', () => {
    expect(byName(hardwareList(p, seamSystem))).toEqual({
      Connector: 22, 'Wall spacer': 16,
    });
  });
  it('omits zero rows and passes the link through', () => {
    const one = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    const rows = hardwareList(one, getMountSystem('wall-mounts'));
    expect(rows.map((r) => r.name)).toEqual(['Single wall mount', 'M4 x 40-60 wall screw', 'M4 x 20 board screw']);
    const mini2 = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    expect(byName(hardwareList(mini2, getMountSystem('wall-mounts')))).toEqual({
      'Double wall mount': 2, 'Single wall mount': 4, 'M4 x 40-60 wall screw': 6, 'M4 x 20 board screw': 8,
    });
    expect(rows.find((r) => r.name === 'Single wall mount')?.link).toBe(
      'https://makerworld.com/en/models/420877',
    );
    expect(hardwareList(one, getMountSystem('spacers')).find((r) => r.name === 'Wall plug')?.note).toBeUndefined();
  });
});

describe('source', () => {
  const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });

  it('is carried through by hardwareList', () => {
    const rows = hardwareList(p, getMountSystem('wall-mounts'));
    expect(rows.find((r) => r.name === 'Quad wall mount')?.source).toBe('print');
    expect(rows.find((r) => r.name === 'M4 x 20 board screw')?.source).toBe('buy');
  });

  it('orders printed items before bought ones for every system', () => {
    for (const system of MOUNT_SYSTEMS) {
      const sources = hardwareList(p, system).map((r) => r.source);
      const firstBuy = sources.indexOf('buy');
      const lastPrint = sources.lastIndexOf('print');
      if (firstBuy !== -1 && lastPrint !== -1) {
        expect(lastPrint).toBeLessThan(firstBuy);
      }
    }
  });
});
