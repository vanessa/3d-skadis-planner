import { describe, it, expect } from 'vitest';
import { instancesFor } from './placement';
import { boardGeometryKey } from './geometry';
import { plan } from '../solver';
import { skadisInfinity as model } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });

describe('instancesFor', () => {
  it('groups the A1-mini 720 x 360 plan into four mirror variants of two boards each', () => {
    const groups = instancesFor(plan({ widthMm: 720, heightMm: 360, model, printer: mini }), model);
    expect(groups).toHaveLength(4);
    for (const g of groups) {
      expect(g.positions).toHaveLength(2);
      expect(g.boards).toHaveLength(2);
      expect(g.key).toBe(boardGeometryKey(g.cols, g.rows, g.mirrorX, g.mirrorY, model.id));
      expect([g.widthMm, g.heightMm]).toEqual([180, 180]);
    }
    const ys = new Set(groups.flatMap((g) => g.positions.map((p) => p[1])));
    const xs = new Set(groups.flatMap((g) => g.positions.map((p) => p[0])));
    expect([...ys].sort((a, b) => a - b)).toEqual([-360, -180]);
    expect([...xs].sort((a, b) => a - b)).toEqual([0, 180, 360, 540]);
    expect(groups.every((g) => g.positions.every((p) => p[2] === 0))).toBe(true);
  });

  it('maps top-down solver coordinates to y-up scene coordinates', () => {
    const [group] = instancesFor(plan({ widthMm: 1000, heightMm: 600, model, printer: a1 }), model);
    expect(group.positions).toHaveLength(15);
    expect(group.positions[0]).toEqual([0, -200, 0]);   // first board: top-left, bottom edge at -200
    expect(group.positions[5]).toEqual([0, -400, 0]);   // second row
    expect(group.positions[14]).toEqual([800, -600, 0]); // last board: bottom-right
    expect(group.boards[14]).toMatchObject({ col: 4, row: 2 });
  });
});
