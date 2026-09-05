# 3D Board View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lazy-loaded 3D view of the planned wall where every board is a generated, slotted pegboard mesh on an interactive grid, behind a 2D / 3D toggle on the preview card.

**Architecture:** A pure `src/boards3d/` module turns a model's hole pattern into board outlines, cached three.js `ExtrudeGeometry` objects, and per-group instance positions from a `Plan`. A React-Three-Fiber scene in `src/ui/three/` renders one instanced mesh per print-list group with a top-down orthographic camera, pan/zoom controls, an optional orbit mode, and a hover label. `PreviewCard` wraps the existing SVG `Preview` and the lazy scene behind a segmented toggle.

**Tech Stack:** three 0.185, @react-three/fiber 9, @react-three/drei 10, @types/three, React 19, StyleX 0.19, Vitest 5 + Testing Library.

Spec: `docs/superpowers/specs/2026-09-05-3d-board-view-design.md`

## Global Constraints

- Work in this worktree only: `/home/vanessa/Projects/3d-planner/.claude/worktrees/3d-view`, branch `worktree-3d-view`. Never `cd` to the main checkout; another session edits it.
- Commit messages: plain sentences, **no conventional-commit prefixes** (`feat:`, `fix:` and "Fix X:" colon subjects are all forbidden). End every commit message with a blank line and then `Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk`.
- Styling is StyleX only (`stylex.create` + `stylex.props`), tokens from `src/ui/tokens.stylex.ts` and `src/ui/mixes.stylex.ts`. No CSS files, no inline `style=` on HTML elements. three.js materials take colours resolved from those tokens at runtime, never a second palette.
- `src/boards3d/` never imports React or anything from `src/ui/`.
- `npm test` runs `vitest run`; `npm run typecheck` runs `tsc --noEmit`; `npm run build` runs both typecheck and `vite build`. All three must pass at the end of every task. Test output must be warning-free.
- Measured Skadis Infinity geometry (verbatim from the spec): size `20 * (holes + 1)` mm, thickness 5 mm, slots 5 × 15 mm vertical centred at `(20 * (col + 1), 20 * (row + 1))` from the board's bottom-left, slot present iff `(col + row)` is odd, four screw holes 10 mm in from each corner with radius 1.5 mm.
- Scene units are mm. Wall top-left is the origin, x right, y up: a solver board at `(xMm, yMm)` is placed at `[xMm, -(yMm + heightMm), 0]`.
- The 3D view is never the default. `2D` (SVG) is the default; three.js loads only when `3D` is selected.

## File Structure

```
package.json                     + three, @react-three/fiber, @react-three/drei, @types/three
src/models/types.ts              + BoardPattern, BoardModel.pattern
src/models/skadisInfinity.ts     + pattern values
src/models/skadisInfinity.test.ts + pattern tests
src/boards3d/outline.ts          boardOutline(): slots + screw holes in mm (pure)
src/boards3d/outline.test.ts
src/boards3d/geometry.ts         buildBoardGeometry(), boardGeometryKey(), getBoardGeometry() cache
src/boards3d/geometry.test.ts
src/boards3d/placement.ts        instancesFor(plan, model): InstanceGroup[]
src/boards3d/placement.test.ts
src/ui/three/tokenColor.ts       varName(), resolveCssColor(), resolveTokenColor() (pure DOM helpers)
src/ui/three/useTokenColor.ts    hook: token var string -> hex, re-resolved on theme change
src/ui/three/tokenColor.test.ts
src/ui/three/useTokenColor.test.ts
src/ui/three/BoardScene.tsx      default export: Canvas, FitCamera, Grid, instanced boards, hover chip, Orbit button
src/ui/PreviewCard.tsx           2D/3D toggle, SceneBoundary, lazy BoardScene
src/ui/PreviewCard.test.tsx
src/ui/Canvas.tsx                wrap the 2D stage in <PreviewCard>; src/ui/App.tsx passes model to Canvas
src/ui/App.test.tsx              + one toggle-present test
README.md                        + 3D view paragraph
```

---

### Task 1: Dependencies and the board pattern on the model

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/models/types.ts`
- Modify: `src/models/skadisInfinity.ts`
- Test: `src/models/skadisInfinity.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface BoardPattern {
    thicknessMm: number;
    slotWidthMm: number;
    slotHeightMm: number;
    isHole(col: number, row: number): boolean;
    screwHoleRadiusMm: number;
    screwInsetMm: number;
  }
  export interface BoardModel { /* existing fields */ pattern: BoardPattern; }
  ```
  `skadisInfinity.pattern` = `{ thicknessMm: 5, slotWidthMm: 5, slotHeightMm: 15, isHole: (col, row) => (col + row) % 2 === 1, screwHoleRadiusMm: 1.5, screwInsetMm: 10 }`.

- [ ] **Step 1: Install dependencies**

The worktree has no `node_modules` yet.

Run:
```bash
npm install
npm install three@0.185.1 @react-three/fiber@9 @react-three/drei@10
npm install -D @types/three@0.185
```
Expected: no peer-dependency errors (fiber 9 and drei 10 both declare React 19 peers). If `@types/three@0.185` does not exist, install `@types/three@latest` and note the version in the report.

- [ ] **Step 2: Write the failing tests**

Append to `src/models/skadisInfinity.test.ts`:
```ts
describe('skadisInfinity pattern', () => {
  it('has slots on a checkerboard where col + row is odd', () => {
    const { pattern } = skadisInfinity;
    expect(pattern.isHole(0, 0)).toBe(false);
    expect(pattern.isHole(1, 0)).toBe(true);
    expect(pattern.isHole(0, 1)).toBe(true);
    expect(pattern.isHole(1, 1)).toBe(false);
    expect(pattern.isHole(2, 3)).toBe(true);
  });

  it('matches the geometry measured from the STL files', () => {
    expect(skadisInfinity.pattern).toMatchObject({
      thicknessMm: 5,
      slotWidthMm: 5,
      slotHeightMm: 15,
      screwHoleRadiusMm: 1.5,
      screwInsetMm: 10,
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/models`
Expected: FAIL, `pattern` is undefined.

- [ ] **Step 4: Implement**

In `src/models/types.ts`, add above `BoardModel`:
```ts
/**
 * Hole pattern used to generate a board's 3D mesh. Coordinates are
 * board-local: origin bottom-left, x right, y up, in mm. Cell (col, row) is
 * centred at (pitchMm * (col + 1), pitchMm * (row + 1)).
 */
export interface BoardPattern {
  thicknessMm: number;
  slotWidthMm: number;
  slotHeightMm: number;
  /** True when the cell at (col, row) has a slot. Indices are 0-based from bottom-left. */
  isHole(col: number, row: number): boolean;
  screwHoleRadiusMm: number;
  /** Distance of each corner screw hole centre from the two nearest edges. */
  screwInsetMm: number;
}
```
and add to `BoardModel`, after `mirrorNote`:
```ts
  /** Geometry used by the 3D view. */
  pattern: BoardPattern;
```

In `src/models/skadisInfinity.ts`, add after `mirrorNote`:
```ts
  pattern: {
    thicknessMm: 5,
    slotWidthMm: 5,
    slotHeightMm: 15,
    isHole: (col, row) => (col + row) % 2 === 1,
    screwHoleRadiusMm: 1.5,
    screwInsetMm: 10,
  },
```

- [ ] **Step 5: Run the full suite, typecheck and build**

Run: `npm test && npm run build`
Expected: all previous tests plus 2 new pass; typecheck clean (the only `BoardModel` literal is `skadisInfinity`; the solver test's `{ ...model, minHoles: 3 }` spread keeps `pattern`). `build` succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/models
git commit -m "Add the board hole pattern to the model and the three.js dependencies

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 2: Board outline

**Files:**
- Create: `src/boards3d/outline.ts`
- Test: `src/boards3d/outline.test.ts`

**Interfaces:**
- Consumes: `BoardModel` (`pitchMm`, `sizeMm`, `pattern`).
- Produces:
  ```ts
  export interface Slot { cxMm: number; cyMm: number; widthMm: number; heightMm: number; }
  export interface ScrewHole { cxMm: number; cyMm: number; radiusMm: number; }
  export interface BoardOutline {
    widthMm: number; heightMm: number; thicknessMm: number;
    slots: Slot[]; screwHoles: ScrewHole[];
  }
  export function boardOutline(cols: number, rows: number, mirrorX: boolean, mirrorY: boolean, model: BoardModel): BoardOutline;
  ```

- [ ] **Step 1: Write the failing tests**

`src/boards3d/outline.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { boardOutline } from './outline';
import { skadisInfinity as model } from '../models/skadisInfinity';

const slotKeys = (cols: number, rows: number, mx = false, my = false) =>
  boardOutline(cols, rows, mx, my, model)
    .slots.map((s) => `${s.cxMm},${s.cyMm}`)
    .sort();

describe('boardOutline', () => {
  it('sizes the board like the solver does', () => {
    const o = boardOutline(11, 11, false, false, model);
    expect(o.widthMm).toBe(240);
    expect(o.heightMm).toBe(240);
    expect(o.thicknessMm).toBe(5);
  });

  it('places one slot per checkerboard cell', () => {
    expect(boardOutline(11, 11, false, false, model).slots).toHaveLength(60);
    expect(boardOutline(8, 8, false, false, model).slots).toHaveLength(32);
    expect(boardOutline(2, 2, false, false, model).slots).toHaveLength(2);
    expect(boardOutline(3, 3, false, false, model).slots).toHaveLength(4);
  });

  it('centres slots on the 20 mm grid, matching the probed STL', () => {
    expect(slotKeys(3, 3)).toEqual(['20,40', '40,20', '40,60', '60,40']);
  });

  it('gives every slot the model slot size', () => {
    for (const s of boardOutline(8, 5, false, false, model).slots) {
      expect(s.widthMm).toBe(5);
      expect(s.heightMm).toBe(15);
      expect(s.cxMm % 20).toBe(0);
      expect(s.cyMm % 20).toBe(0);
    }
  });

  it('adds four corner screw holes inset by 10 mm', () => {
    const o = boardOutline(11, 9, false, false, model);
    expect(o.screwHoles.map((h) => `${h.cxMm},${h.cyMm}`).sort()).toEqual(
      ['10,10', '10,190', '230,10', '230,190'].sort(),
    );
    expect(o.screwHoles.every((h) => h.radiusMm === 1.5)).toBe(true);
  });

  it('mirroring flips the pattern of an even board', () => {
    expect(slotKeys(8, 8, true, false)).not.toEqual(slotKeys(8, 8));
    expect(slotKeys(8, 8, false, true)).not.toEqual(slotKeys(8, 8));
    expect(slotKeys(8, 8, true, true)).toEqual(slotKeys(8, 8)); // two flips cancel
  });

  it('mirroring leaves an odd board unchanged', () => {
    expect(slotKeys(9, 9, true, false)).toEqual(slotKeys(9, 9));
    expect(slotKeys(9, 9, false, true)).toEqual(slotKeys(9, 9));
  });

  it('mirrors only the requested axis on a mixed board', () => {
    // 8 columns (even) x 9 rows (odd): mirror Y changes nothing, mirror X does.
    expect(slotKeys(8, 9, false, true)).toEqual(slotKeys(8, 9));
    expect(slotKeys(8, 9, true, false)).not.toEqual(slotKeys(8, 9));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/boards3d/outline.test.ts`
Expected: FAIL, cannot find module `./outline`.

- [ ] **Step 3: Implement**

`src/boards3d/outline.ts`:
```ts
import type { BoardModel } from '../models/types';

export interface Slot {
  cxMm: number;
  cyMm: number;
  widthMm: number;
  heightMm: number;
}

export interface ScrewHole {
  cxMm: number;
  cyMm: number;
  radiusMm: number;
}

/** Everything needed to cut one board: outer size plus every hole, in mm, origin bottom-left. */
export interface BoardOutline {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  slots: Slot[];
  screwHoles: ScrewHole[];
}

/**
 * Mirroring is applied to the pattern lookup, not to the geometry, so a
 * mirrored board is a normal board with a flipped hole layout.
 */
export function boardOutline(
  cols: number,
  rows: number,
  mirrorX: boolean,
  mirrorY: boolean,
  model: BoardModel,
): BoardOutline {
  const { pitchMm, pattern } = model;
  const widthMm = model.sizeMm(cols);
  const heightMm = model.sizeMm(rows);

  const slots: Slot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const patternCol = mirrorX ? cols - 1 - col : col;
      const patternRow = mirrorY ? rows - 1 - row : row;
      if (!pattern.isHole(patternCol, patternRow)) continue;
      slots.push({
        cxMm: pitchMm * (col + 1),
        cyMm: pitchMm * (row + 1),
        widthMm: pattern.slotWidthMm,
        heightMm: pattern.slotHeightMm,
      });
    }
  }

  const inset = pattern.screwInsetMm;
  const corners: [number, number][] = [
    [inset, inset],
    [widthMm - inset, inset],
    [inset, heightMm - inset],
    [widthMm - inset, heightMm - inset],
  ];
  const screwHoles = corners.map(([cxMm, cyMm]) => ({ cxMm, cyMm, radiusMm: pattern.screwHoleRadiusMm }));

  return { widthMm, heightMm, thicknessMm: pattern.thicknessMm, slots, screwHoles };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/boards3d/outline.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/boards3d/outline.ts src/boards3d/outline.test.ts
git commit -m "Add the board outline generator from the model hole pattern

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 3: Board geometry and cache

**Files:**
- Create: `src/boards3d/geometry.ts`
- Test: `src/boards3d/geometry.test.ts`

**Interfaces:**
- Consumes: `boardOutline`, `BoardOutline` from Task 2; `three`.
- Produces:
  ```ts
  export function buildBoardGeometry(outline: BoardOutline): THREE.BufferGeometry;
  export function boardGeometryKey(cols: number, rows: number, mirrorX: boolean, mirrorY: boolean, modelId: string): string;
  export function getBoardGeometry(cols: number, rows: number, mirrorX: boolean, mirrorY: boolean, model: BoardModel): THREE.BufferGeometry; // cached
  export function clearBoardGeometryCache(): void;
  ```

- [ ] **Step 1: Write the failing tests**

`src/boards3d/geometry.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest';
import { boardOutline } from './outline';
import { buildBoardGeometry, boardGeometryKey, getBoardGeometry, clearBoardGeometryCache } from './geometry';
import { skadisInfinity as model } from '../models/skadisInfinity';

afterEach(() => clearBoardGeometryCache());

describe('buildBoardGeometry', () => {
  it('extrudes a 3x3 board to 80 x 80 x 5 mm with normals', () => {
    const g = buildBoardGeometry(boardOutline(3, 3, false, false, model));
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect([bb.min.x, bb.min.y, bb.min.z]).toEqual([0, 0, 0]);
    expect([bb.max.x, bb.max.y, bb.max.z].map((v) => Math.round(v * 1000) / 1000)).toEqual([80, 80, 5]);
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
    expect(g.getAttribute('normal')).toBeDefined();
  });

  it('has more triangles when there are more holes', () => {
    const small = buildBoardGeometry(boardOutline(3, 3, false, false, model));
    const large = buildBoardGeometry(boardOutline(8, 8, false, false, model));
    expect(large.getAttribute('position').count).toBeGreaterThan(small.getAttribute('position').count);
  });
});

describe('boardGeometryKey', () => {
  it('encodes size, mirror flags and model', () => {
    expect(boardGeometryKey(11, 9, false, false, 'skadis-infinity')).toBe('skadis-infinity:11x9:');
    expect(boardGeometryKey(8, 8, true, false, 'skadis-infinity')).toBe('skadis-infinity:8x8:mx');
    expect(boardGeometryKey(8, 8, true, true, 'skadis-infinity')).toBe('skadis-infinity:8x8:mxmy');
  });
});

describe('getBoardGeometry', () => {
  it('returns the same object for the same key', () => {
    expect(getBoardGeometry(9, 9, false, false, model)).toBe(getBoardGeometry(9, 9, false, false, model));
  });

  it('returns different objects for different mirror flags', () => {
    expect(getBoardGeometry(8, 8, false, false, model)).not.toBe(getBoardGeometry(8, 8, true, false, model));
  });

  it('forgets everything when cleared', () => {
    const before = getBoardGeometry(9, 9, false, false, model);
    clearBoardGeometryCache();
    expect(getBoardGeometry(9, 9, false, false, model)).not.toBe(before);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/boards3d/geometry.test.ts`
Expected: FAIL, cannot find module `./geometry`.

- [ ] **Step 3: Implement**

`src/boards3d/geometry.ts`:
```ts
import * as THREE from 'three';
import type { BoardModel } from '../models/types';
import { boardOutline, type BoardOutline } from './outline';

const CURVE_SEGMENTS = 8;

/** A stadium (rounded slot): two semicircles joined by straight sides. Valid whenever width <= height. */
function slotPath(cxMm: number, cyMm: number, widthMm: number, heightMm: number): THREE.Path {
  const r = widthMm / 2;
  const path = new THREE.Path();
  path.absarc(cxMm, cyMm - heightMm / 2 + r, r, Math.PI, Math.PI * 2, false);
  path.lineTo(cxMm + r, cyMm + heightMm / 2 - r);
  path.absarc(cxMm, cyMm + heightMm / 2 - r, r, 0, Math.PI, false);
  path.closePath();
  return path;
}

function circlePath(cxMm: number, cyMm: number, radiusMm: number): THREE.Path {
  const path = new THREE.Path();
  path.absarc(cxMm, cyMm, radiusMm, 0, Math.PI * 2, false);
  path.closePath();
  return path;
}

/** Board mesh spanning x 0..width, y 0..height, z 0..thickness. */
export function buildBoardGeometry(outline: BoardOutline): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(outline.widthMm, 0);
  shape.lineTo(outline.widthMm, outline.heightMm);
  shape.lineTo(0, outline.heightMm);
  shape.closePath();
  for (const s of outline.slots) shape.holes.push(slotPath(s.cxMm, s.cyMm, s.widthMm, s.heightMm));
  for (const h of outline.screwHoles) shape.holes.push(circlePath(h.cxMm, h.cyMm, h.radiusMm));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: outline.thicknessMm,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  geometry.computeBoundingBox();
  return geometry;
}

export function boardGeometryKey(
  cols: number,
  rows: number,
  mirrorX: boolean,
  mirrorY: boolean,
  modelId: string,
): string {
  return `${modelId}:${cols}x${rows}:${mirrorX ? 'mx' : ''}${mirrorY ? 'my' : ''}`;
}

const cache = new Map<string, THREE.BufferGeometry>();

export function getBoardGeometry(
  cols: number,
  rows: number,
  mirrorX: boolean,
  mirrorY: boolean,
  model: BoardModel,
): THREE.BufferGeometry {
  const key = boardGeometryKey(cols, rows, mirrorX, mirrorY, model.id);
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = buildBoardGeometry(boardOutline(cols, rows, mirrorX, mirrorY, model));
    cache.set(key, geometry);
  }
  return geometry;
}

export function clearBoardGeometryCache(): void {
  for (const geometry of cache.values()) geometry.dispose();
  cache.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/boards3d/geometry.test.ts`
Expected: 6 tests pass, no warnings. If three logs a warning about a degenerate hole, the slot path is wrong: the stadium must start at the bottom semicircle's left point and end at the top semicircle's left point; check `absarc` angles before changing anything else.

- [ ] **Step 5: Commit**

```bash
git add src/boards3d/geometry.ts src/boards3d/geometry.test.ts
git commit -m "Build cached extruded board geometry from outlines

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 4: Instance placement from a plan

**Files:**
- Create: `src/boards3d/placement.ts`
- Test: `src/boards3d/placement.test.ts`

**Interfaces:**
- Consumes: `Plan`, `PlacedBoard` from `src/solver`; `boardGeometryKey` from Task 3; `BoardModel`.
- Produces:
  ```ts
  export interface InstanceGroup {
    key: string;
    cols: number; rows: number; mirrorX: boolean; mirrorY: boolean;
    widthMm: number; heightMm: number;
    positions: [number, number, number][];   // board bottom-left corner, scene units (mm)
    boards: PlacedBoard[];                   // same order as positions
  }
  export function instancesFor(plan: Plan, model: BoardModel): InstanceGroup[];
  ```

- [ ] **Step 1: Write the failing tests**

`src/boards3d/placement.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { instancesFor } from './placement';
import { boardGeometryKey } from './geometry';
import { plan } from '../solver';
import { skadisInfinity as model } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });

describe('instancesFor', () => {
  it('groups the A1-mini 720 x 360 plan into four mirror variants of two boards each', () => {
    const groups = instancesFor(plan({ widthMm: 720, heightMm: 360, model, printer: mini }), model);
    expect(groups).toHaveLength(4);
    for (const g of groups) {
      expect(g.positions).toHaveLength(2);
      expect(g.boards).toHaveLength(2);
      expect(g.key).toBe(boardGeometryKey(g.cols, g.rows, g.mirrorX, g.mirrorY, model.id));
      expect([g.widthMm, g.heightMm]).toEqual([180, 180]);
    }
    const ys = new Set(groups.flatMap((g) => g.positions.map((p) => p[1])));
    const xs = new Set(groups.flatMap((g) => g.positions.map((p) => p[0])));
    expect([...ys].sort((a, b) => a - b)).toEqual([-360, -180]);
    expect([...xs].sort((a, b) => a - b)).toEqual([0, 180, 360, 540]);
    expect(groups.every((g) => g.positions.every((p) => p[2] === 0))).toBe(true);
  });

  it('maps top-down solver coordinates to y-up scene coordinates', () => {
    const [group] = instancesFor(plan({ widthMm: 1000, heightMm: 600, model, printer: a1 }), model);
    expect(group.positions).toHaveLength(15);
    expect(group.positions[0]).toEqual([0, -200, 0]);   // first board: top-left, bottom edge at -200
    expect(group.positions[5]).toEqual([0, -400, 0]);   // second row
    expect(group.positions[14]).toEqual([800, -600, 0]); // last board: bottom-right
    expect(group.boards[14]).toMatchObject({ col: 4, row: 2 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/boards3d/placement.test.ts`
Expected: FAIL, cannot find module `./placement`.

- [ ] **Step 3: Implement**

`src/boards3d/placement.ts`:
```ts
import type { Plan, PlacedBoard } from '../solver';
import type { BoardModel } from '../models/types';
import { boardGeometryKey } from './geometry';

/** Boards that share one geometry, with where each copy goes. */
export interface InstanceGroup {
  key: string;
  cols: number;
  rows: number;
  mirrorX: boolean;
  mirrorY: boolean;
  widthMm: number;
  heightMm: number;
  /** Board bottom-left corner in scene units (mm), one per board. */
  positions: [number, number, number][];
  /** The solver boards, in the same order as `positions`. */
  boards: PlacedBoard[];
}

/**
 * Scene coordinates: the wall's top-left is the origin, x grows right and
 * y grows up. The solver's yMm grows downward, so a board's bottom edge is
 * at -(yMm + heightMm).
 */
export function instancesFor(plan: Plan, model: BoardModel): InstanceGroup[] {
  const groups = new Map<string, InstanceGroup>();
  for (const b of plan.boards) {
    const key = boardGeometryKey(b.cols, b.rows, b.mirrorX, b.mirrorY, model.id);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        cols: b.cols,
        rows: b.rows,
        mirrorX: b.mirrorX,
        mirrorY: b.mirrorY,
        widthMm: b.widthMm,
        heightMm: b.heightMm,
        positions: [],
        boards: [],
      };
      groups.set(key, group);
    }
    group.positions.push([b.xMm, -(b.yMm + b.heightMm), 0]);
    group.boards.push(b);
  }
  return [...groups.values()];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/boards3d/placement.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/boards3d/placement.ts src/boards3d/placement.test.ts
git commit -m "Map a plan to instanced board positions in scene units

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 5: Token colour resolution for three.js

**Files:**
- Create: `src/ui/three/tokenColor.ts`, `src/ui/three/useTokenColor.ts`
- Test: `src/ui/three/tokenColor.test.ts`, `src/ui/three/useTokenColor.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // tokenColor.ts
  export function varName(value: string): string | null;                 // 'var(--x)' -> '--x', else null
  export function resolveCssColor(css: string): string | null;           // any CSS colour -> '#rrggbb' via a 1x1 canvas, null when no 2D context
  export function resolveTokenColor(varValue: string, host: Element): string | null; // probe element + resolveCssColor
  // useTokenColor.ts
  export function useTokenColor(varValue: string, fallback: string): string;  // hex, re-resolved on <html> attribute changes
  ```

Why a canvas: StyleX tokens are `var(--x)` strings whose values are `oklch(...)` or `color-mix(...)`. `getComputedStyle` on a probe element with `color: var(--x)` gives a fully resolved colour, but browsers serialise it as `oklab(...)`/`color(srgb ...)`, which three.js cannot parse. Painting it into a 1×1 canvas and reading the pixel gives plain RGB in every browser. jsdom has no 2D context, so tests mock `getContext`.

- [ ] **Step 1: Write the failing tests**

`src/ui/three/tokenColor.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { varName, resolveCssColor, resolveTokenColor } from './tokenColor';

afterEach(() => vi.restoreAllMocks());

function mockCanvasPixel(rgb: [number, number, number] | null) {
  const ctx = rgb
    ? ({
        fillStyle: '',
        fillRect: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray([...rgb, 255]) }),
      } as unknown as CanvasRenderingContext2D)
    : null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
}

describe('varName', () => {
  it('extracts the custom property name from a var() reference', () => {
    expect(varName('var(--x1abc)')).toBe('--x1abc');
    expect(varName('var(--x1abc, #fff)')).toBe('--x1abc');
  });
  it('returns null for anything else', () => {
    expect(varName('#ffffff')).toBeNull();
    expect(varName('')).toBeNull();
  });
});

describe('resolveCssColor', () => {
  it('reads the painted pixel back as hex', () => {
    mockCanvasPixel([12, 140, 233]);
    expect(resolveCssColor('oklch(0.6 0.2 250)')).toBe('#0c8ce9');
  });
  it('returns null without a 2D context', () => {
    mockCanvasPixel(null);
    expect(resolveCssColor('#0c8ce9')).toBeNull();
  });
});

describe('resolveTokenColor', () => {
  it('resolves through a probe element and leaves no probe behind', () => {
    mockCanvasPixel([255, 0, 0]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(resolveTokenColor('var(--anything)', host)).toBe('#ff0000');
    expect(host.childElementCount).toBe(0);
    host.remove();
  });
  it('returns null for a value that is not a var()', () => {
    expect(resolveTokenColor('#ff0000', document.body)).toBeNull();
  });
});
```

`src/ui/three/useTokenColor.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTokenColor } from './useTokenColor';

afterEach(() => vi.restoreAllMocks());

describe('useTokenColor', () => {
  it('falls back when the colour cannot be resolved', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
    const { result } = renderHook(() => useTokenColor('var(--missing)', '#123456'));
    expect(result.current).toBe('#123456');
  });

  it('uses the resolved colour and re-resolves when <html> attributes change', async () => {
    const pixels: [number, number, number][] = [[1, 2, 3], [4, 5, 6]];
    let calls = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([...pixels[Math.min(calls++, 1)], 255]) }),
    } as never);
    const { result } = renderHook(() => useTokenColor('var(--token)', '#000000'));
    await waitFor(() => expect(result.current).toBe('#010203'));
    document.documentElement.classList.add('theme-probe');
    await waitFor(() => expect(result.current).toBe('#040506'));
    document.documentElement.classList.remove('theme-probe');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/three`
Expected: FAIL, cannot find modules.

- [ ] **Step 3: Implement**

`src/ui/three/tokenColor.ts`:
```ts
/** '--name' from 'var(--name)' or 'var(--name, fallback)'; null otherwise. */
export function varName(value: string): string | null {
  const match = /^\s*var\(\s*(--[^,\s)]+)/.exec(value);
  return match ? match[1] : null;
}

const toHex = (v: number) => v.toString(16).padStart(2, '0');

/**
 * Resolve any CSS colour (including oklch and color-mix) to '#rrggbb' by
 * painting it into a 1x1 canvas. Returns null where canvas 2D is unavailable.
 */
export function resolveCssColor(css: string): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css; // an unparseable value leaves the previous fillStyle in place
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolve a StyleX token value such as 'var(--x1abc)' inside `host`'s
 * cascade. A probe element is attached, read and removed synchronously.
 */
export function resolveTokenColor(varValue: string, host: Element): string | null {
  if (!varName(varValue)) return null;
  const probe = document.createElement('span');
  probe.style.color = varValue;
  host.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return computed ? resolveCssColor(computed) : null;
}
```

`src/ui/three/useTokenColor.ts`:
```ts
import { useEffect, useState } from 'react';
import { resolveTokenColor } from './tokenColor';

/**
 * Hex colour for a StyleX token var string, re-resolved whenever the
 * <html> element's attributes change (that is where the theme class lives).
 */
export function useTokenColor(varValue: string, fallback: string): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    const update = () => setColor(resolveTokenColor(varValue, document.documentElement) ?? fallback);
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [varValue, fallback]);

  return color;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ui/three`
Expected: 8 tests pass, no jsdom "not implemented" noise (the `getContext` mock prevents it). If the second hook test is flaky on the mutation, wrap the class change in `act()` from `@testing-library/react`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/three/tokenColor.ts src/ui/three/tokenColor.test.ts src/ui/three/useTokenColor.ts src/ui/three/useTokenColor.test.ts
git commit -m "Resolve StyleX token colours to hex for the 3D scene

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 6: The 3D scene

**Files:**
- Create: `src/ui/three/BoardScene.tsx`

**Interfaces:**
- Consumes: `getBoardGeometry` (Task 3), `instancesFor`/`InstanceGroup` (Task 4), `useTokenColor` (Task 5), `Plan`/`PlacedBoard`, `BoardModel`, tokens `colors`, `font`, `radius`, `space`, `mixes`.
- Produces: `export default function BoardScene({ plan, model }: { plan: Plan; model: BoardModel }): JSX.Element`.

No unit test: jsdom has no WebGL. Verification is typecheck, build (chunk split) and the Task 8 screenshots.

- [ ] **Step 1: Write the component**

`src/ui/three/BoardScene.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import * as stylex from '@stylexjs/stylex';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Html, Instance, Instances, MapControls } from '@react-three/drei';
import type { Plan, PlacedBoard } from '../../solver';
import type { BoardModel } from '../../models';
import { getBoardGeometry } from '../../boards3d/geometry';
import { instancesFor, type InstanceGroup } from '../../boards3d/placement';
import { useTokenColor } from './useTokenColor';
import { colors, font, radius, space } from '../tokens.stylex';
import { mixes } from '../mixes.stylex';

const styles = stylex.create({
  frame: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 320,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.md,
  },
  orbit: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    zIndex: 1,
    fontSize: font.xs,
    fontWeight: 500,
    color: colors.text,
    backgroundColor: mixes.inputBg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: mixes.border,
      ':hover': mixes.borderHover,
    },
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    cursor: 'pointer',
  },
  orbitActive: {
    color: colors.accent,
    borderColor: colors.accent,
  },
  chip: {
    fontSize: font.xs,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.sm,
    paddingBlock: '2px',
    paddingInline: space.sm,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
});

const CAMERA_DISTANCE = 1000;
const FIT_MARGIN = 1.1;

interface Hover {
  key: string;
  index: number;
}

/** Keeps the orthographic camera framing the wall when the plan or viewport changes. */
function FitCamera({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.zoom = Math.min(size.width / (widthMm * FIT_MARGIN), size.height / (heightMm * FIT_MARGIN));
    camera.position.set(widthMm / 2, -heightMm / 2, CAMERA_DISTANCE);
    camera.lookAt(widthMm / 2, -heightMm / 2, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, widthMm, heightMm]);
  return null;
}

function BoardInstances({
  group,
  model,
  hovered,
  onHover,
  fill,
  hoverFill,
}: {
  group: InstanceGroup;
  model: BoardModel;
  hovered: Hover | null;
  onHover: (h: Hover | null) => void;
  fill: string;
  hoverFill: string;
}) {
  const geometry = useMemo(
    () => getBoardGeometry(group.cols, group.rows, group.mirrorX, group.mirrorY, model),
    [group.cols, group.rows, group.mirrorX, group.mirrorY, model],
  );
  const count = group.positions.length;
  return (
    <Instances key={`${group.key}-${count}`} geometry={geometry} limit={count} range={count}>
      <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0} />
      {group.positions.map((position, i) => (
        <Instance
          key={i}
          position={position}
          color={hovered?.key === group.key && hovered.index === i ? hoverFill : fill}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover({ key: group.key, index: i });
          }}
          onPointerOut={() => onHover(null)}
        />
      ))}
    </Instances>
  );
}

function mirrorLabel(b: PlacedBoard): string | null {
  if (b.mirrorX && b.mirrorY) return 'mirror X+Y';
  if (b.mirrorX) return 'mirror X';
  if (b.mirrorY) return 'mirror Y';
  return null;
}

function HoverChip({ board }: { board: PlacedBoard }) {
  const mirror = mirrorLabel(board);
  return (
    <Html
      position={[board.xMm + board.widthMm / 2, -(board.yMm + board.heightMm / 2), 6]}
      center
      zIndexRange={[10, 0]}
    >
      <div {...stylex.props(styles.chip)}>
        {board.cols}×{board.rows} · {board.widthMm}×{board.heightMm} mm{mirror ? ` · ${mirror}` : ''}
      </div>
    </Html>
  );
}

export default function BoardScene({ plan, model }: { plan: Plan; model: BoardModel }) {
  const [orbit, setOrbit] = useState(false);
  const [hovered, setHovered] = useState<Hover | null>(null);
  const groups = useMemo(() => instancesFor(plan, model), [plan, model]);

  const fill = useTokenColor(mixes.vizFillDim, '#3a3a3a');
  const hoverFill = useTokenColor(colors.accent, '#0c8ce9');
  const gridCell = useTokenColor(mixes.vizGrid, '#2a2a2a');
  const gridSection = useTokenColor(mixes.vizLineStrong, '#6b6b6b');

  const widthMm = plan.coveredWidthMm;
  const heightMm = plan.coveredHeightMm;
  const hoveredBoard = hovered ? (groups.find((g) => g.key === hovered.key)?.boards[hovered.index] ?? null) : null;

  return (
    <div {...stylex.props(styles.frame)}>
      <button
        type="button"
        aria-pressed={orbit}
        {...stylex.props(styles.orbit, orbit && styles.orbitActive)}
        onClick={() => setOrbit((o) => !o)}
      >
        Orbit
      </button>
      <Canvas
        orthographic
        dpr={[1, 2]}
        camera={{ position: [widthMm / 2, -heightMm / 2, CAMERA_DISTANCE], zoom: 1, near: 0.1, far: 5000 }}
        onPointerMissed={() => setHovered(null)}
      >
        <FitCamera widthMm={widthMm} heightMm={heightMm} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[-widthMm, heightMm, 800]} intensity={1.2} />
        <Grid
          position={[widthMm / 2, -heightMm / 2, -0.5]}
          rotation={[Math.PI / 2, 0, 0]}
          args={[widthMm * 4, heightMm * 4]}
          cellSize={20}
          cellThickness={0.6}
          cellColor={gridCell}
          sectionSize={100}
          sectionThickness={1}
          sectionColor={gridSection}
          fadeDistance={20000}
          fadeStrength={0.5}
          infiniteGrid
          side={THREE.DoubleSide}
        />
        {groups.map((group) => (
          <BoardInstances
            key={group.key}
            group={group}
            model={model}
            hovered={hovered}
            onHover={setHovered}
            fill={fill}
            hoverFill={hoverFill}
          />
        ))}
        {hoveredBoard && <HoverChip board={hoveredBoard} />}
        <MapControls
          makeDefault
          target={[widthMm / 2, -heightMm / 2, 0]}
          enableRotate={orbit}
          enableDamping
          dampingFactor={0.15}
          screenSpacePanning
        />
      </Canvas>
    </div>
  );
}
```

Notes for the implementer:
- drei's `Grid` draws in its local XZ plane; the `rotation={[Math.PI / 2, 0, 0]}` puts it in the wall's XY plane just behind the boards.
- The material colour is white so each `Instance`'s `color` shows unmodified; that is how a single hovered board turns accent.
- If a StyleX value is rejected by the compiler, adjust to the nearest valid StyleX form and note it in the report. Never fall back to inline styles.

- [ ] **Step 2: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: clean. `build` emits the main bundle plus, after Task 7 introduces the lazy import, a separate chunk; for now just confirm it compiles. If drei prop names differ from the above in the installed version (check `node_modules/@react-three/drei/core/Grid.d.ts`, `Instances.d.ts`, `MapControls.d.ts`), use the installed names and note the change in the report.

- [ ] **Step 3: Commit**

```bash
git add src/ui/three/BoardScene.tsx
git commit -m "Add the react-three-fiber board scene with instanced boards and hover labels

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 7: Preview card with the 2D / 3D toggle

Context after merging `main`: `src/ui/App.tsx` renders `<Canvas plan error />` and a `<Panel>`; `src/ui/Canvas.tsx` is a fixed full-viewport `<main>` with a `SummaryChip` top-left and an absolutely positioned, flex-centred `stage` div that renders `<Preview plan={plan} />`. Another session keeps adding 2D pan/zoom inside `Preview` and the stage; this task must not restructure either. `PreviewCard` therefore takes the 2D stage content as `children` and only wraps it.

**Files:**
- Create: `src/ui/PreviewCard.tsx`
- Test: `src/ui/PreviewCard.test.tsx`
- Modify: `src/ui/Canvas.tsx` (accept `model`, wrap the stage content)
- Modify: `src/ui/App.tsx` (pass `model` to `Canvas`)
- Modify: `src/ui/App.test.tsx` (+1 test)

**Interfaces:**
- Consumes: `Preview` (existing), `BoardScene` default export (Task 6, lazy), `Plan`, `BoardModel`, tokens `colors`, `font`, `radius`, `space`, `mixes`.
- Produces: `export function PreviewCard({ plan, model, children }: { plan: Plan | null; model: BoardModel; children: ReactNode }): JSX.Element | null` — renders `children` in 2D mode, the lazy scene in 3D mode, nothing without a plan.
- `Canvas` gains a required `model: BoardModel` prop.

- [ ] **Step 1: Write the failing tests**

`src/ui/PreviewCard.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewCard } from './PreviewCard';
import { Preview } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const mockState = vi.hoisted(() => ({ shouldThrow: false }));

vi.mock('./three/BoardScene', () => ({
  default: ({ plan }: { plan: { boards: unknown[] } }) => {
    if (mockState.shouldThrow) throw new Error('WebGL unavailable');
    return <div data-testid="board-scene">{plan.boards.length} boards in 3D</div>;
  },
}));

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });

const renderCard = (plan: typeof p | null) =>
  render(
    <PreviewCard plan={plan} model={skadisInfinity}>
      <Preview plan={plan} />
    </PreviewCard>,
  );

afterEach(() => {
  mockState.shouldThrow = false;
  vi.restoreAllMocks();
});

describe('PreviewCard', () => {
  it('renders nothing without a plan', () => {
    const { container } = renderCard(null);
    expect(container.firstChild).toBeNull();
  });

  it('shows the 2D children by default with 2D selected', () => {
    const { container } = renderCard(p);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('radio', { name: '2D' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '3D' }).getAttribute('aria-checked')).toBe('false');
  });

  it('switches to the lazy 3D scene and back', async () => {
    const { container } = renderCard(p);
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByTestId('board-scene')).toBeTruthy();
    expect(screen.getByText('15 boards in 3D')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '2D' }));
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByTestId('board-scene')).toBeNull();
  });

  it('falls back to a message and a way back to 2D when the scene fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockState.shouldThrow = true;
    const { container } = renderCard(p);
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByText('3D view is not available in this browser.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to 2D' }));
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
```

Append to `src/ui/App.test.tsx` inside the existing `describe('App')`:
```tsx
  it('offers a 2D / 3D preview toggle', () => {
    render(<App />);
    expect(screen.getByRole('radio', { name: '2D' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3D' })).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/PreviewCard.test.tsx src/ui/App.test.tsx`
Expected: PreviewCard tests fail on a missing module; the new App test fails on a missing radio.

- [ ] **Step 3: Implement PreviewCard**

`src/ui/PreviewCard.tsx`:
```tsx
import { Component, lazy, Suspense, useState, type ErrorInfo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import type { BoardModel } from '../models';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const BoardScene = lazy(() => import('./three/BoardScene'));

type View = '2d' | '3d';

const styles = stylex.create({
  card: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    width: '100%',
    height: '100%',
  },
  toggle: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    zIndex: 2,
    display: 'inline-flex',
    padding: '2px',
    backgroundColor: mixes.inputBg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.lg,
  },
  option: {
    fontSize: font.xs,
    fontWeight: 500,
    color: colors.muted,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: radius.md,
    paddingBlock: space.xs,
    paddingInline: space.md,
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
  },
  optionActive: {
    color: colors.text,
    backgroundColor: colors.surface,
  },
  notice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.lg,
    fontSize: font.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.lg,
    margin: 0,
  },
  noticeText: {
    margin: 0,
  },
  noticeButton: {
    height: '28px',
    fontSize: font.sm,
    fontWeight: 500,
    color: colors.text,
    backgroundColor: { default: mixes.inputBg, ':hover': colors.mutedBg },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: mixes.border, ':hover': mixes.borderHover },
    borderRadius: radius.lg,
    paddingInline: space.md,
    cursor: 'default',
  },
  loading: {
    fontSize: font.sm,
    color: colors.muted,
    margin: 0,
  },
});

interface SceneBoundaryProps {
  onBack: () => void;
  children: ReactNode;
}

/** Catches WebGL/canvas failures from the lazy scene so the whole app does not blank. */
class SceneBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('3D view failed to render:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div {...stylex.props(styles.notice)}>
          <p {...stylex.props(styles.noticeText)}>3D view is not available in this browser.</p>
          <button type="button" {...stylex.props(styles.noticeButton)} onClick={this.props.onBack}>
            Back to 2D
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PreviewCard({
  plan,
  model,
  children,
}: {
  plan: Plan | null;
  model: BoardModel;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>('2d');
  if (!plan) return null;

  const option = (value: View, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={view === value}
      {...stylex.props(styles.option, view === value && styles.optionActive)}
      onClick={() => setView(value)}
    >
      {label}
    </button>
  );

  return (
    <div {...stylex.props(styles.card)}>
      <div role="radiogroup" aria-label="Preview mode" {...stylex.props(styles.toggle)}>
        {option('2d', '2D')}
        {option('3d', '3D')}
      </div>
      {view === '2d' ? (
        children
      ) : (
        <div {...stylex.props(styles.scene)}>
          <SceneBoundary onBack={() => setView('2d')}>
            <Suspense fallback={<p {...stylex.props(styles.loading)}>Loading 3D…</p>}>
              <BoardScene plan={plan} model={model} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire into Canvas and App**

In `src/ui/Canvas.tsx`:
- add `import type { BoardModel } from '../models';` and `import { PreviewCard } from './PreviewCard';`
- change the signature to `export function Canvas({ plan, error, model }: { plan: Plan | null; error: string | null; model: BoardModel })`
- replace `<Preview plan={plan} />` inside the stage with:
  ```tsx
  <PreviewCard plan={plan} model={model}>
    <Preview plan={plan} />
  </PreviewCard>
  ```
  Leave the stage's own styles and everything else in the file untouched.

In `src/ui/App.tsx`: `model` is already computed (`const model = getModel(state.form.modelId)`); change the Canvas element to `<Canvas plan={state.lastPlan} error={state.outcome.error} model={model} />`. Nothing else in App changes.

- [ ] **Step 5: Run tests, typecheck, build**

Run: `npm test && npm run build`
Expected: all tests pass with no warnings (the failing-scene test silences its expected console.error). `vite build` output lists a separate chunk containing three (something like `BoardScene-*.js`, several hundred KB) besides the main bundle; the main bundle must stay close to its previous size (about 210 kB). Record both chunk sizes in the report.

- [ ] **Step 6: Commit**

```bash
git add src/ui/PreviewCard.tsx src/ui/PreviewCard.test.tsx src/ui/Canvas.tsx src/ui/App.tsx src/ui/App.test.tsx
git commit -m "Add a 2D / 3D preview toggle that lazy-loads the board scene

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```

---

### Task 8: Screenshot check, README and spec touch-up

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-05-3d-board-view-design.md` (one paragraph)
- Modify: any `src/ui/three/*.tsx` only for visual breakage found here

- [ ] **Step 1: Take headless screenshots of the 3D view**

Playwright's Chromium is cached under `~/.cache/ms-playwright`. Set up a throwaway folder inside the worktree that git ignores:
```bash
mkdir -p .superpowers/shots-3d && cd .superpowers && npm init -y >/dev/null && npm i playwright
```
If launching fails because the browser for that Playwright version is missing, run `npx playwright install chromium` once (about 150 MB) rather than hunting for a matching version.
Start the dev server in the background from the worktree root (`npm run dev > .superpowers/dev.log 2>&1 &`), wait for `curl -s http://localhost:5173/` to return HTML (Vite picks the next port if 5173 is busy; read the port from `dev.log`).

Write `.superpowers/shots.mjs` that launches Chromium with
`args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']`, viewport 1280×900, and saves:
1. `1-default-3d.png`: open the page, click the `3D` radio, wait 1500 ms.
2. `2-mini-hover.png`: select printer `Bambu Lab A1 mini`, set Width 720 and Height 360, click `3D`, wait, move the mouse over the second board from the left in the top row (about 40% across the canvas, 35% down), wait 500 ms.
3. `3-orbit.png`: click `Orbit`, drag from the canvas centre 150 px right and 80 px down with the left button, wait 500 ms.
4. `4-light-theme.png`: if the page has a theme control, switch to light and take the default 3D view; otherwise skip and say so.

Kill the dev server afterwards. Open each PNG with the Read tool and check:
- boards show real slots in a checkerboard, four corner holes, and slight depth shading;
- in shot 2 the mirrored boards' slot pattern is visibly offset from their neighbours, and the hover chip reads `8×8 · 180×180 mm · mirror X`;
- the grid is visible but quieter than the boards; the Orbit button is legible; nothing overflows the card;
- shot 3 shows a tilted wall.

If WebGL fails under SwiftShader, retry with `--use-gl=angle --use-angle=swiftshader`; if it still fails, report the exact console error and mark the scenarios as not verified.

- [ ] **Step 2: Fix real visual breakage only**

Typical fixes, all in `src/ui/three/BoardScene.tsx`: grid invisible (adjust `fadeDistance`/`fadeStrength` or the `-0.5` z offset), boards too dark under the light (raise `ambientLight` to 0.9), chip hidden behind the canvas (`zIndexRange`). Do not restyle for taste. Re-run the affected screenshot after each fix.

- [ ] **Step 3: README and spec**

Append to `README.md` after the "Run" section:
```markdown
## 3D view

The preview card has a `2D / 3D` toggle. The 3D view generates every board
as a real slotted mesh from the model's `pattern` (slot size, checkerboard
rule, screw holes) and renders them with react-three-fiber, one instanced
mesh per board size. Nothing is downloaded: the MakerWorld STL files are not
redistributable, so the geometry is rebuilt from measured rules instead.
Pan and zoom with the mouse; `Orbit` enables rotation.
```

In the spec `docs/superpowers/specs/2026-09-05-3d-board-view-design.md`, replace the "Token colours" paragraph body with:
```markdown
StyleX `defineVars` values are strings like `var(--x1abc)`. `resolveTokenColor`
attaches a probe element with `color: var(--x1abc)` to the document, reads
its computed colour, and paints that into a 1×1 canvas to get plain RGB
(browsers serialise resolved `oklch`/`color-mix` colours in forms three.js
cannot parse). `useTokenColor` returns the hex string and re-resolves when
the `<html>` element's attributes change (theme switch). Falls back to the
given colour where canvas 2D is unavailable (tests).
```

- [ ] **Step 4: Final verification and commit**

Run: `npm test && npm run build`
Expected: all green.

```bash
git add README.md docs/superpowers/specs/2026-09-05-3d-board-view-design.md src/ui/three
git commit -m "Document the 3D view and record the screenshot check

Claude-Session: https://claude.ai/code/session_011cMSdbJ468E93M9nVBmTnk"
```
