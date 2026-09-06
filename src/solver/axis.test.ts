import { describe, it, expect } from 'vitest';
import { splitAxis } from './axis';
import { PlanError } from './errors';
import { getStrategy } from './strategies';
import { skadisInfinity as model } from '../models/skadisInfinity';
import type { BoardModel } from '../models/types';

const A1 = 256;
const A1_MINI = 180;
const H2D_W = 350;

describe('splitAxis bed cap', () => {
  it('caps at 11 holes (240 mm) on a 256 mm bed', () => {
    expect(splitAxis(240, A1, model, 'x')).toEqual({ holes: [11], leftoverMm: 0 });
  });
  it('caps at 8 holes (180 mm) on a 180 mm bed', () => {
    expect(splitAxis(180, A1_MINI, model, 'x')).toEqual({ holes: [8], leftoverMm: 0 });
  });
  it('caps at the model max of 15 holes on a 350 mm bed', () => {
    expect(splitAxis(320, H2D_W, model, 'x')).toEqual({ holes: [15], leftoverMm: 0 });
  });
});

describe('splitAxis board count', () => {
  it('uses ceil(length / max) boards', () => {
    expect(splitAxis(1000, A1, model, 'x').holes).toHaveLength(5);
    expect(splitAxis(480, A1, model, 'x').holes).toHaveLength(2);
    expect(splitAxis(500, A1, model, 'x').holes).toHaveLength(3);
  });
  it('reports leftover below one pitch', () => {
    expect(splitAxis(1015, A1, model, 'x').leftoverMm).toBe(15);
    expect(splitAxis(1000, A1, model, 'x').leftoverMm).toBe(0);
  });
});

describe('splitAxis tie-breaks', () => {
  it('prefers symmetric (odd) boards and a single size: 1000 mm on A1 -> five 9-hole boards', () => {
    expect(splitAxis(1000, A1, model, 'x').holes).toEqual([9, 9, 9, 9, 9]);
  });
  it('prefers fewer distinct sizes when odd counts are equal', () => {
    // 600 mm on A1: 3 boards, 30 units. [10,10,10] units = 9 holes each.
    expect(splitAxis(600, A1, model, 'x').holes).toEqual([9, 9, 9]);
  });
  it('returns holes sorted descending with the fewest mirrored boards possible, then balanced', () => {
    // 500 mm on A1: 25 units, 3 boards. 25 is odd so three mirror-free boards
    // (odd units) are impossible; one mirrored board is unavoidable. Among the
    // one-mirror candidates, balancing the sizes (least shortfall below the
    // largest board) picks units [9, 8, 8] over lopsided options like [10,10,5].
    expect(splitAxis(500, A1, model, 'x').holes).toEqual([8, 7, 7]);
  });
  it('balances a remainder instead of leaving a sliver: 260 mm on A1', () => {
    // 13 units, 2 boards. Every split has exactly one mirrored board (13 is
    // odd), so the tie-break falls to balance: [7,6] (shortfall 1) beats a
    // lopsided split like [10,3] (shortfall 7).
    expect(splitAxis(260, A1, model, 'x').holes).toEqual([6, 5]);
  });
  it('prefers 200+200+140 over 240+240+60 for 540 mm on A1', () => {
    expect(splitAxis(540, A1, model, 'x').holes).toEqual([9, 9, 6]);
  });
  it('prefers symmetric boards over a single repeated size: 440 mm on A1', () => {
    // This pins tie-break 1 (fewest mirrored boards) above tie-break 2
    // (fewest distinct sizes): distinct-first would give [10, 10].
    expect(splitAxis(440, A1, model, 'x').holes).toEqual([11, 9]);
  });
  it('balances three boards for 660 mm on A1', () => {
    expect(splitAxis(660, A1, model, 'x').holes).toEqual([11, 11, 8]);
  });
});

describe('splitAxis errors', () => {
  it('throws too-small when the space is under the smallest board', () => {
    expect(() => splitAxis(59, A1, model, 'x')).toThrow(PlanError);
    try {
      splitAxis(59, A1, model, 'x');
    } catch (e) {
      expect((e as PlanError).code).toBe('too-small');
    }
  });
  it('throws bed-too-small when the bed cannot fit the smallest board', () => {
    try {
      splitAxis(1000, 59, model, 'x');
      throw new Error('did not throw');
    } catch (e) {
      expect((e as PlanError).code).toBe('bed-too-small');
    }
  });
  it('drops a board when an exact cover is impossible', () => {
    // A model with only one size (3 holes = 4 units) on a 100 mm space: 5 units.
    const rigid: BoardModel = { ...model, minHoles: 3, maxHoles: 3 };
    expect(splitAxis(100, A1, rigid, 'x')).toEqual({ holes: [3], leftoverMm: 20 });
  });
});

describe('splitAxis with strategies', () => {
  it('uniform leaves a strip uncovered', () => {
    expect(splitAxis(820, A1, model, 'x', getStrategy('uniform'))).toEqual({ holes: [9, 9, 9, 9], leftoverMm: 20 });
  });
  it('allow-gap honours the mm gap', () => {
    expect(splitAxis(1000, A1, model, 'y', getStrategy('allow-gap'), 40)).toEqual({ holes: [11, 11, 11, 11], leftoverMm: 40 });
    expect(splitAxis(1000, A1, model, 'y', getStrategy('allow-gap'), 0).holes).toEqual([9, 9, 9, 9, 9]);
  });
  it('allow-gap caps the gap at one board width below the largest board', () => {
    // A huge requested gap must not collapse 500 mm on A1 down to a single
    // board; the cap keeps it at two 240 mm boards.
    expect(splitAxis(500, A1, model, 'x', getStrategy('allow-gap'), 1000)).toEqual({
      holes: [11, 11],
      leftoverMm: 20,
    });
  });
  it('no-mirror falls back to balanced when it has no candidate', () => {
    expect(splitAxis(60, A1, model, 'x', getStrategy('no-mirror'))).toEqual({ holes: [2], leftoverMm: 0 });
  });
  it('defaults to balanced', () => {
    expect(splitAxis(820, A1, model, 'x').holes).toEqual([10, 9, 9, 9]);
  });
});
