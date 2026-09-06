# Strategies, Print List, Export and Credit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selectable layout strategies, a print list that names files and says how to print each board, a downloadable plain-text print list, and visible credit to the model author.

**Architecture:** Strategies live in `src/solver/strategies.ts` as objects with a per-axis `search`; `splitAxis` takes a strategy and a max gap; `plan()` threads a `strategyId`. The model gains `fileName` and `author`. A pure `formatPrintList` builds the TXT; `downloadText` saves it. UI: a Layout section, new print-list columns, footer buttons and credit.

**Tech Stack:** Existing Vite 8 + React 19 + TypeScript + StyleX 0.19 + Vitest 5.

Spec: `docs/superpowers/specs/2026-09-05-strategies-print-list-export-design.md`.

## Global Constraints

- Strategy ids and names: `balanced` "Balanced", `largest-first` "Largest boards first", `uniform` "Same size only", `no-mirror` "No mirroring", `allow-gap` "Allow a gap". Default `balanced`. Default max gap 40 mm, allowed 0 to 1000.
- Hand-checked results on an A1 (256 mm bed, max 11 holes = 12 units): 820 mm (41 units) → balanced `[10,9,9,9]`, largest-first `[11,11,11,4]`, uniform `[9,9,9,9]` with 20 mm leftover, no-mirror `[9,9,9,9]` with 20 mm leftover, allow-gap 40 `[9,9,9,9]` with 20 mm leftover. 1000 mm (50 units) → balanced/largest-first/uniform/no-mirror `[9,9,9,9,9]`, allow-gap 40 `[11,11,11,11]` with 40 mm leftover, allow-gap 0 `[9,9,9,9,9]`. 260 mm (13 units) → uniform `[11]` leftover 20, no-mirror `[11]` leftover 20.
- Print list columns `File · Size · Qty · Print as`; values `as is` / `mirrored X` / `mirrored Y` / `mirrored X + Y`. Skadis file name `${cols} x ${rows}.stl`. Author: `AU3D`, `https://makerworld.com/en/@AU3D`, thanks `Thank you for sharing them!`
- TXT format exactly as the spec's block; ASCII only; LF; file name `board-plan-<W>x<H>.txt`.
- Labels: Layout section title `Layout`; select label `Strategy`; gap field label `Max gap`. Footer button text `Download print list`; link text `Open files on MakerWorld`; credit `Boards designed by AU3D. Thank you for sharing them!` with the name linked.
- Solver never imports React or `src/ui`. StyleX only in the UI. Do not touch `src/ui/three/**`, `src/boards3d/**`, `PreviewCard.tsx`, `Canvas.tsx`, `Preview.tsx`, `useViewport.ts`.
- `npm test`, `npm run typecheck`, `npm run build` pass after every task; output warning-free.
- Commit messages: plain sentences, no conventional-commit prefixes, no "Fix X:" colon subjects; end with a blank line and `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`. Stage files by path.

## File Structure

```
src/solver/strategies.ts        NEW: Strategy type, bestPartition engine, five strategies, registry
src/solver/strategies.test.ts   NEW
src/solver/axis.ts              takes strategy + maxGapMm; scoring moves to strategies
src/solver/axis.test.ts         + per-strategy cases
src/solver/plan.ts / types.ts   strategyId + maxGapMm in, strategyId out
src/solver/index.ts             re-exports strategies
src/models/types.ts             + fileName(cols, rows), author
src/models/skadisInfinity.ts    + fileName, author, reworded mirrorNote
src/ui/PrintList.tsx            new columns
src/ui/planState.ts             strategyId + maxGap in FormState, validation
src/ui/fields.tsx               + FieldHint
src/ui/InputPanel.tsx           + Layout section
src/ui/SummaryChip.tsx          + strategy name
src/export/printListText.ts     NEW pure formatter
src/export/printListText.test.ts NEW
src/ui/download.ts              NEW downloadText
src/ui/App.tsx                  footer: download button, link, credit
README.md                       Credits section
```

---

### Task 1: Strategies in the solver

**Files:**
- Create: `src/solver/strategies.ts`, `src/solver/strategies.test.ts`
- Modify: `src/solver/axis.ts`, `src/solver/axis.test.ts`, `src/solver/types.ts`, `src/solver/plan.ts`, `src/solver/plan.test.ts`, `src/solver/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export type StrategyId = 'balanced' | 'largest-first' | 'uniform' | 'no-mirror' | 'allow-gap';
  export interface SearchContext { avail: number; minU: number; maxU: number; needsMirror: (holes: number) => boolean; gapUnits: number }
  export interface Strategy { id: StrategyId; name: string; description: string; search(ctx: SearchContext): number[] | null }
  export const STRATEGIES: Strategy[]; export const DEFAULT_STRATEGY_ID: StrategyId; export function getStrategy(id: string): Strategy;
  export function splitAxis(lengthMm: number, bedMm: number, model: BoardModel, axis: 'x' | 'y', strategy?: Strategy, maxGapMm?: number): AxisSplit;
  PlanRequest { …, strategyId?: StrategyId; maxGapMm?: number }   Plan { …, strategyId: StrategyId }
  ```

- [ ] **Step 1: Write the failing tests**

`src/solver/strategies.test.ts`:
```ts
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
```

Add to `src/solver/axis.test.ts` (import `getStrategy` from `./strategies`):
```ts
describe('splitAxis with strategies', () => {
  it('uniform leaves a strip uncovered', () => {
    expect(splitAxis(820, A1, model, 'x', getStrategy('uniform'))).toEqual({ holes: [9, 9, 9, 9], leftoverMm: 20 });
  });
  it('allow-gap honours the mm gap', () => {
    expect(splitAxis(1000, A1, model, 'y', getStrategy('allow-gap'), 40)).toEqual({ holes: [11, 11, 11, 11], leftoverMm: 40 });
    expect(splitAxis(1000, A1, model, 'y', getStrategy('allow-gap'), 0).holes).toEqual([9, 9, 9, 9, 9]);
  });
  it('no-mirror falls back to balanced when it has no candidate', () => {
    expect(splitAxis(60, A1, model, 'x', getStrategy('no-mirror'))).toEqual({ holes: [2], leftoverMm: 0 });
  });
  it('defaults to balanced', () => {
    expect(splitAxis(820, A1, model, 'x').holes).toEqual([10, 9, 9, 9]);
  });
});
```

Add to `src/solver/plan.test.ts`:
```ts
describe('plan strategies', () => {
  it('defaults to balanced and reports the strategy', () => {
    expect(plan(req(820, 1000)).strategyId).toBe('balanced');
  });
  it('allow-gap 40 on 820 x 1000 gives 16 boards', () => {
    const p = plan({ ...req(820, 1000), strategyId: 'allow-gap', maxGapMm: 40 });
    expect(p.strategyId).toBe('allow-gap');
    expect(p.columns).toEqual([9, 9, 9, 9]);
    expect(p.rows).toEqual([11, 11, 11, 11]);
    expect(p.boards).toHaveLength(16);
    expect(p.leftoverHeightMm).toBe(40);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/solver` → new tests FAIL (module missing / wrong arity).

- [ ] **Step 3: Implement strategies**

`src/solver/strategies.ts`:
```ts
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
  description: 'Every board the same size. Picks the size that needs the fewest boards without leaving a big strip uncovered.',
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
  description: 'Only symmetric boards, so nothing needs mirroring in the slicer. May use an extra board or leave up to one pitch uncovered.',
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
```

`src/solver/axis.ts` — replace `bestSplit`/`scoreSplit`/`compareScores` with the strategy call:
```ts
import type { BoardModel } from '../models/types';
import { PlanError } from './errors';
import { balanced, type Strategy } from './strategies';

export interface AxisSplit { holes: number[]; leftoverMm: number; }

export function splitAxis(
  lengthMm: number, bedMm: number, model: BoardModel, axis: 'x' | 'y',
  strategy: Strategy = balanced, maxGapMm = 0,
): AxisSplit {
  const pitch = model.pitchMm;
  const minU = model.minHoles + 1;
  const bedHoles = Math.floor(bedMm / pitch) - 1;
  const maxU = Math.min(model.maxHoles, bedHoles) + 1;
  const smallest = model.sizeMm(model.minHoles);
  const needsMirror = axis === 'x' ? (h: number) => model.needsMirrorX(h) : (h: number) => model.needsMirrorY(h);
  // (keep the two PlanError checks exactly as they are)
  const avail = Math.floor(lengthMm / pitch);
  // …
  const ctx = { avail, minU, maxU, needsMirror, gapUnits: Math.min(Math.max(0, Math.floor(maxGapMm / pitch)), maxU - 1) };
  const k = Math.ceil(avail / maxU);
  const units =
    k * minU > avail
      ? Array<number>(k - 1).fill(maxU)
      : (strategy.search(ctx) ?? balanced.search(ctx) ?? Array<number>(k - 1).fill(maxU));
  const used = units.reduce((s, u) => s + u, 0);
  return { holes: units.map((u) => u - 1), leftoverMm: lengthMm - used * pitch };
}
```
Keep the JSDoc on `splitAxis` and update it to mention the strategy.

`src/solver/types.ts`: import `StrategyId`; add `strategyId?: StrategyId; maxGapMm?: number;` to `PlanRequest` and `strategyId: StrategyId;` to `Plan`.

`src/solver/plan.ts`: `const strategy = getStrategy(req.strategyId ?? DEFAULT_STRATEGY_ID); const gap = req.maxGapMm ?? 40;` pass `strategy, gap` to both `splitAxis` calls; return `strategyId: strategy.id`.

`src/solver/index.ts`: add `export { STRATEGIES, DEFAULT_STRATEGY_ID, getStrategy } from './strategies'; export type { Strategy, StrategyId } from './strategies';`.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run typecheck && npm run build`. Every previous axis/plan expectation must still hold (balanced is unchanged). If a hand-checked value disagrees with an exact transcription, report the actual output; do not bend the test.

- [ ] **Step 5: Commit**

```bash
git add src/solver
git commit -m "Add selectable layout strategies to the axis solver

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 2: Model file names and author; print list columns

**Files:**
- Modify: `src/models/types.ts`, `src/models/skadisInfinity.ts`, `src/models/skadisInfinity.test.ts`, `src/ui/PrintList.tsx`, `src/ui/PrintList.test.tsx`

**Interfaces:**
- Produces: `BoardModel.fileName(cols: number, rows: number): string`, `BoardModel.author: { name: string; url: string; thanks: string }`; `PrintList` unchanged signature, new columns.

- [ ] **Step 1: Failing tests**

Add to `src/models/skadisInfinity.test.ts`:
```ts
  it('names the STL file as columns x rows', () => {
    expect(skadisInfinity.fileName(9, 10)).toBe('9 x 10.stl');
    expect(skadisInfinity.fileName(10, 9)).toBe('10 x 9.stl');
  });
  it('credits the author', () => {
    expect(skadisInfinity.author).toEqual({
      name: 'AU3D',
      url: 'https://makerworld.com/en/@AU3D',
      thanks: 'Thank you for sharing them!',
    });
  });
```
In `src/ui/PrintList.test.tsx`: change the expected cells of row 0 to `['8 x 8.stl', '180 × 180 mm', '1', 'as is']`, row 1's fourth cell to `'mirrored X'`, and the four-variant test to `['as is', 'mirrored X', 'mirrored Y', 'mirrored X + Y']`. Change the note assertion to `screen.getByText(/mirror image/)`.

- [ ] **Step 2: Run to see them fail**

`npm test -- src/models src/ui/PrintList.test.tsx`.

- [ ] **Step 3: Implement**

`src/models/types.ts`: add to `BoardModel`
```ts
  /** File name in the author's download for a board with these hole counts. */
  fileName(cols: number, rows: number): string;
  /** Who designed the boards; shown in the footer, the export and the README. */
  author: { name: string; url: string; thanks: string };
```
`src/models/skadisInfinity.ts`: add
```ts
  fileName: (cols, rows) => `${cols} x ${rows}.stl`,
  author: { name: 'AU3D', url: 'https://makerworld.com/en/@AU3D', thanks: 'Thank you for sharing them!' },
```
and replace `mirrorNote` with:
```ts
  mirrorNote:
    'Boards with an even number of holes are not symmetric, so every other one along a row ' +
    '(mirrored X) or down a column (mirrored Y) must be printed as a mirror image, or the slots ' +
    'will not line up across the seam. In Bambu Studio: select the board, right-click, Mirror, ' +
    'then X or Y. The preview marks which positions get mirrored boards.',
```
`src/ui/PrintList.tsx`: header cells `File`, `Size`, `Qty` (end-aligned), `Print as`; body cells `{model.fileName(g.cols, g.rows)}`, `{g.widthMm} × {g.heightMm} mm`, count, and for Print as: `label ? <span {...stylex.props(styles.mirror)}>{label}</span> : <span {...stylex.props(styles.asIs)}>as is</span>` where `mirrorLabel` returns `'mirrored X + Y' | 'mirrored X' | 'mirrored Y' | null` and `asIs` is `{ color: colors.muted }`. Drop the Holes column.

- [ ] **Step 4: Run everything** (`npm test && npm run typecheck && npm run build`) — the `printListText` task later also uses `fileName`.

- [ ] **Step 5: Commit**

```bash
git add src/models src/ui/PrintList.tsx src/ui/PrintList.test.tsx
git commit -m "Name the file to print for each board and say plainly how to print it

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 3: Layout section, form state and chip

**Files:**
- Modify: `src/ui/planState.ts`, `src/ui/planState.test.ts`, `src/ui/fields.tsx`, `src/ui/InputPanel.tsx`, `src/ui/SummaryChip.tsx`, `src/ui/SummaryChip.test.tsx`, `src/ui/App.test.tsx`

**Interfaces:**
- Produces: `FormState` gains `strategyId: StrategyId` (default `'balanced'`) and `maxGap: string` (default `'40'`); `computePlan` validates `maxGap` only when `strategyId === 'allow-gap'` (0 to 1000, message `Enter a max gap between 0 and 1000 mm.`) and passes `strategyId`/`maxGapMm` to `plan`. `fields.tsx` exports `FieldHint({ children })` (11 px muted paragraph). `SummaryChip` appends ` · <strategy name>` to the detail.

- [ ] **Step 1: Failing tests**

`src/ui/planState.test.ts` additions:
```ts
  it('defaults to the balanced strategy', () => {
    expect(DEFAULT_FORM.strategyId).toBe('balanced');
    expect(computePlan(DEFAULT_FORM).plan?.strategyId).toBe('balanced');
  });
  it('passes the strategy and gap to the solver', () => {
    const out = computePlan({ ...DEFAULT_FORM, width: '820', height: '1000', strategyId: 'allow-gap', maxGap: '40' });
    expect(out.plan?.boards).toHaveLength(16);
  });
  it('validates the gap only for allow-gap', () => {
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'allow-gap', maxGap: '' }).error).toMatch(/max gap/i);
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'allow-gap', maxGap: '5000' }).error).toMatch(/1000/);
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'balanced', maxGap: '' }).error).toBeNull();
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'allow-gap', maxGap: '0' }).error).toBeNull();
  });
```
`src/ui/SummaryChip.test.tsx`: in the first test add `expect(text).toMatch(/· Balanced$/)`.
`src/ui/App.test.tsx` additions:
```tsx
  it('offers layout strategies and shows the gap field only for allow-gap', () => {
    render(<App />);
    const select = screen.getByLabelText('Strategy') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Balanced', 'Largest boards first', 'Same size only', 'No mirroring', 'Allow a gap',
    ]);
    expect(screen.queryByLabelText('Max gap')).toBeNull();
    fireEvent.change(select, { target: { value: 'allow-gap' } });
    expect((screen.getByLabelText('Max gap') as HTMLInputElement).value).toBe('40');
    expect(screen.getByText(/16 boards/)).toBeTruthy();   // 1000 x 600 with a 40 mm gap: 4 x 4? no — see note
  });
```
Note for the last assertion: 1000 × 600 on an A1 with a 40 mm gap gives columns `[11,11,11,11]` (960 + 40) and rows `[11,11]` (480 + 120 is not allowed: gap 40 only) → rows stay `[9,9,9]`; so 4 × 3 = **12 boards**. Use `expect(screen.getByText(/12 boards/)).toBeTruthy();`.

- [ ] **Step 2: Run to see them fail** (`npm test -- src/ui`).

- [ ] **Step 3: Implement**

`src/ui/planState.ts`: import `DEFAULT_STRATEGY_ID, type StrategyId` from `../solver`; add the two fields and defaults; add `MAX_GAP_MM = 1000`; in `computePlan`, after the bed block:
```ts
  let maxGapMm = 0;
  if (form.strategyId === 'allow-gap') {
    const g = Number(form.maxGap.trim());
    if (form.maxGap.trim() === '' || !Number.isFinite(g) || g < 0 || g > MAX_GAP_MM) {
      return { plan: null, error: `Enter a max gap between 0 and ${MAX_GAP_MM} mm.` };
    }
    maxGapMm = g;
  }
```
and pass `strategyId: form.strategyId, maxGapMm` into `plan(...)`.

`src/ui/fields.tsx`: add
```tsx
export function FieldHint({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.hint)}>{children}</p>;
}
```
with `hint: { margin: 0, fontSize: font.xs, lineHeight: '15px', color: colors.muted }`.

`src/ui/InputPanel.tsx`: import `STRATEGIES, getStrategy` from `../solver` and `FieldHint`; after the Printer section add
```tsx
      <PanelSection title="Layout">
        <SelectField
          label="Strategy"
          value={form.strategyId}
          onChange={(strategyId) => onChange({ strategyId: strategyId as StrategyId })}
          options={STRATEGIES.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FieldHint>{getStrategy(form.strategyId).description}</FieldHint>
        {form.strategyId === 'allow-gap' && (
          <NumberField label="Max gap" value={form.maxGap} onChange={(maxGap) => onChange({ maxGap })} />
        )}
      </PanelSection>
```
(`Max gap` is in mm; add ` (mm)`? No — keep the label exact; the hint above already says mm in its description text: append " Gap in mm." to the allow-gap description in `strategies.ts` only if you must; prefer leaving descriptions as specified.)

`src/ui/SummaryChip.tsx`: import `getStrategy` from `../solver`; push `getStrategy(plan.strategyId).name` as the last part.

- [ ] **Step 4: Run everything.** Existing App tests (`15 boards` etc.) still hold because the default strategy is balanced.

- [ ] **Step 5: Commit**

```bash
git add src/ui/planState.ts src/ui/planState.test.ts src/ui/fields.tsx src/ui/InputPanel.tsx src/ui/SummaryChip.tsx src/ui/SummaryChip.test.tsx src/ui/App.test.tsx
git commit -m "Let the user choose a layout strategy and a maximum gap

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 4: TXT export, download button, author credit, README

**Files:**
- Create: `src/export/printListText.ts`, `src/export/printListText.test.ts`, `src/ui/download.ts`
- Modify: `src/ui/App.tsx`, `src/ui/App.test.tsx`, `README.md`

**Interfaces:**
- Produces:
  ```ts
  export interface PrintListInput { plan: Plan; model: BoardModel; printer: Printer; widthMm: number; heightMm: number; date: Date }
  export function printListFileName(widthMm: number, heightMm: number): string;   // board-plan-1000x600.txt
  export function formatPrintList(input: PrintListInput): string;
  export function downloadText(fileName: string, text: string): void;
  ```

- [ ] **Step 1: Failing tests**

`src/export/printListText.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatPrintList, printListFileName } from './printListText';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const date = new Date('2026-09-05T12:00:00Z');

describe('printListFileName', () => {
  it('uses whole millimetres', () => {
    expect(printListFileName(1000, 600)).toBe('board-plan-1000x600.txt');
    expect(printListFileName(1000.3, 599.6)).toBe('board-plan-1000x600.txt');
  });
});

describe('formatPrintList', () => {
  it('formats the default plan', () => {
    const p = plan({ widthMm: 1015, heightMm: 600, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({ plan: p, model: skadisInfinity, printer: a1, widthMm: 1015, heightMm: 600, date });
    expect(text).toBe(
      [
        'Board planner - print list',
        '==========================',
        'Space:    1015 x 600 mm',
        'Model:    IKEA Skadis Infinity',
        '          https://makerworld.com/en/models/1309689-ikea-skadis-infinity',
        'Printer:  Bambu Lab A1 (bed 256 x 256 mm)',
        'Strategy: Balanced',
        'Result:   15 boards, covers 1000 x 600 mm, 15 mm left on the right',
        '',
        'Qty  File       Size          Print as',
        ' 15  9 x 9.stl  200 x 200 mm  as is',
        '',
        'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
        '9x9  9x9  9x9  9x9  9x9',
        '9x9  9x9  9x9  9x9  9x9',
        '9x9  9x9  9x9  9x9  9x9',
        '',
        ...wrap(skadisInfinity.mirrorNote),
        '',
        'Boards designed by AU3D - https://makerworld.com/en/@AU3D',
        'Thank you for sharing them!',
        'Generated 2026-09-05 with Board planner',
        '',
      ].join('\n'),
    );
  });

  it('marks mirrored boards in the layout and lists every variant', () => {
    const p = plan({ widthMm: 720, heightMm: 360, model: skadisInfinity, printer: mini });
    const text = formatPrintList({ plan: p, model: skadisInfinity, printer: mini, widthMm: 720, heightMm: 360, date });
    expect(text).toContain('8x8   8x8*  8x8   8x8*');
    expect(text).toContain('8x8+  8x8#  8x8+  8x8#');
    expect(text).toContain('  2  8 x 8.stl  180 x 180 mm  mirrored X + Y');
    expect(text).toContain('Strategy: Balanced');
  });
});

/** Same 78-column greedy wrap the formatter uses; kept in the test so the expectation is explicit. */
function wrap(s: string): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    if ((line + ' ' + word).trim().length > 78) {
      out.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) out.push(line);
  return out;
}
```
`src/ui/App.test.tsx` additions (top: `vi.mock('./download', () => ({ downloadText: vi.fn() })); import { downloadText } from './download'; import { vi } from 'vitest';`):
```tsx
  it('downloads the print list as text', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [name, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(name).toBe('board-plan-1000x600.txt');
    expect(text).toContain('9 x 9.stl');
    expect(text).toContain('Strategy: Balanced');
  });

  it('credits the author in the footer', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: 'AU3D' }) as HTMLAnchorElement;
    expect(link.href).toBe('https://makerworld.com/en/@AU3D');
    expect(screen.getByText(/Thank you for sharing them!/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement**

`src/export/printListText.ts`:
```ts
import type { Plan, BoardGroup, PlacedBoard } from '../solver';
import { getStrategy } from '../solver';
import type { BoardModel } from '../models';
import type { Printer } from '../printers';

export interface PrintListInput {
  plan: Plan; model: BoardModel; printer: Printer; widthMm: number; heightMm: number; date: Date;
}

const WRAP = 78;
const mm = (n: number) => String(Math.round(n));

export function printListFileName(widthMm: number, heightMm: number): string {
  return `board-plan-${mm(widthMm)}x${mm(heightMm)}.txt`;
}

function printAs(g: { mirrorX: boolean; mirrorY: boolean }): string {
  if (g.mirrorX && g.mirrorY) return 'mirrored X + Y';
  if (g.mirrorX) return 'mirrored X';
  if (g.mirrorY) return 'mirrored Y';
  return 'as is';
}

function mark(b: PlacedBoard): string {
  if (b.mirrorX && b.mirrorY) return '#';
  if (b.mirrorX) return '*';
  if (b.mirrorY) return '+';
  return '';
}

function wrap(text: string): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > WRAP) {
      out.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) out.push(line);
  return out;
}

function table(groups: BoardGroup[], model: BoardModel): string[] {
  const rows = groups.map((g) => [
    String(g.count), model.fileName(g.cols, g.rows), `${g.widthMm} x ${g.heightMm} mm`, printAs(g),
  ]);
  const header = ['Qty', 'File', 'Size', 'Print as'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[], alignRightFirst: boolean) =>
    cells
      .map((c, i) => (i === 0 && alignRightFirst ? c.padStart(widths[0]) : c.padEnd(widths[i])))
      .join('  ')
      .trimEnd();
  return [line(header, false), ...rows.map((r) => line(r, true))];
}

function layout(plan: Plan): string[] {
  const cells = plan.boards.map((b) => `${b.cols}x${b.rows}${mark(b)}`);
  const width = Math.max(...cells.map((c) => c.length));
  const cols = plan.columns.length;
  const lines: string[] = [];
  for (let r = 0; r < plan.rows.length; r++) {
    lines.push(cells.slice(r * cols, (r + 1) * cols).map((c) => c.padEnd(width)).join('  ').trimEnd());
  }
  return lines;
}

export function formatPrintList({ plan, model, printer, widthMm, heightMm, date }: PrintListInput): string {
  const result = [`${plan.boards.length} ${plan.boards.length === 1 ? 'board' : 'boards'}`,
    `covers ${mm(plan.coveredWidthMm)} x ${mm(plan.coveredHeightMm)} mm`];
  if (Math.round(plan.leftoverWidthMm) > 0) result.push(`${mm(plan.leftoverWidthMm)} mm left on the right`);
  if (Math.round(plan.leftoverHeightMm) > 0) result.push(`${mm(plan.leftoverHeightMm)} mm left at the bottom`);
  const title = 'Board planner - print list';
  const lines = [
    title,
    '='.repeat(title.length),
    `Space:    ${mm(widthMm)} x ${mm(heightMm)} mm`,
    `Model:    ${model.name}`,
    `          ${model.url}`,
    `Printer:  ${printer.name} (bed ${printer.bedWidthMm} x ${printer.bedDepthMm} mm)`,
    `Strategy: ${getStrategy(plan.strategyId).name}`,
    `Result:   ${result.join(', ')}`,
    '',
    ...table(plan.groups, model),
    '',
    'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
    ...layout(plan),
    '',
    ...wrap(model.mirrorNote),
    '',
    `Boards designed by ${model.author.name} - ${model.author.url}`,
    model.author.thanks,
    `Generated ${date.toISOString().slice(0, 10)} with Board planner`,
    '',
  ];
  return lines.join('\n');
}
```

`src/ui/download.ts`:
```ts
/** Save `text` as a UTF-8 file through a temporary object URL. */
export function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

`src/ui/App.tsx`: import `formatPrintList, printListFileName` from `../export/printListText`, `downloadText` from `./download`, `getPrinter, CUSTOM_PRINTER_ID` from `../printers`. Add a `download` handler:
```tsx
  const download = () => {
    const p = state.lastPlan;
    if (!p) return;
    const custom = { bedWidthMm: Number(state.form.customBedWidth), bedDepthMm: Number(state.form.customBedDepth) };
    const printer = getPrinter(state.form.printerId, custom);
    const widthMm = p.coveredWidthMm + p.leftoverWidthMm;
    const heightMm = p.coveredHeightMm + p.leftoverHeightMm;
    downloadText(printListFileName(widthMm, heightMm), formatPrintList({ plan: p, model, printer, widthMm, heightMm, date: new Date() }));
  };
```
Replace the footer with a column (`gap: space.sm`):
```tsx
        footer={
          <div {...stylex.props(styles.footer)}>
            <button type="button" onClick={download} disabled={!state.lastPlan} {...stylex.props(styles.footerLink)}>
              Download print list
            </button>
            <a {...stylex.props(styles.footerLink)} href={model.url} target="_blank" rel="noopener noreferrer">
              Open files on MakerWorld
            </a>
            <p {...stylex.props(styles.credit)}>
              Boards designed by{' '}
              <a {...stylex.props(styles.creditLink)} href={model.author.url} target="_blank" rel="noopener noreferrer">
                {model.author.name}
              </a>
              . {model.author.thanks}
            </p>
          </div>
        }
```
Styles: `footer: { display: 'flex', flexDirection: 'column', gap: space.sm }`; `footerLink` gains `width: '100%'`, `cursor: 'default'`, and `':disabled': { opacity: 0.5 }` on `opacity` (`opacity: { default: 1, ':disabled': 0.5 }`); `credit: { margin: 0, fontSize: font.xs, lineHeight: '15px', color: colors.muted, textAlign: 'center' }`; `creditLink: { color: colors.link, textDecoration: 'none' }`.

`README.md`: add before "## Layout":
```markdown
## Credits

The board models are [IKEA Skadis Infinity](https://makerworld.com/en/models/1309689-ikea-skadis-infinity)
by [AU3D](https://makerworld.com/en/@AU3D) on MakerWorld. Thank you for sharing them!
This tool only plans which of the author's files to print; download the files from
MakerWorld under the author's licence. Nothing from the models is redistributed here.
```
Also update the README "Run" or feature list with one line: "Pick a layout strategy (Balanced, Largest boards first, Same size only, No mirroring, Allow a gap) and download the print list as text."

- [ ] **Step 4: Run everything.** `npm test && npm run typecheck && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/export src/ui/download.ts src/ui/App.tsx src/ui/App.test.tsx README.md
git commit -m "Add a downloadable text print list and credit the model author

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 5: Screenshot check

Capture with the existing Playwright scratch setup (`/tmp/planner-shots`, Chromium at `~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, dev server on a free port, kill with `kill $(lsof -t -i:PORT)`): (1) the panel with the Layout section open on `Allow a gap` showing the Max gap field and the hint; (2) the print list for the A1-mini 720 × 360 case (four rows, `mirrored …` badges, `8 x 8.stl`); (3) the footer with both buttons and the credit line, dark and light; (4) a click on `Download print list` captured via `page.waitForEvent('download')` — save the file and print its first 12 lines. Judge legibility and that the footer fits without scrolling the panel body at 900 px height. Fix only real breakage (StyleX, `src/ui` only); commit if anything changed.
