import { describe, it, expect } from 'vitest';
import { plan, PlanError } from './index';
import { skadisInfinity as model } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const req = (widthMm: number, heightMm: number, printer = a1) => ({ widthMm, heightMm, model, printer });

describe('plan grid', () => {
  it('tiles 1000 x 600 on an A1 with 15 boards of 9 x 9', () => {
    const p = plan(req(1000, 600));
    expect(p.columns).toEqual([9, 9, 9, 9, 9]);
    expect(p.rows).toEqual([9, 9, 9]);
    expect(p.boards).toHaveLength(15);
    expect(p.coveredWidthMm).toBe(1000);
    expect(p.coveredHeightMm).toBe(600);
    expect(p.leftoverWidthMm).toBe(0);
    expect(p.leftoverHeightMm).toBe(0);
  });
  it('board count equals ceil(w / max) * ceil(h / max)', () => {
    const p = plan(req(1015, 725));
    expect(p.boards).toHaveLength(Math.ceil(1000 / 240) * Math.ceil(720 / 240));
    expect(p.leftoverWidthMm).toBe(15);
    expect(p.leftoverHeightMm).toBe(5);
  });
  it('places boards left to right, top to bottom in mm', () => {
    const p = plan(req(400, 200));
    const first = p.boards.find((b) => b.col === 0 && b.row === 0)!;
    const second = p.boards.find((b) => b.col === 1 && b.row === 0)!;
    expect(first.xMm).toBe(0);
    expect(first.yMm).toBe(0);
    expect(second.xMm).toBe(first.widthMm);
    expect(first.widthMm + second.widthMm).toBe(400);
  });
});

describe('plan mirroring', () => {
  it('alternates mirror X along a line of even boards', () => {
    // 720 mm on an A1 mini: 36 units, max 9 units (8 holes), 4 boards of 9 units = 8 holes each.
    const p = plan(req(720, 180, mini));
    expect(p.columns).toEqual([8, 8, 8, 8]);
    expect(p.boards.map((b) => b.mirrorX)).toEqual([false, true, false, true]);
    expect(p.boards.every((b) => b.mirrorY === false)).toBe(true);
  });
  it('alternates mirror Y down a column of even boards', () => {
    const p = plan(req(180, 720, mini));
    expect(p.rows).toEqual([8, 8, 8, 8]);
    expect(p.boards.map((b) => b.mirrorY)).toEqual([false, true, false, true]);
  });
  it('carries the flag across odd boards in a mixed line', () => {
    // 260 mm on A1 -> columns [9, 2]. 9 is odd (no mirror), 2 is even and first in the flag sequence.
    const p = plan(req(260, 80));
    expect(p.columns).toEqual([9, 2]);
    expect(p.boards.map((b) => b.mirrorX)).toEqual([false, false]);
  });
  it('never mirrors symmetric boards', () => {
    const p = plan(req(1000, 600));
    expect(p.boards.every((b) => !b.mirrorX && !b.mirrorY)).toBe(true);
  });
});

describe('plan groups', () => {
  it('groups identical boards and splits mirrored variants', () => {
    const p = plan(req(720, 360, mini));
    // 4 columns of 8 holes (alternating mirror X), 2 rows of 8 holes (second row mirror Y).
    expect(p.groups).toEqual([
      { cols: 8, rows: 8, mirrorX: false, mirrorY: false, widthMm: 180, heightMm: 180, count: 2 },
      { cols: 8, rows: 8, mirrorX: true, mirrorY: false, widthMm: 180, heightMm: 180, count: 2 },
      { cols: 8, rows: 8, mirrorX: false, mirrorY: true, widthMm: 180, heightMm: 180, count: 2 },
      { cols: 8, rows: 8, mirrorX: true, mirrorY: true, widthMm: 180, heightMm: 180, count: 2 },
    ]);
  });
  it('sorts groups by area descending', () => {
    const p = plan(req(260, 260));
    expect(p.groups[0]).toMatchObject({ cols: 9, rows: 9, count: 1 });
    expect(p.groups.at(-1)).toMatchObject({ cols: 2, rows: 2, count: 1 });
    expect(p.groups.reduce((n, g) => n + g.count, 0)).toBe(4);
  });
});

describe('plan errors', () => {
  it('propagates PlanError for a too-small space', () => {
    expect(() => plan(req(50, 600))).toThrow(PlanError);
  });
});
