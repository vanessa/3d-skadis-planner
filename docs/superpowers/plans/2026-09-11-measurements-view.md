# Measurements View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle on the 2D preview that shows every drill point's exact distance from the bottom-left corner as baseline dimension lines (engineering-drawing style), plus the same numbers in the exported print list.

**Architecture:** A new pure data module (`src/mounting/dimensions.ts`) turns the existing `hardwareMarkers()` output into deduped, per-axis mm values and assigns each to a non-overlapping "lane" for rendering. A new SVG overlay in `Preview.tsx` draws those as baseline dimension lines when a `measurements` mode is active (toggled in `CanvasToolbar`, state in `App.tsx`). `Canvas.tsx` reserves extra mm margin on the left/bottom for the overlay so it isn't clipped. `formatPrintList` gets a matching text block.

**Tech Stack:** React, TypeScript, StyleX, Vitest + React Testing Library. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-11-measurements-view-design.md`.
- Implement on branch `measurements-view` (already created off `main`) — do not commit to `main`, and do not use `git worktree` for this work.
- Never use conventional-commit prefixes (`feat:`, `fix:`, etc.) in commit messages — plain descriptive messages only.
- Every commit made for this plan ends with:
  ```
  Claude-Session: https://claude.ai/code/session_016Pkm9qNY8MobEehHd6zYeS
  ```
- **Coordinate flip:** markers use top-down SVG y (row 0 at the top of the drawing). The spec's "bottom-left corner" origin means X is `marker.x` directly (distance from the left wall), but Y must be `totalHeightMm - marker.y` (height from the floor, where `totalHeightMm = plan.coveredHeightMm + plan.leftoverHeightMm`). Every task that computes a Y dimension value must apply this flip — don't use `marker.y` raw.
- Only two shipped mounting systems exist today (`wall-mounts`, `spacers`); both already produce marker sets this feature reads unmodified — no changes to `src/mounting/markers.ts` or `systems.ts`.
- Run `npm test` after every task; run `npm run build` (includes `tsc --noEmit`) before the final commit of the plan.

---

### Task 1: Dimension data layer

**Files:**
- Create: `src/mounting/dimensions.ts`
- Test: `src/mounting/dimensions.test.ts`

**Interfaces:**
- Consumes: `HardwareMarker` from `src/mounting/types.ts` (`{ x: number; y: number; kind; role?; orientation? }`).
- Produces (consumed by Tasks 2, 3, 4):
  - `interface DimensionValue { mm: number; lane: number }`
  - `const MIN_GAP_MM = 60`, `const MAX_LANES = 4`, `const LANE_SPACING_MM = 40`, `const BASE_GAP_MM = 24`
  - `function dimensionAxes(markers: HardwareMarker[], totalHeightMm: number): { x: number[]; y: number[] }`
  - `function assignLanes(values: number[], minGapMm: number, maxLanes?: number): DimensionValue[]`
  - `function laneCount(laned: DimensionValue[]): number`
  - `function marginMm(laned: DimensionValue[]): number`
  - `function laneChains(markers: HardwareMarker[], totalHeightMm: number, minGapMm?: number): { x: DimensionValue[]; y: DimensionValue[] }`

- [ ] **Step 1: Write the failing tests**

Create `src/mounting/dimensions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  dimensionAxes, assignLanes, laneCount, marginMm, laneChains,
  MIN_GAP_MM, MAX_LANES, LANE_SPACING_MM, BASE_GAP_MM,
} from './dimensions';
import { hardwareMarkers } from './markers';
import { getMountSystem } from './index';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });

describe('dimensionAxes', () => {
  it('rounds, dedupes, and sorts X directly and Y flipped from the floor', () => {
    const markers = [
      { x: 10.4, y: 5, kind: 'boardCorners' as const },
      { x: 10, y: 5, kind: 'boardCorners' as const },
      { x: 190, y: 195, kind: 'boardCorners' as const },
    ];
    expect(dimensionAxes(markers, 200)).toEqual({ x: [10, 190], y: [5, 195] });
  });

  it('matches the lattice for a real wall-mounts plan', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
    expect(dimensionAxes(markers, 600)).toEqual({
      x: [0, 200, 400, 600, 800, 1000],
      y: [0, 200, 400, 600],
    });
  });
});

describe('assignLanes', () => {
  it('keeps every value on lane 0 when they are all far apart', () => {
    expect(assignLanes([0, 200, 400], 60)).toEqual([
      { mm: 0, lane: 0 }, { mm: 200, lane: 0 }, { mm: 400, lane: 0 },
    ]);
  });

  it('bumps a value too close to the previous one on its lane to the next lane', () => {
    expect(assignLanes([0, 30, 200], 60)).toEqual([
      { mm: 0, lane: 0 }, { mm: 30, lane: 1 }, { mm: 200, lane: 0 },
    ]);
  });

  it('shares the outermost lane once maxLanes is exhausted', () => {
    const result = assignLanes([0, 10, 20, 30, 40], 60, 2);
    expect(result).toEqual([
      { mm: 0, lane: 0 }, { mm: 10, lane: 1 }, { mm: 20, lane: 1 }, { mm: 30, lane: 1 }, { mm: 40, lane: 1 },
    ]);
  });

  it('defaults to MAX_LANES', () => {
    expect(assignLanes([0], MIN_GAP_MM).length).toBe(1);
    expect(MAX_LANES).toBe(4);
  });
});

describe('laneCount and marginMm', () => {
  it('is 0 for no values', () => {
    expect(laneCount([])).toBe(0);
    expect(marginMm([])).toBe(0);
  });

  it('counts the highest lane used, and sizes the margin from it', () => {
    const laned = assignLanes([0, 10, 20], 60, 4); // lane 0, then 1, then 1 again
    expect(laneCount(laned)).toBe(2);
    expect(marginMm(laned)).toBe(BASE_GAP_MM + 2 * LANE_SPACING_MM);
  });
});

describe('laneChains', () => {
  it('drops the zero value on each axis (the origin corner needs no dimension line)', () => {
    const p = plan({ widthMm: 400, heightMm: 400, model: skadisInfinity, printer: a1 });
    const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
    const chains = laneChains(markers, 400);
    expect(chains.x.map((v) => v.mm)).toEqual([200, 400]);
    expect(chains.y.map((v) => v.mm)).toEqual([200, 400]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- dimensions` — expect failures because `./dimensions` does not exist yet.

- [ ] **Step 3: Implement `src/mounting/dimensions.ts`**

```ts
import type { HardwareMarker } from './types';

export interface DimensionValue {
  mm: number;
  lane: number;
}

/** Minimum mm gap between two values sharing a lane before the later one bumps out. */
export const MIN_GAP_MM = 60;
/** Lanes beyond this share the outermost one instead of growing further. */
export const MAX_LANES = 4;
/** mm spacing between adjacent lanes in the rendered margin. */
export const LANE_SPACING_MM = 40;
/** mm gap between the boards' edge and the first lane. */
export const BASE_GAP_MM = 24;

function uniqueSorted(values: number[]): number[] {
  const rounded = values.map((v) => Math.round(v));
  return [...new Set(rounded)].sort((a, b) => a - b);
}

/**
 * Unique X values (distance from the left wall) and Y values (height from the
 * floor) across every drill point, ascending. Markers use top-down SVG y, so
 * height from the floor is `totalHeightMm - marker.y`.
 */
export function dimensionAxes(
  markers: HardwareMarker[],
  totalHeightMm: number,
): { x: number[]; y: number[] } {
  return {
    x: uniqueSorted(markers.map((m) => m.x)),
    y: uniqueSorted(markers.map((m) => totalHeightMm - m.y)),
  };
}

/**
 * Assigns each ascending value to the lowest lane whose last placed value is
 * at least `minGapMm` away. Values that still collide once `maxLanes` lanes
 * exist share the outermost lane. `values` must already be sorted ascending.
 */
export function assignLanes(values: number[], minGapMm: number, maxLanes: number = MAX_LANES): DimensionValue[] {
  const lastInLane: number[] = [];
  const result: DimensionValue[] = [];
  for (const v of values) {
    let lane = lastInLane.findIndex((last) => v - last >= minGapMm);
    if (lane === -1) {
      lane = lastInLane.length < maxLanes ? lastInLane.length : maxLanes - 1;
    }
    lastInLane[lane] = v;
    result.push({ mm: v, lane });
  }
  return result;
}

/** Number of lanes actually used (0 if there are no values). */
export function laneCount(laned: DimensionValue[]): number {
  return laned.reduce((max, v) => Math.max(max, v.lane + 1), 0);
}

/** mm reserved for an axis's dimension lanes, including the gap before the first lane. */
export function marginMm(laned: DimensionValue[]): number {
  const count = laneCount(laned);
  return count === 0 ? 0 : BASE_GAP_MM + count * LANE_SPACING_MM;
}

/**
 * The laned dimension chains for both axes, ready to render or to size a
 * margin from. The origin corner (0 mm on either axis) is dropped — it's the
 * drawing's own corner and needs no dimension line.
 */
export function laneChains(
  markers: HardwareMarker[],
  totalHeightMm: number,
  minGapMm: number = MIN_GAP_MM,
): { x: DimensionValue[]; y: DimensionValue[] } {
  const { x, y } = dimensionAxes(markers, totalHeightMm);
  return {
    x: assignLanes(x.filter((v) => v > 0), minGapMm),
    y: assignLanes(y.filter((v) => v > 0), minGapMm),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- dimensions` — expect all pass.

- [ ] **Step 5: Commit**

```bash
git add src/mounting/dimensions.ts src/mounting/dimensions.test.ts
git commit -m "$(cat <<'EOF'
Add a pure data layer for drill-point dimension chains

Turns hardware markers into deduped, laned mm values per axis so a
rendering layer can draw baseline dimension lines without figuring
out collision avoidance itself.

Claude-Session: https://claude.ai/code/session_016Pkm9qNY8MobEehHd6zYeS
EOF
)"
```

---

### Task 2: Export the measurements in the print list

**Files:**
- Modify: `src/mounting/index.ts`
- Modify: `src/export/printListText.ts`
- Modify: `src/export/printListText.test.ts`

**Interfaces:**
- Consumes: `dimensionAxes` from Task 1 (`src/mounting/dimensions.ts`), re-exported through `src/mounting/index.ts`; `hardwareMarkers`, `MountSystem`, already used in `printListText.ts`.
- Produces: `formatPrintList` output gains a "Drill point measurements" block; no signature change (it already receives `plan`, `model`, `system`, `heightMm` — `heightMm` is already the *total* height, i.e. `coveredHeightMm + leftoverHeightMm`, per the existing call site in `App.tsx`).

- [ ] **Step 1: Re-export the dimension helpers**

In `src/mounting/index.ts`, add after the existing `export { hardwareMarkers } from './markers';` line:

```ts
export {
  dimensionAxes, assignLanes, laneCount, marginMm, laneChains,
  MIN_GAP_MM, MAX_LANES, LANE_SPACING_MM, BASE_GAP_MM,
} from './dimensions';
export type { DimensionValue } from './dimensions';
```

- [ ] **Step 2: Write the failing tests**

In `src/export/printListText.test.ts`, update the first `formatPrintList` test (`'formats the default plan'`) to include the new block. Replace the `expect(text).toBe([...])` array so the lines read, in order, right after `'Mount files: https://makerworld.com/en/models/861073'`:

```ts
        'Mount files: https://makerworld.com/en/models/861073',
        '',
        'Drill point measurements (mm, from the bottom-left corner)',
        'X: 200, 400, 600, 800, 1000',
        'Y: 200, 400, 600',
        '',
        'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
```

(The plan is 1015x600mm with 1000x600mm covered by a 5x3 grid of 200mm boards, so `colB = [0,200,400,600,800,1000]` and `rowB = [0,200,400,600]`; `heightMm` passed to `formatPrintList` is 600. X drops its own 0 (drawing's left edge); Y is `600 - rowB` = `[600,400,200,0]` flipped and sorted, with its 0 also dropped.)

Then add two new tests at the end of the `describe('formatPrintList', ...)` block:

```ts
  it('lists the drill point measurements from the bottom-left corner', () => {
    const p = plan({ widthMm: 400, heightMm: 400, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 400, heightMm: 400, date, system: wallMounts,
    });
    expect(text).toContain('Drill point measurements (mm, from the bottom-left corner)');
    expect(text).toContain('X: 200, 400');
    expect(text).toContain('Y: 200, 400');
  });

  it('omits the measurements block for a system with no markers', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 200, heightMm: 200, date, system: notedSystem,
    });
    expect(text).not.toContain('Drill point measurements');
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- printListText` — expect the updated snapshot test and the two new tests to fail (the block doesn't exist yet).

- [ ] **Step 4: Implement the export block**

In `src/export/printListText.ts`, change the import line:

```ts
import { hardwareList, hardwareMarkers, dimensionAxes } from '../mounting';
```

Add a new function near `hardwareBlock`:

```ts
function measurementsBlock(plan: Plan, system: MountSystem, model: BoardModel, totalHeightMm: number): string[] {
  const markers = hardwareMarkers(plan, system, model);
  const { x, y } = dimensionAxes(markers, totalHeightMm);
  const nonZero = (values: number[]) => values.filter((v) => v > 0);
  const xVals = nonZero(x);
  const yVals = nonZero(y);
  if (xVals.length === 0 && yVals.length === 0) return [];
  return [
    'Drill point measurements (mm, from the bottom-left corner)',
    `X: ${xVals.map(mm).join(', ')}`,
    `Y: ${yVals.map(mm).join(', ')}`,
  ];
}
```

`measurementsBlock` needs `model: BoardModel` — `formatPrintList` already has it in scope. In `formatPrintList`, change:

```ts
    ...hardwareBlock(plan, system, wallDistanceMm),
    '',
    'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
```

to:

```ts
    ...hardwareBlock(plan, system, wallDistanceMm),
    '',
    ...measurements,
    ...(measurements.length ? [''] : []),
    'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
```

and add, just above the `lines` array declaration:

```ts
  const measurements = measurementsBlock(plan, system, model, heightMm);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- printListText` — expect all pass. Then run `npm test` for the full suite (the `App.test.tsx` `'downloads the print list as text'` and mounting-system tests use `toContain`, not exact match, so they should be unaffected — confirm).

- [ ] **Step 6: Commit**

```bash
git add src/mounting/index.ts src/export/printListText.ts src/export/printListText.test.ts
git commit -m "$(cat <<'EOF'
List drill point measurements in the exported print list

Reuses the same per-axis mm values the dimension overlay will draw,
so the text export and the on-screen drawing never disagree.

Claude-Session: https://claude.ai/code/session_016Pkm9qNY8MobEehHd6zYeS
EOF
)"
```

---

### Task 3: Dimension overlay on the 2D preview

**Files:**
- Modify: `src/ui/Preview.tsx`
- Test: `src/ui/Preview.test.tsx` (new)

**Interfaces:**
- Consumes: `laneChains`, `DimensionValue`, `BASE_GAP_MM`, `LANE_SPACING_MM` from `../mounting` (Task 1); existing `Plan`, `HardwareMarker`, `Viewport` types.
- Produces (consumed by Task 4): `Preview` gains two new props, both optional with defaults so every existing caller keeps working unchanged:
  - `mode?: 'hardware' | 'measurements'` (default `'hardware'`)
  - `origin?: { x: number; y: number }` (default `{ x: 0, y: 0 }`) — an mm offset applied to the whole drawing, for a caller that reserved extra margin around it.
  - Rendered dimension lines/labels carry `data-dim-line`, `data-axis="x" | "y"`, `data-value={mm}` for tests.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/Preview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Preview } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { getMountSystem, hardwareMarkers } from '../mounting';
import type { Viewport } from './viewport';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const viewport: Viewport = { scale: 1, tx: 0, ty: 0 };

describe('Preview measurements mode', () => {
  const p = plan({ widthMm: 400, heightMm: 400, model: skadisInfinity, printer: a1 });
  const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);

  it('draws hardware dots and no dimension lines by default', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} />,
    );
    expect(container.querySelectorAll('[data-marker]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);
  });

  it('draws dimension lines and no hardware dots in measurements mode', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} mode="measurements" />,
    );
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(0);
    const lines = container.querySelectorAll('[data-dim-line]');
    // 400x400 wall-mounts: X = [200, 400], Y = [200, 400] once the origin corner is dropped.
    expect(lines).toHaveLength(4);
  });

  it('labels Y using height from the floor, not raw SVG y', () => {
    const { getByText } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} mode="measurements" />,
    );
    // totalHeightMm is 400; the row boundary at SVG y=0 is 400mm from the floor.
    expect(getByText('400 mm')).toBeTruthy();
    expect(getByText('200 mm')).toBeTruthy();
  });

  it('shifts the drawing by the given origin', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} origin={{ x: 100, y: 0 }} />,
    );
    const board = container.querySelector('[data-board]') as SVGGElement;
    const rect = board.querySelector('rect')!;
    expect(rect.getAttribute('x')).toBe('0'); // board's own mm coords are unaffected
    const outerGroup = container.querySelector('svg > g') as SVGGElement;
    expect(outerGroup.getAttribute('transform')).toContain('translate(100 0)');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- Preview` — expect failures (`mode`/`origin` props don't exist, no `data-dim-line` elements, transform doesn't include the origin translate).

- [ ] **Step 3: Implement the overlay**

In `src/ui/Preview.tsx`:

1. Update imports (`laneChains`, `DimensionValue`, `BASE_GAP_MM`, `LANE_SPACING_MM` are all re-exported from `../mounting`'s index as of Task 2):

```ts
import { laneChains, type DimensionValue, BASE_GAP_MM, LANE_SPACING_MM } from '../mounting';
```

2. Add to the `styles` object (after the existing `tick`/`tickLit`/`tickDim` entries):

```ts
  dimExt: {
    stroke: mixes.vizLine,
    strokeWidth: 1,
    opacity: 0.6,
    pointerEvents: 'none',
  },
  dimLine: {
    stroke: mixes.vizLineStrong,
    strokeWidth: 1,
    pointerEvents: 'none',
  },
  dimTick: {
    stroke: mixes.vizLineStrong,
    strokeWidth: 1.5,
    pointerEvents: 'none',
  },
  dimLabel: {
    fill: colors.text,
    pointerEvents: 'none',
  },
```

3. Add a `DIM_LABEL_PX` constant next to the other `_PX` constants at the top:

```ts
const DIM_LABEL_PX = 11;
```

4. Add these functions above `Preview` (after `MarkerDot`):

```ts
function XDimensionLine({ value, lane, baseY, scale }: { value: number; lane: number; baseY: number; scale: number }) {
  const lineY = baseY + BASE_GAP_MM + (lane + 1) * LANE_SPACING_MM;
  const tick = TICK_PX / 2 / scale;
  const fs = DIM_LABEL_PX / scale;
  return (
    <g data-dim-line data-axis="x" data-value={value}>
      <line {...stylex.props(styles.dimExt)} x1={0} y1={baseY} x2={0} y2={lineY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimExt)} x1={value} y1={baseY} x2={value} y2={lineY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimLine)} x1={0} y1={lineY} x2={value} y2={lineY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={0} y1={lineY - tick} x2={0} y2={lineY + tick} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={value} y1={lineY - tick} x2={value} y2={lineY + tick} vectorEffect="non-scaling-stroke" />
      <text {...stylex.props(styles.dimLabel)} x={value} y={lineY + 14 / scale} fontSize={fs} textAnchor="middle">
        {value} mm
      </text>
    </g>
  );
}

function YDimensionLine({ value, lane, baseY, scale }: { value: number; lane: number; baseY: number; scale: number }) {
  const pointY = baseY - value;
  const lineX = -(BASE_GAP_MM + (lane + 1) * LANE_SPACING_MM);
  const tick = TICK_PX / 2 / scale;
  const fs = DIM_LABEL_PX / scale;
  return (
    <g data-dim-line data-axis="y" data-value={value}>
      <line {...stylex.props(styles.dimExt)} x1={0} y1={baseY} x2={lineX} y2={baseY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimExt)} x1={0} y1={pointY} x2={lineX} y2={pointY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimLine)} x1={lineX} y1={baseY} x2={lineX} y2={pointY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={lineX - tick} y1={baseY} x2={lineX + tick} y2={baseY} vectorEffect="non-scaling-stroke" />
      <line {...stylex.props(styles.dimTick)} x1={lineX - tick} y1={pointY} x2={lineX + tick} y2={pointY} vectorEffect="non-scaling-stroke" />
      <text
        {...stylex.props(styles.dimLabel)}
        x={lineX - 4 / scale}
        y={pointY}
        fontSize={fs}
        textAnchor="end"
        dominantBaseline="middle"
      >
        {value} mm
      </text>
    </g>
  );
}

function DimensionOverlay({
  markers, totalHeightMm, scale,
}: { markers: HardwareMarker[]; totalHeightMm: number; scale: number }) {
  const { x, y } = laneChains(markers, totalHeightMm);
  return (
    <g data-dimensions>
      {x.map((v: DimensionValue) => (
        <XDimensionLine key={`x-${v.mm}`} value={v.mm} lane={v.lane} baseY={totalHeightMm} scale={scale} />
      ))}
      {y.map((v: DimensionValue) => (
        <YDimensionLine key={`y-${v.mm}`} value={v.mm} lane={v.lane} baseY={totalHeightMm} scale={scale} />
      ))}
    </g>
  );
}
```

5. Update the `Preview` function signature and body. Change:

```tsx
export function Preview({
  plan, viewport, width, height, markers, highlight,
}: {
  plan: Plan | null;
  viewport: Viewport;
  width: number;
  height: number;
  markers?: HardwareMarker[];
  highlight?: Highlight | null;
}) {
```

to:

```tsx
export function Preview({
  plan, viewport, width, height, markers, highlight, mode = 'hardware', origin = { x: 0, y: 0 },
}: {
  plan: Plan | null;
  viewport: Viewport;
  width: number;
  height: number;
  markers?: HardwareMarker[];
  highlight?: Highlight | null;
  mode?: 'hardware' | 'measurements';
  origin?: { x: number; y: number };
}) {
```

Change the `showMarkers` computation to gate on `mode === 'hardware'`, and add a `showMeasurements` alongside it (reusing the same board-size legibility check):

```ts
  const minBoardSidePx = plan.boards.length > 0
    ? Math.min(...plan.boards.map((b) => Math.min(b.widthMm, b.heightMm))) * s
    : 0;
  const showMarkers = mode === 'hardware' && !!markers && markers.length > 0 && markers.length <= MAX_MARKERS && minBoardSidePx >= MIN_MARKER_PX;
  const showMeasurements = mode === 'measurements' && !!markers && markers.length > 0 && minBoardSidePx >= MIN_MARKER_PX;
```

Change the outer transform:

```tsx
      <g transform={`translate(${v.tx} ${v.ty}) scale(${s}) translate(${origin.x} ${origin.y})`}>
```

and add the overlay right after the existing `{showMarkers && markers && ( ... )}` block:

```tsx
        {showMeasurements && markers && (
          <DimensionOverlay markers={markers} totalHeightMm={totalH} scale={s} />
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- Preview` then `npm test` for the full suite.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Preview.tsx src/ui/Preview.test.tsx src/mounting/index.ts
git commit -m "$(cat <<'EOF'
Draw a dimension overlay on the 2D preview

Adds a measurements mode to Preview that swaps the hardware dots for
baseline dimension lines along the bottom and left margins, built
from the lane chains added in the previous commits.

Claude-Session: https://claude.ai/code/session_016Pkm9qNY8MobEehHd6zYeS
EOF
)"
```

---

### Task 4: Toggle, margin reservation, and wiring

**Files:**
- Modify: `src/ui/CanvasToolbar.tsx`
- Modify: `src/ui/Canvas.tsx`
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `Preview`'s `mode`/`origin` props (Task 3); `laneChains`, `marginMm` from `../mounting` (Task 1/2).
- Produces: `Canvas` requires two new props (`mode`, `onModeChange`) from its caller (`App`); `CanvasToolbar` requires two new props (`mode`, `onModeChange`).

- [ ] **Step 1: Write the failing tests**

In `src/ui/App.test.tsx`, add:

```tsx
  it('toggles the canvas between hardware markers and measurement dimension lines', () => {
    const { container } = render(<App />);
    expect(container.querySelectorAll('[data-marker]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Measurements' }));
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-dim-line]').length).toBeGreaterThan(0);
    expect(screen.getByText('1000 mm')).toBeTruthy();
    expect(screen.getByText('600 mm')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Measurements' }));
    expect(container.querySelectorAll('[data-marker]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App` — expect failure (no "Measurements" button exists yet).

- [ ] **Step 3: Add the toolbar toggle**

In `src/ui/CanvasToolbar.tsx`, change the function signature:

```tsx
export function CanvasToolbar({
  ratio, onFit, mode, onModeChange, children,
}: {
  ratio: number;
  onFit: () => void;
  mode: 'hardware' | 'measurements';
  onModeChange: (mode: 'hardware' | 'measurements') => void;
  children?: ReactNode;
}) {
```

and add a button after the existing `Fit` button (before the `readout` span):

```tsx
      <button
        type="button"
        aria-label="Measurements"
        aria-pressed={mode === 'measurements'}
        onClick={() => onModeChange(mode === 'measurements' ? 'hardware' : 'measurements')}
        {...stylex.props(styles.button)}
      >
        Measurements
      </button>
```

- [ ] **Step 4: Reserve margin and wire mode through Canvas**

In `src/ui/Canvas.tsx`, update imports:

```ts
import { laneChains, marginMm } from '../mounting';
```

Update the function signature:

```tsx
export function Canvas({
  plan, error, markers, highlight, mode, onModeChange,
}: {
  plan: Plan | null;
  error: string | null;
  markers?: HardwareMarker[];
  highlight?: Highlight | null;
  mode: 'hardware' | 'measurements';
  onModeChange: (mode: 'hardware' | 'measurements') => void;
}) {
```

Replace the `world` computation:

```ts
  const totalW = plan ? plan.coveredWidthMm + plan.leftoverWidthMm : 0;
  const totalH = plan ? plan.coveredHeightMm + plan.leftoverHeightMm : 0;
  const chains = plan && mode === 'measurements' && markers ? laneChains(markers, totalH) : null;
  const marginLeft = chains ? marginMm(chains.y) : 0;
  const marginBottom = chains ? marginMm(chains.x) : 0;
  const world = plan ? { width: totalW + marginLeft, height: totalH + marginBottom } : null;
```

Pass `mode` and `origin` to `Preview`, and `mode`/`onModeChange` to `CanvasToolbar`:

```tsx
          <Preview
            plan={plan}
            viewport={viewport}
            width={size.width}
            height={size.height}
            markers={markers}
            highlight={highlight}
            mode={mode}
            origin={{ x: marginLeft, y: 0 }}
          />
          {plan && <CanvasToolbar ratio={ratio} onFit={refit} mode={mode} onModeChange={onModeChange} />}
```

- [ ] **Step 5: Wire mode state in App**

In `src/ui/App.tsx`, add state near the existing `highlight` state:

```ts
  const [mode, setMode] = useState<'hardware' | 'measurements'>('hardware');
```

Pass it to `Canvas`:

```tsx
      <Canvas
        plan={state.lastPlan}
        error={state.outcome.error}
        markers={markers}
        highlight={highlight}
        mode={mode}
        onModeChange={setMode}
      />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- App` then `npm test` for the full suite. Then `npm run build` to confirm the type check is clean end-to-end.

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open the app in a browser, click "Measurements" on the canvas toolbar, and confirm:
- Hardware dots disappear and dimension lines with mm labels appear along the bottom and left of the board layout.
- Labels are readable at the default zoom and don't overlap (if they do, adjust `MIN_GAP_MM`, `LANE_SPACING_MM`, or `BASE_GAP_MM` in `src/mounting/dimensions.ts`).
- Switching mounting system (Wall mounts vs Screw spacers) updates the dimension lines.
- Toggling back to hardware markers restores the original view.
- Download the print list and confirm the "Drill point measurements" block is present and matches the drawing.

- [ ] **Step 8: Commit**

```bash
git add src/ui/CanvasToolbar.tsx src/ui/Canvas.tsx src/ui/App.tsx src/ui/App.test.tsx
git commit -m "$(cat <<'EOF'
Add a Measurements toggle to the canvas toolbar

Wires the dimension overlay into the app: a toolbar button flips
Canvas into measurements mode, which now reserves extra margin so
the dimension lines have room to draw without clipping.

Claude-Session: https://claude.ai/code/session_016Pkm9qNY8MobEehHd6zYeS
EOF
)"
```
