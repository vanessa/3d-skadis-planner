import { describe, it, expect } from 'vitest';
import { STRATEGIES, DEFAULT_STRATEGY_ID, getStrategy, bestPartition, type SearchContext } from './strategies';

const even = (holes: number) => holes % 2 === 0;
const a1 = (avail: number, gapUnits = 0): SearchContext => ({ avail, minU: 3, maxU: 12, needsMirror: even, gapUnits });

describe('registry', () => {
  it('lists the five strategies in order with balanced as default', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual(['balanced', 'largest-first', 'uniform', 'no-mirror', 'allow-gap']);
    expect(DEFAULT_STRATEGY_ID).toBe('balanced');
    expect(getStrategy('uniform').name).toBe('Same size only');
    expect(() => getStrategy('nope')).toThrow(/unknown strategy/i);
  });
});

describe('bestPartition', () => {
  it('enumerates exact covers with the fewest boards', () => {
    // 50 = 12+12+12+11+3 (a 2-unit board would be below minU); larger-first picks it.
    const r = bestPartition(a1(50), { tol: 0, score: (u) => u.map((x) => -x) });
    expect(r).toEqual([12, 12, 12, 11, 3]);
  });
  it('allows a gap and uses fewer boards', () => {
    expect(bestPartition(a1(50), { tol: 2, score: () => [0] })).toEqual([12, 12, 12, 12]);
  });
  it('returns null when nothing is accepted within extraK', () => {
    expect(bestPartition(a1(41), { tol: 0, accept: () => false, score: () => [0] })).toBeNull();
  });
});

describe('strategies on an A1 axis', () => {
  const run = (id: string, avail: number, gapUnits = 0) => getStrategy(id).search(a1(avail, gapUnits))?.map((u) => u - 1);
  it('balanced', () => {
    expect(run('balanced', 41)).toEqual([10, 9, 9, 9]);
    expect(run('balanced', 50)).toEqual([9, 9, 9, 9, 9]);
  });
  it('largest-first', () => {
    expect(run('largest-first', 41)).toEqual([11, 11, 11, 4]);
    expect(run('largest-first', 50)).toEqual([9, 9, 9, 9, 9]);
  });
  it('uniform', () => {
    expect(run('uniform', 41)).toEqual([9, 9, 9, 9]);
    expect(run('uniform', 50)).toEqual([9, 9, 9, 9, 9]);
    expect(run('uniform', 13)).toEqual([11]);
  });
  it('no-mirror', () => {
    expect(run('no-mirror', 41)).toEqual([9, 9, 9, 9]);
    expect(run('no-mirror', 50)).toEqual([9, 9, 9, 9, 9]);
    expect(run('no-mirror', 13)).toEqual([11]);
    // 3 units: only a 2-hole (even) board fits; no candidate.
    expect(getStrategy('no-mirror').search(a1(3))).toBeNull();
  });
  it('allow-gap', () => {
    expect(run('allow-gap', 50, 2)).toEqual([11, 11, 11, 11]);
    expect(run('allow-gap', 50, 0)).toEqual([9, 9, 9, 9, 9]);
    expect(run('allow-gap', 41, 2)).toEqual([9, 9, 9, 9]);
  });
});
