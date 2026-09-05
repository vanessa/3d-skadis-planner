# Canvas pan and zoom — design

Date: 2026-09-05
Status: approved for planning
Builds on: `2026-09-05-toolcraft-design-port-design.md` (layout) and
`2026-09-05-skadis-board-planner-design.md` (behaviour, unchanged)

## Goal

Let the user zoom into and pan around the 2D preview on the canvas, the way
a design tool's canvas works: wheel zooms around the cursor, dragging pans,
a Fit control (and double-click) refits the wall to the stage. Labels stay
at screen size while zooming. Behaviour of the planner does not change.

The 3D view being built on branch `worktree-3d-view` has its own camera
controls (drei `MapControls`). This spec only covers the 2D SVG view, and
introduces a canvas toolbar where the 3D view's `2D / 3D` toggle can sit.

## Decisions

| Topic | Decision |
|---|---|
| Model | A viewport `{ scale, tx, ty }`: `scale` in screen px per mm, `tx`/`ty` the screen position of the wall's top-left corner, relative to the stage. |
| Fit | Scale so the whole wall (covered + leftover) fits the stage with a 24 px margin, centred. Fit is the initial state, and is re-applied whenever the wall size or the stage size changes while the view is still "fitted". |
| Zoom | Mouse wheel and trackpad scroll zoom around the cursor. Range: 0.5× to 16× of the fit scale. Ctrl/⌘+wheel (browser pinch) is captured too so the page never browser-zooms; its small deltas are scaled ×10 so a pinch feels like a pinch. |
| Pan | Pointer drag on the stage (mouse or single touch). Cursor `grab`, `grabbing` while dragging. |
| Refit | Double-click on the stage, or the Fit button. |
| Toolbar | A small pill at the 2D stage's bottom-left: a `Fit` button and a zoom readout (`100%` = fit). It lives inside the 2D stage subtree, so the 3D branch's `PreviewCard` wrapper hides it in 3D mode; that branch overlays its `2D / 3D` toggle at the stage's top-right. |
| Labels | Constant screen size: hole count 13 px, mm size 11 px, mirror line 11 px. Shown only when the board's shorter side is at least 64 screen px; otherwise omitted. |
| Strokes and hatch | Already non-scaling. The hatch pattern keeps an 8 px screen pitch at any zoom. |
| Out of scope | Pinch-to-zoom with two touch points, keyboard shortcuts, minimap, zoom persistence, any change to the 3D view. |

## Architecture

```
src/ui/
  viewport.ts          pure: Viewport type, fitViewport, zoomAt, panBy, zoomRatio
  useViewport.ts       hook: stage size via ResizeObserver, viewport state, handlers
  CanvasToolbar.tsx    NEW: bottom-left pill with Fit + zoom readout (+ slot for other controls)
  Canvas.tsx           wires useViewport to the stage; renders CanvasToolbar
  Preview.tsx          takes { plan, viewport, width, height }; draws inside <g transform>
  SummaryChip.tsx      phone fix: block flow under 800 px (parked item from the port)
```

### `viewport.ts` (pure, tested)

```ts
export interface Viewport { scale: number; tx: number; ty: number }
export interface Size { width: number; height: number }
export const FIT_MARGIN_PX = 24;
export const ZOOM_MIN_RATIO = 0.5;   // relative to the fit scale
export const ZOOM_MAX_RATIO = 16;

export function fitViewport(stage: Size, worldMm: Size, marginPx = FIT_MARGIN_PX): Viewport
// scale = min((stage.w - 2m) / world.w, (stage.h - 2m) / world.h), clamped to > 0;
// tx/ty centre the world. A zero-sized stage or world yields { scale: 1, tx: 0, ty: 0 }.

export function zoomAt(v: Viewport, factor: number, point: { x: number; y: number }, fit: Viewport): Viewport
// new scale = clamp(v.scale * factor, fit.scale * ZOOM_MIN_RATIO, fit.scale * ZOOM_MAX_RATIO);
// keeps the world point under `point` (stage px) fixed:
// tx' = point.x - (point.x - v.tx) * (scale'/scale), same for y.

export function panBy(v: Viewport, dx: number, dy: number): Viewport
export function zoomRatio(v: Viewport, fit: Viewport): number   // v.scale / fit.scale
export function wheelFactor(deltaY: number, deltaMode: number): number
// deltaMode 1 (lines) is multiplied by 16 first; factor = exp(-delta * 0.0015),
// clamped to [0.5, 2] per event.
```

### `useViewport.ts`

```ts
export function useViewport(worldMm: Size | null): {
  stageRef: (el: HTMLElement | null) => void;  // callback ref; the hook re-binds when the element is replaced
  size: Size;                 // measured stage size (0×0 before layout / in jsdom)
  viewport: Viewport;
  fit: Viewport;
  ratio: number;              // zoom relative to fit
  fitted: boolean;
  refit(): void;
  handlers: {                 // spread onto the stage element
    onWheel, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick
  };
  dragging: boolean;
}
```

- `size` comes from a `ResizeObserver` on the stage (falls back to `0×0`
  when `ResizeObserver` is missing, as in jsdom).
- `fit` is recomputed from `size` and `worldMm`. While `fitted` is true the
  viewport equals `fit`. Any wheel or drag sets `fitted = false`; `refit()`
  and double-click set it back. A change of `worldMm` (new plan size) always
  refits.
- Wheel: `preventDefault()`; the listener is attached with `{ passive: false }`
  via an effect on the stage element (React's `onWheel` is passive). Zoom at
  the cursor position relative to the stage.
- Drag: `onPointerDown` (primary button only) captures the pointer, records
  the start; `onPointerMove` pans by the delta; `onPointerUp`/`Cancel`
  releases. A drag shorter than 3 px is ignored so clicks still work.

### `Preview.tsx`

Props: `{ plan: Plan | null; viewport: Viewport; width: number; height: number }`.
`width`/`height` are the stage size in px; the `<svg>` gets
`viewBox="0 0 width height"` and `width/height: 100%`. All mm-space
content lives in `<g transform="translate(tx ty) scale(scale)">`. Text
sizes are `13 / scale` and `11 / scale` user units so they render at 13 and
11 screen px. Labels show when `min(widthMm, heightMm) * scale >= 64`.
The hatch pattern is `8 / scale` wide with a `3 / scale` stroke.
`data-board`, `data-mirror`, `data-leftover`, `data-outline`, hover accent,
and the pattern `useId` stay as they are.

When `width` or `height` is 0 (no layout yet), the svg renders with
`viewBox="0 0 worldW worldH"` and an identity transform so tests without
layout keep asserting the same DOM.

### `Canvas.tsx`

The stage `div` gets `ref`, the viewport handlers, `touch-action: none`,
`cursor: grab`/`grabbing`, and `overflow: hidden`. It renders
`<Preview plan viewport width height />` and the `CanvasToolbar`. The chip
and stage geometry from the port are unchanged.

### `CanvasToolbar.tsx`

Absolutely positioned at the stage's bottom-left (10 px inset), `surface`
background, 1 px `border`, radius 8, 28 px tall: a `Fit` button (secondary
style, `aria-label="Fit to view"`) and a readout `100%` (`muted`, tabular
numerals). The visible readout is `aria-hidden`; a visually hidden live
region announces `Zoom NNN%` politely, debounced 300 ms after the last
change, so a wheel gesture produces one announcement, not one per tick. Pointer events inside the toolbar stop
propagation so clicking it never starts a pan. The stage's top-right corner
is reserved for the 3D branch's `2D / 3D` toggle.

### `SummaryChip.tsx` (parked port item)

Under 800 px the chip uses `display: block` so the bold count and the
detail flow as one wrapping line instead of two flex items.

## Error handling

No new error states. A zero-sized stage or a null plan renders nothing
interactive. Wheel and pointer handlers never throw on missing plan.

## Testing

Vitest.
- `viewport.test.ts`: fit centres and respects the margin; zero sizes give
  identity; `zoomAt` keeps the cursor point fixed and clamps to the ratio
  range; `panBy` adds offsets; `wheelFactor` sign, line-mode scaling, clamp.
- `useViewport.test.tsx`: with a mocked `ResizeObserver` reporting 800×600,
  the viewport equals the fit; a wheel event zooms and sets `fitted=false`;
  pointer down/move/up pans; double-click refits; a new world size refits.
- `Preview.test.tsx`: existing assertions unchanged when rendered with
  `width={0} height={0}` and identity viewport; a new test renders with
  `width={1000} height={600}` and a viewport of scale 2 and checks the
  `<g transform>` string and that label font sizes equal `13 / 2` and
  `11 / 2`; the 64 px threshold test uses scale 1 with a 60 mm board (no
  labels) and an 80 mm board (labels).
- `Canvas`/`App` tests: the toolbar's Fit button exists (`aria-label`) and
  the readout reads `100%` initially.
- Final screenshot check: zoomed-in and panned states at 1280 px, the
  toolbar in dark and light, the phone chip.
