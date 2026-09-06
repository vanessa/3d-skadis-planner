# Mounting hardware and rename — design

Date: 2026-09-06
Status: approved for planning (Vanessa: plan with Fable, implement with Sonnet)
Builds on: `2026-09-05-strategies-print-list-export-design.md`

## Goal

1. Rename the tool to **Skadis Planner** everywhere a user sees a name.
2. Let the user pick how the boards are fixed together and to the wall
   (a **mounting system**), and count the connectors and screws the layout
   needs, in the panel and in the downloaded print list.

## Facts gathered (2026-09-06)

- Skadis Infinity boards have four M4 countersunk corner holes, 10 mm in
  from each corner (author's page; STL bounding boxes checked earlier).
- AU3D's **Multi Board Wall Mount** (makerworld.com/en/models/861073) puts
  one mount under a node where board corners meet: a quad mount where four
  boards meet, a double where two boards meet along an outer edge, and a
  single mount (models/420877) at an outer corner with no neighbour. One
  wall screw per mount (author recommends M4×40 to 60), one M4×20 screw per
  board corner into the mount. 20 mm board-to-wall clearance.
- AU3D's **Screw Spacers** (makerworld.com/en/models/418874) come in 10, 15
  and 20 mm, four per print profile; one spacer and one M4 wall screw per
  board corner, straight into the wall.
- Threaded connectors (Printables 1371785) were removed on 2026-09-06 at the
  user's request; the seam/outer-node marker kinds stay for future systems.

## Counting model

Every layout is a grid of `c` columns and `r` rows. Hardware is counted
from node and seam counts that follow from the grid alone:

| Kind | Count | Meaning |
|---|---|---|
| `board` | c·r | one per board |
| `junction` | (c−1)(r−1) | a point where four board corners meet |
| `edgeNode` | 2(c−1) + 2(r−1) | a point on the outer edge where two corners meet |
| `outerCorner` | 4 | the four corners of the whole wall (1 board corner each) |
| `seam` | r(c−1) + c(r−1) | a shared edge between two adjacent boards |

A hardware item declares how many it needs per kind; quantities are the
sum over kinds. For a single board: junctions 0, edge nodes 0, corners 4,
seams 0.

## Mounting systems (data, one file)

```ts
// src/mounting/types.ts
export type NodeKind = 'board' | 'junction' | 'edgeNode' | 'outerCorner' | 'seam';
export interface HardwareItem { name: string; per: Partial<Record<NodeKind, number>>; note?: string }
export interface MountSystem {
  id: string; name: string; url: string; description: string;
  items: HardwareItem[];
}
```

| Id | Name | Items |
|---|---|---|
| `wall-mounts` (default) | Wall mounts (AU3D) | Quad wall mount: junction 1 · Double wall mount: edgeNode 1 · Single wall mount: outerCorner 1 (note: separate model, makerworld.com/en/models/420877) · M4×40–60 wall screw: junction 1, edgeNode 1, outerCorner 1 · M4×20 board screw: board 4 |
| `spacers` | Screw spacers (AU3D) | Screw spacer 10/15/20 mm: board 4 · M4 wall screw (≥ 30 mm): board 4 · Wall plug: board 4 (note: if the wall needs them) |

Descriptions (one line each, shown under the select):
- Wall mounts: "One printed mount under every point where board corners meet, one wall hole per mount."
- Spacers: "A spacer and a screw at every board corner, straight into the wall."

## UI

- Panel section **Mounting** after Layout: `System` select (two names), a hint line with the description, and a `Mount files` link to the system's page (opens a new tab); the print list's hardware rows carry the item notes.
- **Print list** section: under the board table, a second small table **Hardware** (captioned) with columns Item · Get · Qty; a note shown as muted text under the item name when present.
- **TXT export**: after the board table, a `Hardware (<system name>)` block with `Qty  Item` rows (the Qty column widens for large counts), notes in parentheses, then a `Mount files: <url>` line. The file name becomes `skadis-plan-<W>x<H>.txt`, the title line `Skadis Planner - print list`.
- Chip unchanged.

## Rename

"Board planner" → "Skadis Planner" in: `index.html` `<title>`, the panel `h1`, the ErrorBoundary title if any, README heading and text, `package.json` name `skadis-planner`, the TXT title line and file name prefix, the "Generated … with Skadis Planner" line, the subtitle text if it says "Board planner". Tests updated to match. The design specs are history and stay as written.

## Form and state

`FormState` gains `mountId` (default `wall-mounts`). `PlanRequest` and `Plan`
do not change: hardware is derived from `plan.columns.length`,
`plan.rows.length` and `plan.boards.length` by `hardwareList(plan, system)`.

```ts
// src/mounting/hardware.ts
export function countNodes(columns: number, rows: number): Record<NodeKind, number>;
export function hardwareList(plan: Plan, system: MountSystem): { name: string; qty: number; note?: string }[];
```

## Testing

- `hardware.test.ts`: node counts for 5×3, 1×1, 4×1, 1×4; each system's
  quantities for the 5×3 example above; zero-quantity items are omitted.
- `mounting/index.test.ts`: registry order, default id, unknown id throws,
  every item's `per` uses known kinds and positive counts.
- `PrintList.test.tsx`: the Hardware table renders the wall-mount rows for
  the 360 × 180 mini plan (2 boards: 0 junctions, 2 edge nodes, 4 corners,
  1 seam → 2 double, 4 single, 6 wall screws, 8 board screws).
- `printListText.test.ts`: the default-plan expectation gains the Hardware
  block; title and file name renamed.
- `App.test.tsx`: Mounting section and link, heading `Skadis Planner`,
  download file name `skadis-plan-1000x600.txt`.
- Screenshot check of the Mounting section and the hardware table.

## Out of scope

Per-board mount placement drawings, drilling positions, hardware for the
3D view (removed), a shopping link. Any change to the solver.
