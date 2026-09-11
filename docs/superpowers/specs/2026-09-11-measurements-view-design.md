# Measurements view

Date: 2026-09-11
Branch: `measurements-view` (implemented off-main at Vanessa's request)

## Goal

A toggle on the 2D preview that replaces the hardware-dot markers with a dimensioned
drawing: every drill point's exact distance from the bottom-left corner, shown as
baseline dimension lines (like an engineering drawing), so it can be printed/carried
to the wall with a tape measure. The bottom-left corner is the reference origin
(floor + left wall are the two things an installer actually measures from).

Only the currently selected mounting system's drill points are dimensioned — the
same points already drawn as dots today (`hardwareMarkers()`), so no new geometry
concept is introduced, just a new way to read the existing marker positions.

## Data: `src/mounting/dimensions.ts` (new)

Pure, unit-testable, no SVG/rendering concerns.

```ts
export interface DimensionValue {
  mm: number;
  lane: number;
}

/** Unique X and Y values (rounded to 1 mm) across all markers, ascending. */
export function dimensionAxes(markers: HardwareMarker[]): { x: number[]; y: number[] };

/**
 * Greedily assigns each value to the lowest-numbered lane whose last placed
 * value is at least minGapMm away (or is empty), up to maxLanes. Values that
 * still collide beyond maxLanes share the outermost lane. Input must be sorted
 * ascending.
 */
export function assignLanes(values: number[], minGapMm: number, maxLanes?: number): DimensionValue[];
```

- `dimensionAxes` dedupes by rounding to the nearest mm (marker coordinates can carry
  float noise from the solver).
- Every drill point is fully located by pairing its rounded X (read off the bottom
  chain) with its rounded Y (read off the left chain) — we don't need per-point
  extension lines, only per-axis ones, because points sit on the mounting system's
  lattice.
- `maxLanes` defaults to 4. Values that would need a 5th lane double up on lane 3
  rather than growing the margin indefinitely.

## Rendering: `DimensionOverlay` in `Preview.tsx`

- `Preview` gains a `mode?: 'hardware' | 'measurements'` prop (default `'hardware'`,
  today's dot rendering). In `'measurements'` mode, `MarkerDot`s are not drawn and
  `DimensionOverlay` is drawn instead.
- Visual language reuses the existing seam-tick styling (`styles.tick`): a baseline
  line from 0 out to the lane offset, then to the point's extension line, with a
  small 45° tick at each end and an mm label near the outer tick. Same idea as the
  reference photo's staggered callouts, just orthogonal (no perspective) since the
  app is 2D-only.
- Y-axis lines live in a margin to the left of the boards (`x < 0`); X-axis lines
  live in a margin below the boards (`y > totalH`). Margin width/height =
  `lanesUsed(axis) * LANE_SPACING_MM + BASE_GAP_MM`, computed from `assignLanes`.
- `Canvas.tsx`'s `world` size (fed to `useViewport`) gets this margin added on the
  left/bottom only, while measurements mode is active, and `DimensionOverlay`
  translates the board group right/up by the same margin so board coordinates are
  unaffected.
- Labels below a legibility threshold at the current zoom are hidden, same pattern
  as `MIN_MARKER_PX` today.

## UI

- `CanvasToolbar` gets a new toggle button ("Measurements") next to "Fit".
- `App.tsx` holds `measurementsMode: boolean` (default `false`), passed down through
  `Canvas` to `Preview` as the `mode` prop. Independent of `highlight` state.

## Export: `formatPrintList`

New block, placed after the existing hardware block:

```
Drill point measurements (mm, from the bottom-left corner)
X: 0, 174, 380, 606, ...
Y: 0, 522, 735, 866, 1150, ...
```

Same `dimensionAxes()` values as the drawing (lanes are a rendering-only concept,
not part of the export).

## Edge cases

- No plan / no markers: toggle is disabled (mirrors how `CanvasToolbar` only
  renders when a plan exists).
- Systems with many drill points per board (screw spacers' inset corners) produce
  more unique values close together; `assignLanes` staggers them instead of
  overlapping, capped at 4 lanes.
- Zoomed far out: labels hide below the legibility threshold, matching existing
  marker behavior, rather than rendering unreadable text.

## Testing

- `dimensions.test.ts`: dedupe/rounding, ascending order, lane assignment
  (values far apart stay on lane 0; close values spread across lanes; overflow
  beyond `maxLanes` shares the outer lane).
- Extend `printListText.test.ts` for the new export block.
- Extend `Preview`/`App` component tests for `measurements` mode rendering.
- Manual: toggle it on a real plan in the browser and compare against the
  reference photo's look.
