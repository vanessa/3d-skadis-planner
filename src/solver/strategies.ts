export type StrategyId = 'balanced' | 'largest-first' | 'uniform' | 'no-mirror' | 'allow-gap';

/** One axis, in units of one pitch: a board with h holes is h + 1 units long. */
export interface SearchContext {
  avail: number;
  minU: number;
  maxU: number;
  needsMirror: (holes: number) => boolean;
  /** Extra units that may stay uncovered (allow-gap only). */
  gapUnits: number;
}

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  /** Board lengths in units, largest first, or null when the strategy has no valid layout. */
  search(ctx: SearchContext): number[] | null;
}

type Score = number[];

function compareScores(a: Score, b: Score): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const sum = (units: number[]) => units.reduce((s, u) => s + u, 0);
const mirrored = (units: number[], needsMirror: (h: number) => boolean) =>
  units.filter((u) => needsMirror(u - 1)).length;
const distinct = (units: number[]) => new Set(units).size;
const shortfall = (units: number[]) => units.reduce((s, u) => s + (units[0] - u), 0);
const largerFirst = (units: number[]) => units.map((u) => -u);

/** Call `visit` for every non-increasing partition of `total` into at most `maxParts` parts of at most `maxPart`. */
function forEachPartition(total: number, maxParts: number, maxPart: number, visit: (parts: number[]) => void): void {
  const parts: number[] = [];
  const go = (remaining: number, cap: number): void => {
    if (remaining === 0) {
      visit(parts);
      return;
    }
    if (parts.length === maxParts) return;
    for (let c = Math.min(remaining, cap); c >= 1; c--) {
      parts.push(c);
      go(remaining - c, c);
      parts.pop();
    }
  };
  go(total, maxPart);
}

/**
 * Enumerate every non-increasing k-tuple in [minU, maxU] whose sum lies in
 * [avail - tol, avail]. k starts at the fewest boards that can reach
 * avail - tol and rises by at most `extraK`. The first k with an accepted
 * candidate wins; ties within that k go to the lowest score.
 */
export function bestPartition(
  ctx: SearchContext,
  opts: { tol: number; extraK?: number; accept?: (units: number[]) => boolean; score: (units: number[]) => Score },
): number[] | null {
  const { avail, minU, maxU } = ctx;
  const target = Math.max(minU, avail - opts.tol);
  const kMin = Math.max(1, Math.ceil(target / maxU));
  const kMax = kMin + (opts.extraK ?? 0);
  for (let k = kMin; k <= kMax; k++) {
    if (k * minU > avail) break;
    const minSum = Math.max(k * minU, avail - opts.tol);
    let best = null as number[] | null;
    let bestScore: Score = [];
    for (let slack = Math.max(0, k * maxU - avail); slack <= k * maxU - minSum; slack++) {
      forEachPartition(slack, k, maxU - minU, (cuts) => {
        const units = Array.from({ length: k }, (_, i) => maxU - (cuts[i] ?? 0)).sort((a, b) => b - a);
        if (opts.accept && !opts.accept(units)) return;
        const s = opts.score(units);
        if (best === null || compareScores(s, bestScore) < 0) {
          best = units;
          bestScore = s;
        }
      });
    }
    if (best) return best;
  }
  return null;
}

export const balanced: Strategy = {
  id: 'balanced',
  name: 'Balanced',
  description: 'Fewest boards, then the fewest mirrored boards and sizes, with the remainder spread out instead of left as a sliver.',
  search: (ctx) =>
    bestPartition(ctx, {
      tol: 0,
      score: (u) => [mirrored(u, ctx.needsMirror), distinct(u), shortfall(u), ...largerFirst(u)],
    }),
};

export const largestFirst: Strategy = {
  id: 'largest-first',
  name: 'Largest boards first',
  description: 'Fewest boards using the biggest board that fits, with one smaller board for the remainder.',
  search: (ctx) =>
    bestPartition(ctx, {
      tol: 0,
      score: (u) => [mirrored(u, ctx.needsMirror), distinct(u), ...largerFirst(u)],
    }),
};

export const uniform: Strategy = {
  id: 'uniform',
  name: 'Same size only',
  description:
    'Every board the same size. Picks the size that needs the fewest boards without leaving a big strip uncovered.',
  search: (ctx) => {
    let best = null as number[] | null;
    let bestScore: Score = [];
    for (let size = ctx.maxU; size >= ctx.minU; size--) {
      const k = Math.floor(ctx.avail / size);
      if (k < 1) continue;
      const units = Array<number>(k).fill(size);
      const gap = ctx.avail - k * size;
      const score = [gap + k, k, mirrored(units, ctx.needsMirror)];
      if (best === null || compareScores(score, bestScore) < 0) {
        best = units;
        bestScore = score;
      }
    }
    return best;
  },
};

export const noMirror: Strategy = {
  id: 'no-mirror',
  name: 'No mirroring',
  description:
    'Prefers symmetric boards so nothing needs mirroring in the slicer; may use an extra board or leave up to one pitch uncovered, and falls back to Balanced when no symmetric layout fits.',
  search: (ctx) =>
    bestPartition(ctx, {
      tol: 1,
      extraK: 2,
      accept: (u) => u.every((x) => !ctx.needsMirror(x - 1)),
      score: (u) => [ctx.avail - sum(u), distinct(u), shortfall(u), ...largerFirst(u)],
    }),
};

export const allowGap: Strategy = {
  id: 'allow-gap',
  name: 'Allow a gap',
  description: 'Fewest boards if up to the chosen gap may stay uncovered at the right or bottom edge.',
  search: (ctx) =>
    bestPartition(ctx, {
      tol: ctx.gapUnits,
      score: (u) => [mirrored(u, ctx.needsMirror), ctx.avail - sum(u), distinct(u), shortfall(u), ...largerFirst(u)],
    }),
};

export const STRATEGIES: Strategy[] = [balanced, largestFirst, uniform, noMirror, allowGap];
export const DEFAULT_STRATEGY_ID: StrategyId = 'balanced';

export function getStrategy(id: string): Strategy {
  const s = STRATEGIES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown strategy: ${id}`);
  return s;
}
