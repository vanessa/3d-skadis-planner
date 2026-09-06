# Layout strategies, clearer print list, TXT export, author credit — design

Date: 2026-09-05
Status: approved for planning
Builds on: `2026-09-05-skadis-board-planner-design.md` (solver),
`2026-09-05-toolcraft-design-port-design.md` (UI), `2026-09-05-canvas-zoom-pan-design.md`

## Goal

Four small features requested together:

1. The user picks a **layout strategy** for how boards are distributed.
2. The **print list** names the exact file to open and says plainly how to
   print each board; the mirroring note explains why.
3. A **Download print list** button saves a plain-text file with everything
   needed at the printer.
4. The model **author is credited and thanked** in the app, the export and
   the README.

## 1. Layout strategies

A strategy is a per-axis search over the same candidate space the solver
already uses (every way to cut a length into boards that fit the bed). Each
strategy decides how much may stay uncovered, which candidates are
acceptable, and how ties are scored. Both axes use the same strategy.

| Id | Name | Rule (per axis) | 820 × 1000 mm on an A1 |
|---|---|---|---|
| `balanced` (default) | Balanced | Exact cover with the fewest boards; then fewest mirrored boards, fewest distinct sizes, smallest shortfall below the largest board, larger first. Today's behaviour. | 220+200+200+200 by 5 × 200 |
| `largest-first` | Largest boards first | Exact cover with the fewest boards; then fewest mirrored, fewest distinct sizes, larger boards first. | 240+240+240+100 by 5 × 200 |
| `uniform` | Same size only | Every board identical. Over all sizes, pick the size with the lowest cost = boards + uncovered pitches (so one uncovered pitch costs as much as one extra board); ties go to fewer boards, then fewer mirrored. On a 9980 mm axis this gives 41 × 240 mm with 140 mm uncovered rather than 83 × 120 mm. | 4 × 200 (20 mm gap) by 5 × 200 |
| `no-mirror` | No mirroring | Only boards that do not need mirroring on that axis (odd hole counts for Skadis). May use up to two more boards than the minimum or leave up to one pitch (20 mm) uncovered; ties: least gap, fewest sizes, smallest shortfall, larger first. | 4 × 200 (20 mm gap) by 5 × 200 |
| `allow-gap` | Allow a gap | Fewest boards that cover at least the length minus the chosen gap (default 40 mm, capped at one pitch below the largest board so a huge gap never drops a whole board's worth); ties: fewest mirrored, least gap, fewest sizes, smallest shortfall, larger first. | 4 × 200 (20 mm gap) by 4 × 240 (40 mm gap): 16 boards |

If a strategy finds no valid layout for an axis (for example No mirroring on
a wall where only 2-hole boards fit), the axis falls back to Balanced
silently. The existing "k boards cannot fit at all" fallback stays.

### Solver interface

```ts
// src/solver/strategies.ts
export type StrategyId = 'balanced' | 'largest-first' | 'uniform' | 'no-mirror' | 'allow-gap';
export interface SearchContext { avail: number; minU: number; maxU: number; needsMirror(holes: number): boolean; gapUnits: number }
export interface Strategy { id: StrategyId; name: string; description: string; search(ctx: SearchContext): number[] | null }
export const STRATEGIES: Strategy[]; export const DEFAULT_STRATEGY_ID: StrategyId; export function getStrategy(id: string): Strategy;

// src/solver/axis.ts
export function splitAxis(lengthMm, bedMm, model, axis, strategy = balanced, maxGapMm = 0): AxisSplit

// src/solver/types.ts
PlanRequest gains `strategyId?: StrategyId` (default 'balanced') and `maxGapMm?: number` (default 40, used by allow-gap only).
Plan gains `strategyId: StrategyId`.
```

The shared engine `bestPartition(ctx, { tol, extraK, accept, score })`
enumerates, for `k` from the fewest boards that can reach `avail - tol`
upward by at most `extraK`, every non-increasing k-tuple in `[minU, maxU]`
with a sum in `[avail - tol, avail]` (as partitions of the slack), keeps the
accepted ones, and returns the best-scored candidate at the first `k` that
has any. Uniform runs its own loop over sizes.

### UI

A new panel section **Layout** after Printer: a `Strategy` select listing the
five names, a one-line description under it (11 px muted), and, only for
Allow a gap, a `Max gap` field in mm (default 40; 0 to 1000). The summary
chip appends ` · <strategy name>`. The TXT export names the strategy.

## 2. Clearer print list

Columns become **File · Size · Qty · Print as**.

- File: the model supplies `fileName(cols, rows)`; for Skadis Infinity the
  zip's naming is `${cols} x ${rows}.stl` (verified against the archive:
  `9 x 10.stl` and `10 x 9.stl` both exist).
- Print as: `as is`, `mirrored X`, `mirrored Y`, `mirrored X + Y`. Mirrored
  values render as the existing outlined badge; `as is` as plain muted text.
- The note under the table (from the model's `mirrorNote`) becomes:
  "Boards with an even number of holes are not symmetric, so every other one
  along a row (mirrored X) or down a column (mirrored Y) must be printed as a
  mirror image, or the slots will not line up across the seam. In Bambu
  Studio: select the board, right-click, Mirror, then X or Y. The preview
  marks which positions get mirrored boards."

## 3. Download print list

- Button **Download print list** at the top of the panel footer, above the
  MakerWorld link; disabled without a plan. Saves
  `board-plan-<W>x<H>.txt` (W, H in whole mm of the entered space).
- Text is produced by a pure function `formatPrintList(input)` in
  `src/export/printListText.ts`; `downloadText(fileName, text)` in
  `src/ui/download.ts` creates a Blob, a temporary anchor and revokes the
  URL.
- Layout of the file (monospace-friendly, LF line endings):

```
Board planner - print list
==========================
Space:    1000 x 600 mm
Model:    IKEA Skadis Infinity
          https://makerworld.com/en/models/1309689-ikea-skadis-infinity
Printer:  Bambu Lab A1 (bed 256 x 256 mm)
Strategy: Balanced
Result:   15 boards, covers 1000 x 600 mm, 15 mm left on the right

Qty  File           Size          Print as
 15  9 x 9.stl      200 x 200 mm  as is

Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)
9x9   9x9   9x9   9x9   9x9
9x9   9x9   9x9   9x9   9x9
9x9   9x9   9x9   9x9   9x9

<mirror note, wrapped at 78 columns>

Boards designed by AU3D - https://makerworld.com/en/@AU3D
Thank you for sharing them!
Generated 2026-09-05 with Board planner
```

Columns in the table are padded to the widest value. Layout cells are the
hole counts plus a mark, padded to equal width. ASCII only (`x`, `-`) so
the file is safe in any editor.

## 4. Author credit

`BoardModel` gains `author: { name: string; url: string; thanks: string }`.
Skadis Infinity: name `AU3D`, url `https://makerworld.com/en/@AU3D`, thanks
`Thank you for sharing them!`

Shown in the panel footer under the two buttons, 11 px muted:
"Boards designed by [AU3D](profile). Thank you for sharing them!" (the name
is a link, new tab). Also in the TXT footer and in a README "Credits"
section linking the model page and the author's profile, noting the files
are downloaded from MakerWorld under the author's licence and are not
redistributed by this tool.

## Testing

- `strategies.test.ts` and `axis.test.ts`: each strategy on the 820 and 1000
  mm axes above, the 260 mm axis (Uniform → one 240 mm board, 20 mm gap;
  No mirroring → one 11-hole board, 20 mm gap), Allow a gap with 0 and
  40 mm, the fallback when No mirroring has no candidate, `getStrategy`
  throwing on an unknown id.
- `plan.test.ts`: `strategyId` propagates and defaults; Allow a gap on
  820 × 1000 gives 16 boards.
- `skadisInfinity.test.ts`: `fileName(9, 10)` is `9 x 10.stl`; author fields.
- `PrintList.test.tsx`: new column values and labels.
- `printListText.test.ts`: full-text snapshot of the default plan, the
  layout marks for the A1-mini 720 × 360 case, padding, file name.
- `planState.test.ts`: strategy and max gap parsing and validation.
- `App.test.tsx`: Layout section, Max gap appears only for Allow a gap, the
  download button calls `downloadText` with the right name and content
  (module mocked), the credit link.
- Screenshot check of the Layout section, the print list and the footer.

## Out of scope

CSV or PDF export, per-axis strategies, persisting the strategy, editing
the layout by hand, any 3D view change.
