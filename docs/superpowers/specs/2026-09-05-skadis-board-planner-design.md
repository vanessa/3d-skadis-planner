# Skadis board planner — design

Date: 2026-09-05
Status: approved for planning

## Goal

A single-page web app. The user enters the width and height of a wall area,
picks a board model and a printer, and gets the layout that covers that area
with the fewest printable boards. The first model is AU3D's
[IKEA Skadis Infinity](https://makerworld.com/en/models/1309689-ikea-skadis-infinity).
Adding a model later must be a one-file change.

## Facts about the Skadis Infinity model

Taken from the MakerWorld page and its size table (2026-09-05).

- Boards are described by hole counts, `columns x rows`, each from 2 to 15
  (the size table shows 3 to 15; the STL zip also contains 2x2).
- Outer size per axis: `mm = 20 * (holes + 1)`. So 3 holes = 80 mm,
  11 holes = 240 mm, 15 holes = 320 mm.
- Boards have no border ("infinity" style) so they butt together seamlessly.
- A board has a symmetric hole pattern only when both counts are odd.
  Symmetric boards need no adjustment when tiled.
- A board with an even number of hole columns must be mirrored along X on
  every other board when tiled horizontally. Same for even rows and Y when
  tiled vertically. Mirroring is done in the slicer (Bambu Studio).
- Boards mount with M4 countersunk screws (M3.5 works too).

## Decisions

| Topic | Decision |
|---|---|
| Optimisation goal | Fewest boards. Tie-breaks: fewer boards that need mirroring, then fewer distinct sizes, then sizes close to the largest board (no slivers), then larger boards first. |
| Printers | Preset list plus a custom bed size. Default Bambu Lab A1. |
| Units | Input in mm, cm or inches. Everything internal is mm. |
| Fit rule | Boards never overhang the space. Any strip narrower than the smallest board is reported as leftover. Width and height are capped at 10 000 mm, custom beds at 2 000 mm. |
| Stack | Lightweight web app: Vite, React, TypeScript, StyleX for styling, Vitest for tests. Static site, no backend. |
| Out of scope for v1 | Export, saving, non-rectangular walls, filament or cost estimates, drag editing. |

Printer presets (bed width x depth, mm): A1 256x256, A1 mini 180x180,
P1S 256x256, X1 Carbon 256x256, H2D 350x320.

## Architecture

```
src/
  models/      board model definitions, one file each + registry
  printers/    printer presets + registry
  solver/      pure planning functions, no React
  ui/          React components, StyleX styles and tokens
  units.ts     mm <-> cm/inch conversion
```

The solver depends on models and printers. The UI depends on all three.
Nothing depends on the UI.

### Board model (`src/models`)

```ts
interface BoardModel {
  id: string;                // "skadis-infinity"
  name: string;
  url: string;               // link shown in the UI
  pitchMm: number;           // 20 for Skadis Infinity
  minHoles: number;          // 2
  maxHoles: number;          // 15
  sizeMm(holes: number): number;      // 20 * (holes + 1)
  needsMirrorX(cols: number): boolean;  // cols even
  needsMirrorY(rows: number): boolean;  // rows even
  mirrorNote: string;        // shown once in the print list
}
```

`src/models/index.ts` exports `MODELS: BoardModel[]` and `getModel(id)`.
Adding a model means adding a file that exports a `BoardModel` and appending
it to `MODELS`.

### Printer (`src/printers`)

```ts
interface Printer { id: string; name: string; bedWidthMm: number; bedDepthMm: number; }
```

`PRINTERS` preset list plus a `custom` id whose size comes from the form.
The bed is treated as a plain rectangle; the planner does not rotate boards
on the bed. A board fits if `sizeMm(cols) <= bedWidthMm` and
`sizeMm(rows) <= bedDepthMm`.

### Solver (`src/solver`)

Input:

```ts
interface PlanRequest {
  widthMm: number;
  heightMm: number;
  model: BoardModel;
  printer: Printer;
}
```

Output:

```ts
interface Plan {
  columns: number[];          // hole columns per grid column, left to right
  rows: number[];             // hole rows per grid row, top to bottom
  boards: PlacedBoard[];      // one per grid cell
  leftoverWidthMm: number;    // widthMm - sum of column sizes
  leftoverHeightMm: number;
  groups: BoardGroup[];       // the print list
}
interface PlacedBoard {
  col: number; row: number;   // grid indices
  cols: number; rows: number; // hole counts
  xMm: number; yMm: number; widthMm: number; heightMm: number;
  mirrorX: boolean; mirrorY: boolean;
}
interface BoardGroup {
  cols: number; rows: number; mirrorX: boolean; mirrorY: boolean;
  widthMm: number; heightMm: number; count: number;
}
```

Errors: `plan()` throws `PlanError` with a `code` of `too-small` (space
smaller than the smallest board on either axis) or `bed-too-small` (the bed
cannot fit even the smallest board). The UI shows the message inline. Any
other exception is caught by an error boundary around the app, which shows
a short message and a reload button.

#### Why a per-axis split is optimal

Every combination of column count and row count exists as a printable
board, so any list of column widths times any list of row heights is a
valid tiling. The minimum board count for a rectangle whose pieces have a
maximum side `M` is `ceil(W/M) * ceil(H/M)`, and a grid tiling reaches it.
So the 2D problem reduces to two independent 1D problems.

#### Axis split algorithm

Work in units of `pitchMm`. For one axis with available length `L` mm:

1. `avail = floor(L / pitch)` units.
2. `minU = minHoles + 1`, `maxU = min(maxHoles, floor(bed / pitch) - 1) + 1`,
   where `bed` is the matching bed dimension. If `maxU < minU` throw
   `bed-too-small`. If `avail < minU` throw `too-small`.
3. `k = ceil(avail / maxU)` boards.
4. If `k * minU > avail` an exact cover with `k` boards is impossible.
   Use `k - 1` boards of `maxU` and report the rest as leftover. Stop.
5. Otherwise enumerate every split of `avail` into `k` parts, each between
   `minU` and `maxU`. Do this by enumerating integer partitions of the
   slack `k * maxU - avail` into at most `k` parts of size at most
   `maxU - minU`, and subtracting each part from `maxU`. The slack is always
   below `maxU`, so this set is tiny.
6. Score each split and keep the best. Lower is better, compared in order:
   1. number of parts whose hole count needs mirroring on this axis
      (`needsMirrorX` for width, `needsMirrorY` for height);
   2. number of distinct part sizes;
   3. total shortfall below the largest part, `sum(max - part)`, so the
      remainder is spread across boards instead of becoming a sliver
      (540 mm on an A1 gives 200+200+140, not 240+240+60);
   4. parts sorted descending, compared lexicographically, larger first.
7. Return the parts sorted descending (large boards left/top, remainder
   right/bottom). Leftover is `L - sum(parts) * pitch`.

Minimising mirrored parts per axis also minimises mirrored boards overall,
because a board is unmirrored only when both its axes are. Distinct sizes overall
is `distinctCols * distinctRows`, so that is also independent per axis.

#### Mirroring

Walk each grid row left to right with a flag starting `false`. A board
whose `cols` is even gets `mirrorX = flag` and then toggles the flag. A
board with odd `cols` leaves the flag alone. Do the same top to bottom per
grid column for `mirrorY`. For a row of identical even boards this yields
"every other board mirrored", which matches the author's instructions.

Assumption: for mixed odd and even boards in one line, the flag-carry rule
above is the correct generalisation. This has not been verified on a
physical print and is called out in the UI note.

#### Print list

Group `boards` by `(cols, rows, mirrorX, mirrorY)`, sorted by area
descending, then unmirrored first.

### UI (`src/ui`)

One screen, two columns on desktop, stacked on mobile.

Left, the input panel:
- Width and height inputs with a unit selector (mm, cm, in). Values are
  converted to mm on change. Defaults: 1000 x 600 mm.
- Model selector (only Skadis Infinity in v1, still a select).
- Printer selector with presets and "Custom", which reveals bed width and
  depth inputs.
- Invalid input (empty, non-numeric, zero, negative, above the caps) shows a
  short inline message and keeps the last valid plan on screen.

Right, the result:
- Summary line: total boards, coverage in mm, leftover per axis if any.
- SVG preview of the wall, scaled to fit. Each board is a rectangle
  labelled `cols x rows` and its mm size. Mirrored boards get a small
  marker. Leftover strips are hatched.
- Print list: one row per group with size in mm, hole counts, quantity,
  mirror flags. A single note under the list explains how to mirror in
  Bambu Studio, and a link to the model page.

The plan recomputes on every valid input change. No submit button.

Visual direction: minimal, lots of white space, one accent colour, system
font stack, no component library. All styling is StyleX (`stylex.create` +
`stylex.props`), with design tokens in one `tokens.stylex.ts` file. No
global CSS beyond a reset.

## Testing

Vitest, run with `npm test`.

Solver tests (pure functions):
- size formula and bed cap: A1 caps at 11 holes, A1 mini at 8, H2D at 15.
- axis split: exact fit, remainder, tie-breaks (symmetric preferred, fewer
  distinct sizes), `too-small` and `bed-too-small` errors, the
  cannot-cover fallback.
- 2D plan: board count equals `ceil(w/M) * ceil(h/M)`, leftover values,
  mirror flags on uniform even boards and on mixed lines, print list
  grouping.
- units: cm and inch conversions round-trip.

UI: one smoke test that renders the app with defaults and finds the board
count in the summary. Visual polish is checked by hand.

## Extending later

- New model: new file in `src/models`, register it. If a model has a
  different size formula or symmetry rule, only its file changes.
- Non-rectangular walls or rotation on the bed would need a different solver
  strategy. The `plan()` signature is the seam for that.
- Export (PNG, CSV) and saving plans are UI-only additions.
