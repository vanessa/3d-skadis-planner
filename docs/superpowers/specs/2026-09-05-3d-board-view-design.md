# 3D board view — design

Date: 2026-09-05
Status: approved for planning
Builds on: `2026-09-05-skadis-board-planner-design.md`

## Goal

Add an optional 3D view of the planned wall: every board rendered as a real
slotted pegboard mesh on an interactive grid, generated in the browser from
the model's hole pattern. No STL files are shipped or downloaded (the
MakerWorld files carry a Standard Digital File License that forbids
redistribution). The SVG preview stays the default; the 3D view is a toggle.

## Facts measured from the author's STL files (2026-09-05)

Probed with raycasts on `11 x 11.stl`, `8 x 8.stl`, `15 x 15.stl`, `2 x 2.stl`:

- Board outer size is exactly `20 * (holes + 1)` mm per axis, thickness 5.0 mm.
- Slots are 5 mm wide, 15 mm tall, vertical, centred at
  `x = 20 * (col + 1)`, `y = 20 * (row + 1)` measured from the board's
  bottom-left corner.
- A slot exists only where `(col + row)` is odd (checkerboard). Mirroring a
  board with an even count flips the pattern; an odd count is unchanged.
  This matches the author's mirroring rules in the planner spec.
- Four screw holes, 10 mm in from each corner, 3 mm through-hole (radius
  1.5) with a 7 mm countersink on the face. The countersink cone is not
  modelled in v1.

## Decisions

| Topic | Decision |
|---|---|
| Geometry source | Generated from the model's pattern. Real STL import is out of scope. |
| Placement in UI | A `2D / 3D` segmented toggle on the preview card. 2D (SVG) is the default. three.js code is lazy-loaded on the first switch. |
| Camera | Orthographic, top-down, pan and zoom. An `Orbit` toggle enables rotation. |
| Mirrored boards | Generated as flipped patterns, never negative scale, so instancing renders correctly. |
| Rendering | One instanced mesh per print-list group `(cols, rows, mirrorX, mirrorY)`. |
| Colours | Resolved from the StyleX tokens at runtime, no second palette. Accent only on hover. |
| Dependencies | `three`, `@react-three/fiber` 9, `@react-three/drei` 10, `@types/three`. |
| Out of scope | STL import, countersink cone, export, measurements, mobile touch tuning. |

## Architecture

```
src/
  models/types.ts        BoardModel gains `pattern: BoardPattern`
  models/skadisInfinity.ts  supplies the Skadis pattern values
  boards3d/              pure geometry, no React
    outline.ts           boardOutline(): slots and screw holes in mm
    geometry.ts          buildBoardGeometry() + cache -> THREE.ExtrudeGeometry
    placement.ts         instancesFor(plan): per-group instance positions
    limits.ts            MAX_3D_BOARDS, re-exported from placement.ts;
                          does not import three, so PreviewCard can read
                          it without pulling three into the eager bundle
  ui/
    PreviewCard.tsx      2D/3D toggle, lazy-loads BoardScene
    three/BoardScene.tsx Canvas, camera, controls, grid, instanced boards, hover label
    three/useTokenColor.ts  resolves a StyleX var string to a hex colour
```

`boards3d` depends on `models` and `solver` types and on `three` (except
`limits.ts`, which has no dependencies). It never imports React. `ui/three`
depends on `boards3d`, react-three-fiber and drei. `ui/PreviewCard.tsx`
depends on `boards3d/limits` only, not `boards3d/placement` or `three` —
importing the board-count cap must not pull three.js into the eager
(non-lazy) bundle. `Canvas.tsx` wraps its 2D input surface in `PreviewCard`;
`App.tsx` only passes `model` to `Canvas` — it does not render `PreviewCard`
directly.

### Model extension (`src/models/types.ts`)

```ts
export interface BoardPattern {
  thicknessMm: number;           // 5
  slotWidthMm: number;           // 5
  slotHeightMm: number;          // 15
  /** True when the cell at (col, row) has a slot. Indices are 0-based from bottom-left. */
  isHole(col: number, row: number): boolean;   // (col + row) % 2 === 1
  screwHoleRadiusMm: number;     // 1.5
  screwInsetMm: number;          // 10, from each edge
}

export interface BoardModel {
  // ...existing fields...
  pattern: BoardPattern;
}
```

### Outline (`src/boards3d/outline.ts`)

```ts
export interface Slot { cxMm: number; cyMm: number; widthMm: number; heightMm: number; }
export interface ScrewHole { cxMm: number; cyMm: number; radiusMm: number; }
export interface BoardOutline {
  widthMm: number; heightMm: number; thicknessMm: number;
  slots: Slot[];
  screwHoles: ScrewHole[];
}
export function boardOutline(
  cols: number, rows: number, mirrorX: boolean, mirrorY: boolean, model: BoardModel,
): BoardOutline;
```

Coordinates are board-local: origin bottom-left, x right, y up, mm.
Slot centre for cell `(col, row)` is `(pitch * (col + 1), pitch * (row + 1))`.
Mirroring maps `col -> cols - 1 - col` (X) and `row -> rows - 1 - row` (Y)
before calling `isHole`. Screw holes sit at `inset` and `size - inset` on
both axes.

### Geometry (`src/boards3d/geometry.ts`)

```ts
export function buildBoardGeometry(outline: BoardOutline): THREE.BufferGeometry;
export function boardGeometryKey(cols, rows, mirrorX, mirrorY, modelId): string;
export function getBoardGeometry(cols, rows, mirrorX, mirrorY, model): THREE.BufferGeometry; // cached
```

`buildBoardGeometry` makes a `THREE.Shape` for the outer rectangle, adds one
`THREE.Path` hole per slot (rounded rectangle, corner radius `width / 2`,
8 curve segments) and per screw hole (circle), then
`new THREE.ExtrudeGeometry(shape, { depth: thicknessMm, bevelEnabled: false, curveSegments: 8 })`.
The result spans `x 0..width`, `y 0..height`, `z 0..thickness` with normals
computed. Cache is a module-level `Map` keyed by `boardGeometryKey`.

### Placement (`src/boards3d/placement.ts`)

```ts
export interface InstanceGroup {
  key: string;                     // boardGeometryKey
  cols: number; rows: number; mirrorX: boolean; mirrorY: boolean;
  widthMm: number; heightMm: number;
  positions: [x: number, y: number, z: number][];   // one per board, board bottom-left corner
  boards: PlacedBoard[];           // same order as positions, for hover labels
}
export function instancesFor(plan: Plan, model: BoardModel): InstanceGroup[];
```

Scene units are mm. The wall's top-left is the origin; x grows right and y
grows up, so a board at solver `(xMm, yMm)` (top-down) is placed at
`[xMm, -(yMm + heightMm), 0]`. The wall occupies `x 0..W`, `y -H..0`.

### Scene (`src/ui/three/BoardScene.tsx`)

Default export `BoardScene({ plan, model }: { plan: Plan; model: BoardModel })`.

- `<Canvas orthographic>` fills the stage box that `PreviewCard` owns
  (`stageLayout.stage`, `100%`/`100%` of that box), not a fixed `60vh`.
  Camera at `[W/2, -H/2, 1000]` looking at the wall centre; `FitCamera`
  sets the initial zoom to fit the wall with a 10% margin (`FIT_MARGIN`
  1.1), refits on plan size or viewport change, and also resets the
  controls target to the wall centre on every refit. `frameloop="demand"`:
  the canvas only re-renders on prop/state changes and on drei
  `MapControls`' own `invalidate()` calls (see the controls bullet below).
- drei `MapControls` for pan and zoom; `enableRotate` follows the `Orbit`
  toggle (a small button overlaid top-right of the canvas). Damping on.
  `rotateSpeed` 0.3 (slower than the default 1). The camera sits on +Z
  with `up` = +Y, so head-on (looking straight at the wall) is polar
  angle `0.5 * Math.PI`, not 0. The polar angle is clamped to
  `minPolarAngle={Math.PI * 0.25}` / `maxPolarAngle={Math.PI * 0.75}`, a
  band around that head-on `0.5π`, so the wall cannot be tilted past
  about 45° either way (and true edge-on, polar 0 or π, is unreachable).
  With `Orbit` on, the LEFT mouse button rotates and RIGHT pans; with it
  off the mapping is swapped back (LEFT pans, RIGHT rotates).
- drei `Grid` on the wall plane behind the boards: `cellSize 20`,
  `sectionSize 100`, `fadeDistance` large, colours from tokens (`border` for
  cells, `muted` for sections), `infiniteGrid`.
- Lighting: `ambientLight` 3 plus one `directionalLight` 2 from top-left
  front (three r155+ physically based light units; these values put the 3D
  board fill within a few percent of the 2D view's token fill in both
  themes) so slot walls read as depth.
- One drei `<Instances>` per `InstanceGroup`, geometry from
  `getBoardGeometry`, a white `MeshStandardMaterial` (`roughness 0.9`)
  overridden per instance by each `<Instance>`'s own `color` prop: token
  `vizFillDim` normally, token `accent` when hovered. Each `<Instance>`
  sets `position` and its own `onPointerOver`/`onPointerOut` handlers.
  Hover state is `{ key, index } | null` in component state, set from
  those per-`Instance` pointer events (not `event.instanceId`, since each
  board is its own `<Instance>` element). Hover clears whenever the plan
  changes, so a highlight from a previous plan cannot linger after boards
  are regenerated, and also clears on `onPointerMissed`.
- Hover label: drei `<Html>` at the hovered board's centre, StyleX-styled
  chip: `11×11 · 240×240 mm` plus `mirror X` / `mirror Y` / `mirror X+Y`
  when set.
- Leftover strips are not drawn in 3D; the summary line already reports them.

### Token colours (`src/ui/three/useTokenColor.ts`)

StyleX `defineVars` values are strings like `var(--x1abc)`. `resolveTokenColor`
attaches a probe element with `color: var(--x1abc)` to the document, reads
its computed colour, and paints that into a 1×1 canvas to get plain RGB
(browsers serialise resolved `oklch`/`color-mix` colours in forms three.js
cannot parse). `useTokenColor` returns the hex string and re-resolves when
the `<html>` element's attributes change (theme switch). Falls back to the
given colour where canvas 2D is unavailable (tests).

### Preview card (`src/ui/PreviewCard.tsx`)

```tsx
export function PreviewCard({ plan, model, children }: { plan: Plan | null; model: BoardModel; children: ReactNode })
```

- Renders nothing without a plan.
- `PreviewCard` renders the stage box itself (`stageLayout.stage`) rather
  than being placed inside one by its caller. `Canvas.tsx` renders
  `<PreviewCard plan={plan} model={model}>` and wraps its 2D input
  surface (the pan/zoom SVG stage, with its own drag handlers and the
  `CanvasToolbar`) as `children`; `App.tsx` never references
  `PreviewCard` directly — it only renders `<Canvas plan={...} error={...}
  model={...} />`, so `model` is the one piece of 3D-view wiring visible
  at that level.
- Header row: a segmented control with `2D` and `3D` buttons
  (`role="radiogroup"`, `aria-checked`), StyleX-styled. Selection is
  local state, default `2D`. The active pill is plain text on the
  surface colour with a border ring (`boxShadow: 0 0 0 1px border`), not
  the accent colour.
- `2D` renders `children` (the caller's 2D surface) inside a
  `<Fragment key="2d">`; `3D` renders its wrapper with `key="3d"`, so
  React never reuses a DOM node when switching modes — each switch is a
  fresh mount.
- `3D`, when `plan.boards.length` is at or below `MAX_3D_BOARDS` (2000,
  exported from `boards3d/placement.ts`), renders
  `<Suspense fallback={<p>Loading 3D…</p>}><BoardScene/></Suspense>`
  where `BoardScene = React.lazy(() => import('./three/BoardScene'))`.
  Above that count it renders a limit notice instead (see Errors) and
  never imports `three` or `BoardScene`. The scene wrapper is
  flex-centred so the Suspense fallback, the limit notice and the
  failure notice all sit in the middle of the stage.

### Errors

WebGL unavailable: react-three-fiber throws on `Canvas` creation; the
existing `ErrorBoundary` around the app would blank the page. `PreviewCard`
wraps the 3D branch in its own small error boundary that shows
`3D view is not available in this browser.` and a button back to `2D`.

Too many boards: above `MAX_3D_BOARDS` (2000) boards, `PreviewCard` shows
`The 3D view is limited to 2000 boards; this plan has N.` with a `Back to
2D` button, in the same notice card style as the WebGL fallback, instead
of loading the scene at all — building and hovering thousands of instanced
meshes would stall the browser well before rendering.

## Coordination

Another session is restyling `src/ui` toward the toolcraft direction on
`main`. This feature lives on branch `worktree-3d-view`. New files do not
conflict; the only shared edits are `Canvas.tsx` wrapping its 2D surface in
`PreviewCard` (passing `model` through from `App.tsx`) and the new `pattern`
field in `models/types.ts` and `skadisInfinity.ts`. Merge after the restyle
lands and re-run the screenshot check.

## Testing

Vitest, `npm test`.

- `boards3d/outline.test.ts`: slot count `11×11 → 60`, `8×8 → 32`,
  `2×2 → 2`; every slot is 5×15; slot centres on the 20 mm grid; bounds equal
  `model.sizeMm`; four screw holes at inset 10, radius 1.5; mirrorX flips the
  pattern of an even board (slot set differs) and leaves an odd board's
  slot set identical; mirrorY likewise.
- `boards3d/geometry.test.ts`: `buildBoardGeometry` on a `3×3` outline has
  a bounding box of `80×80×5`, a position attribute, and normals; the cache
  returns the same object for the same key and different objects for
  different mirror flags on an even board.
- `boards3d/placement.test.ts`: for the 720×360 A1-mini plan, four groups
  with two positions each, `y` values `-180` and `-360`, `x` values
  `0, 180, 360, 540`; group keys match `boardGeometryKey`.
- `ui/PreviewCard.test.tsx`: default shows the SVG; clicking `3D` renders
  the mocked scene (`vi.mock('./three/BoardScene')`); clicking `2D` returns
  to the SVG. jsdom has no WebGL, so the real scene is not rendered in tests.
- `ui/three/useTokenColor.test.ts`: resolves a var set on a container to a
  `THREE.Color`; falls back to grey when unset.
- Manual: headless Chromium (Playwright, `--use-angle=swiftshader`)
  screenshots of the default plan in 3D, the A1-mini mirrored plan hovered,
  and orbit enabled; check slots are visible, mirrored boards show a flipped
  pattern, and the hover chip reads correctly.

## Extending later

- Real STL per size: a drop zone parses files client-side and swaps the
  cached geometry for that key. `getBoardGeometry` is the seam.
- Countersinks: add a lathe or cone subtraction in `buildBoardGeometry`.
- Wall context (studs, mounting spacers): further instanced meshes placed
  from `InstanceGroup` data.
