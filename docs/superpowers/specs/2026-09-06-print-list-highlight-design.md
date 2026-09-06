# Print list highlight design

Date: 2026-09-06

## Purpose

Replace the per-board hover accent ring (canvas-only, told the user
nothing about hardware) with highlighting driven by the print list:
hovering a row shows exactly what it refers to on the 2D preview, for
board groups and hardware items alike.

## The `Highlight` type (`src/ui/highlight.ts`)

```ts
type Highlight =
  | { kind: 'boards'; cols: number; rows: number; mirrorX: boolean; mirrorY: boolean }
  | { kind: 'hardware'; per: Partial<Record<NodeKind, number>> };
```

`boardMatches` matches a `boards` highlight against a `PlacedBoard` when
`cols`/`rows`/`mirrorX`/`mirrorY` are all equal (a `hardware` highlight
never matches a board). `markerMatches` matches a `hardware` highlight
against a `HardwareMarker` when any `NodeKind` key in `per` with value >
0 maps to it: `junction`/`edgeNode`/`outerCorner` → `nodes`/`outerNodes`
with that `role`; `board` → `boardCorners`; `seam` → `seams` (a `boards`
highlight never matches a marker).

## Visual treatment

No accent ring or canvas-side hover state. `Preview` takes an optional
`highlight`. A matching board gets `data-lit`/`boardLit` (`fill:
mixes.vizFillLit`, `color-mix(in oklab, ${colors.text} 22%,
${colors.surface})` — between the 14% `vizFillDim` base and the 30%
`vizLine`); for a `boards` highlight every other board also gets
`data-dim`/`boardDim` (`opacity: 0.7`). For a `hardware` highlight, a
matching marker (circle + seam tick) gets `data-lit`/`markerLit`
(`fill`/`stroke: colors.text`, +1 px radius); every other marker gets
`data-dim`/`markerDim` (`opacity: 0.25`) — boards are never dimmed by a
hardware highlight, markers never touched by a boards highlight. No
`highlight` → no `data-lit`/`data-dim` anywhere. Base board/marker
styles gained a 120ms opacity/fill transition (ticks transition
opacity/stroke, since they use `stroke` rather than `fill`).

A per-board hardware row (e.g. a board screw, `per: { board: 4 }`) has
no marker to match on a system that only draws `nodes` markers
(wall-mounts): when such a highlight matches zero markers, every board
lights up instead (`boardsFallback` in `highlight.ts`) so the row
doesn't just dim the whole preview with nothing lit. When the same
per-board highlight does match markers (e.g. `boardCorners` on the
spacers system), those markers light up as usual and boards stay
untouched.

## Print chip link rule

The hardware table's `Print` cell is now an anchor:
`href={row.link ?? system.url}`, `target="_blank"`, `aria-label="Print
{row.name}"`. `Buy` stays a plain span.

## Wiring and emphasis

Each `PrintList` row calls `onHighlight` with the object above on
`onPointerEnter` and `onHighlight(null)` on leave, with a subtle hover
background. `App` holds the highlight state, clears it on every form
change, and threads it to `Canvas`/`Preview`. `PanelSection` gained
`tone?: 'default' | 'emphasis'`; the Print list section uses
`tone="emphasis"` to read as a distinct block in the sidebar.
