import { describe, it, expect } from 'vitest';
import { splitAxis } from './axis';
import { PlanError } from './errors';
import { skadisInfinity as model } from '../models/skadisInfinity';
import type { BoardModel } from '../models/types';

const A1 = 256;
const A1_MINI = 180;
const H2D_W = 350;

describe('splitAxis bed cap', () => {
  it('caps at 11 holes (240 mm) on a 256 mm bed', () => {
    expect(splitAxis(240, A1, model)).toEqual({ holes: [11], leftoverMm: 0 });
  });
  it('caps at 8 holes (180 mm) on a 180 mm bed', () => {
    expect(splitAxis(180, A1_MINI, model)).toEqual({ holes: [8], leftoverMm: 0 });
  });
  it('caps at the model max of 15 holes on a 350 mm bed', () => {
    expect(splitAxis(320, H2D_W, model)).toEqual({ holes: [15], leftoverMm: 0 });
  });
});

describe('splitAxis board count', () => {
  it('uses ceil(length / max) boards', () => {
    expect(splitAxis(1000, A1, model).holes).toHaveLength(5);
    expect(splitAxis(480, A1, model).holes).toHaveLength(2);
    expect(splitAxis(500, A1, model).holes).toHaveLength(3);
  });
  it('reports leftover below one pitch', () => {
    expect(splitAxis(1015, A1, model).leftoverMm).toBe(15);
    expect(splitAxis(1000, A1, model).leftoverMm).toBe(0);
  });
});

describe('splitAxis tie-breaks', () => {
  it('prefers symmetric (odd) boards and a single size: 1000 mm on A1 -> five 9-hole boards', () => {
    expect(splitAxis(1000, A1, model).holes).toEqual([9, 9, 9, 9, 9]);
  });
  it('prefers fewer distinct sizes when odd counts are equal', () => {
    // 600 mm on A1: 3 boards, 30 units. [10,10,10] units = 9 holes each.
    expect(splitAxis(600, A1, model).holes).toEqual([9, 9, 9]);
  });
  it('returns holes sorted descending with the fewest even boards possible', () => {
    // 500 mm on A1: 25 units, 3 boards. 25 is odd so three odd-hole (even-unit)
    // boards are impossible; one even board is unavoidable. Among the one-even
    // candidates with two distinct sizes, larger-first picks units [10, 10, 5].
    expect(splitAxis(500, A1, model).holes).toEqual([9, 9, 4]);
  });
  it('falls back to even boards when odd cannot fill: 260 mm on A1', () => {
    // 13 units, 2 boards. Options: [10,3]->9,2 holes; [8,5]->7,4; [7,6]->6,5; [9,4]->8,3; [11,2] invalid.
    // Best: one even hole count is unavoidable; fewest even = 1, then fewest distinct, then larger first.
    expect(splitAxis(260, A1, model).holes).toEqual([9, 2]);
  });
});

describe('splitAxis errors', () => {
  it('throws too-small when the space is under the smallest board', () => {
    expect(() => splitAxis(59, A1, model)).toThrow(PlanError);
    try {
      splitAxis(59, A1, model);
    } catch (e) {
      expect((e as PlanError).code).toBe('too-small');
    }
  });
  it('throws bed-too-small when the bed cannot fit the smallest board', () => {
    try {
      splitAxis(1000, 59, model);
      throw new Error('did not throw');
    } catch (e) {
      expect((e as PlanError).code).toBe('bed-too-small');
    }
  });
  it('drops a board when an exact cover is impossible', () => {
    // A model with only one size (3 holes = 4 units) on a 100 mm space: 5 units.
    const rigid: BoardModel = { ...model, minHoles: 3, maxHoles: 3 };
    expect(splitAxis(100, A1, rigid)).toEqual({ holes: [3], leftoverMm: 20 });
  });
});
