# Hardware markers on the 2D preview — design

Date: 2026-09-06
Status: approved for planning (Vanessa: "show the spacers in the 2d as well")
Builds on: `2026-09-06-mounting-and-rename-design.md`

## Goal

Draw the selected mounting system's hardware on the 2D preview at the
positions where it goes, so the user sees where mounts, spacers or
connectors sit. Positions come from the same grid facts that count the
hardware, so markers and the Hardware table always agree.

## Marker kinds

`MountSystem` gains `markers: MarkerKind[]` (data, one line per system).

| Kind | Position (mm, wall coordinates) | Count |
|---|---|---|
| `nodes` | every lattice point: x ∈ column boundaries (0, w1, w1+w2, …, W), y ∈ row boundaries | (c+1)(r+1) |
| `outerNodes` | lattice points on the outer edge only (edge nodes + the 4 corners) | 2(c−1)+2(r−1)+4 |
| `boardCorners` | inside each board, `screwInsetMm` in from each corner | 4·boards |
| `seams` | midpoint of every shared edge between two adjacent boards | r(c−1)+c(r−1) |

Systems: `wall-mounts` → `['nodes']`; `spacers` → `['boardCorners']`;
`threaded-connectors` → `['seams', 'outerNodes']`.

`BoardModel` gains `screwInsetMm: number` (Skadis Infinity: 10).

Each marker carries `{ x, y, kind }` where `kind` is the marker kind plus,
for `nodes`, a `role` of `junction` / `edgeNode` / `outerCorner` (used for
size). Positions use the covered area only (leftover strips get nothing).

## Rendering (`Preview`)

- New prop `markers?: HardwareMarker[]` (default none). Drawn after the
  boards and before the wall outline, inside the transformed group, as a
  `<g data-markers>` of `<circle data-marker data-kind="…">` elements.
- Radius in screen px (constant under zoom): nodes with role `junction`
  5 px, `edgeNode` 4 px, `outerCorner` 4 px; `boardCorners` 3 px;
  `seams` 4 px; `outerNodes` 4 px. Fill `mixes.vizData`, 1.5 px
  non-scaling stroke in `colors.surface`, `pointer-events: none`.
- Seam markers additionally draw a short 1.5 px `vizLineStrong` tick across
  the seam (12 px long, perpendicular to the seam) so a connector reads as
  "joins these two boards".
- Markers hide when the board's shorter side is under 32 screen px (same
  scale rule family as labels) to avoid clutter when zoomed far out, and
  the layer is skipped entirely above 4000 markers (very large walls) to
  keep the DOM bounded.

## Wiring

`src/mounting/markers.ts`: `hardwareMarkers(plan, system, model): HardwareMarker[]`.
`Canvas` gains a `markers` prop and passes it to `Preview`; `App` computes
`hardwareMarkers(state.lastPlan, system, model)` when a plan exists.

## Testing

- `markers.test.ts`: 5×3 default plan → wall mounts 24 nodes with role
  counts 8/12/4 at the expected coordinates (e.g. (0,0) outerCorner,
  (200,0) edgeNode, (200,200) junction, (1000,600) outerCorner); spacers 60
  corner points, first board's at (10,10), (190,10), (10,190), (190,190);
  threaded 22 seam midpoints (e.g. (200,100) between the first two boards
  of row 1) plus 16 outer nodes. 1×1 plan: wall mounts 4 corners, seams 0.
  Marker counts equal the Hardware table's mount/connector counts.
- `Preview.test.tsx`: renders one `[data-marker]` per marker; none when
  `markers` is omitted; hidden when the board is under 32 px.
- `App.test.tsx`: the default render has 24 markers; switching System to
  spacers gives 60.
- Screenshot of each system on the default plan.

## Out of scope

Drilling positions in mm in the TXT, marker tooltips, per-marker hover.
