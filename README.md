# Board planner

Enter the width and height of a wall area and get the fewest 3D-printable
pegboard boards that cover it, sized to your printer's bed.

First model: [IKEA Skadis Infinity](https://makerworld.com/en/models/1309689-ikea-skadis-infinity) by AU3D.

## Run

    npm install
    npm run dev       # http://localhost:5173
    npm test
    npm run build     # static output in dist/

## 3D view

The preview card has a `2D / 3D` toggle. The 3D view generates every board
as a real slotted mesh from the model's `pattern` (slot size, checkerboard
rule, screw holes) and renders them with react-three-fiber, one instanced
mesh per board size. Nothing is downloaded: the MakerWorld STL files are not
redistributable, so the geometry is rebuilt from measured rules instead.
Pan and zoom with the mouse; `Orbit` enables rotation. Orbit switches the
left mouse button to rotation; right-drag then pans.

## Add a board model

1. Copy `src/models/skadisInfinity.ts` to a new file and fill in the fields
   of `BoardModel` (see `src/models/types.ts`).
2. Add it to `MODELS` in `src/models/index.ts`.

The solver assumes `sizeMm(holes) === pitchMm * (holes + 1)`.

## Add a printer

Add an entry to `PRINTERS` in `src/printers/index.ts`.

## Layout

- `src/models`, `src/printers`, `src/units.ts`: data and conversions.
- `src/solver`: pure planning. `plan()` splits each axis into the fewest
  boards, prefers symmetric boards, then computes mirror flags and groups.
- `src/ui`: React + StyleX. `planState.ts` turns the form into a plan.
- The UI follows Toolcraft's design direction (https://toolcraft.sh): a dark
  canvas-first workspace, a floating controls panel, Inter, and a neutral
  geometry ladder for the preview. Tokens live in `src/ui/tokens.stylex.ts`
  and `src/ui/mixes.stylex.ts`; the light theme in `src/ui/themes.stylex.ts`.
  Theme preference is stored under `appearance.theme.v1`.

Design spec: `docs/superpowers/specs/2026-09-05-skadis-board-planner-design.md`.
