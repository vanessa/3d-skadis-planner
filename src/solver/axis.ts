import type { BoardModel } from '../models/types';
import { PlanError } from './errors';

export interface AxisSplit {
  /** Hole counts per board along this axis, largest first. */
  holes: number[];
  /** Space left uncovered along this axis. Always below one board pitch unless a cover was impossible. */
  leftoverMm: number;
}

/**
 * Split one axis of the space into the fewest boards that fit the bed.
 * Works in "units" of one pitch: a board with h holes is h + 1 units long.
 */
export function splitAxis(lengthMm: number, bedMm: number, model: BoardModel, axis: 'x' | 'y'): AxisSplit {
  const pitch = model.pitchMm;
  const minU = model.minHoles + 1;
  const bedHoles = Math.floor(bedMm / pitch) - 1;
  const maxU = Math.min(model.maxHoles, bedHoles) + 1;
  const smallest = model.sizeMm(model.minHoles);
  const needsMirror = axis === 'x' ? (h: number) => model.needsMirrorX(h) : (h: number) => model.needsMirrorY(h);

  if (maxU < minU) {
    throw new PlanError(
      'bed-too-small',
      `The print bed (${bedMm} mm) cannot fit the smallest board (${smallest} mm).`,
    );
  }

  const avail = Math.floor(lengthMm / pitch);
  if (avail < minU) {
    throw new PlanError(
      'too-small',
      `The space (${lengthMm} mm) is smaller than the smallest board (${smallest} mm).`,
    );
  }

  const k = Math.ceil(avail / maxU);
  const units =
    k * minU > avail ? Array<number>(k - 1).fill(maxU) : bestSplit(avail, k, minU, maxU, needsMirror);

  const used = units.reduce((sum, u) => sum + u, 0);
  return { holes: units.map((u) => u - 1), leftoverMm: lengthMm - used * pitch };
}

/**
 * The best way to split `avail` units into `k` boards of minU..maxU, scored.
 * Enumerated as partitions of the slack (k * maxU - avail) into at most k
 * cuts of at most maxU - minU each. The slack is always below maxU, so this
 * is a handful of candidates.
 */
function bestSplit(
  avail: number,
  k: number,
  minU: number,
  maxU: number,
  needsMirror: (holes: number) => boolean,
): number[] {
  const slack = k * maxU - avail;
  const maxCut = maxU - minU;
  // Declared with `as` so TypeScript does not narrow it to `null` for the closure below.
  let best = null as number[] | null;
  let bestScore: number[] = [];
  const cuts: number[] = [];

  const visit = (remaining: number, maxPart: number): void => {
    if (remaining === 0) {
      const units = Array.from({ length: k }, (_, i) => maxU - (cuts[i] ?? 0)).sort((a, b) => b - a);
      const score = scoreSplit(units, needsMirror);
      if (best === null || compareScores(score, bestScore) < 0) {
        best = units;
        bestScore = score;
      }
      return;
    }
    if (cuts.length === k) return;
    for (let c = Math.min(remaining, maxPart); c >= 1; c--) {
      cuts.push(c);
      visit(remaining - c, c);
      cuts.pop();
    }
  };

  visit(slack, maxCut);
  if (best === null) throw new Error('bestSplit: no candidate found');
  return best;
}

/**
 * Lower is better. [boards needing mirroring on this axis, distinct sizes,
 * shortfall below the largest board (sum of max - u, favoring balanced
 * sizes over slivers), -size1, -size2, ... (larger first, for determinism)]
 */
function scoreSplit(unitsDesc: number[], needsMirror: (holes: number) => boolean): number[] {
  const mirrored = unitsDesc.filter((u) => needsMirror(u - 1)).length;
  const distinct = new Set(unitsDesc).size;
  const max = unitsDesc[0];
  const shortfall = unitsDesc.reduce((sum, u) => sum + (max - u), 0);
  return [mirrored, distinct, shortfall, ...unitsDesc.map((u) => -u)];
}

function compareScores(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
