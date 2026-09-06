# Hardware Markers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw mounts, spacers or connectors on the 2D preview where they belong.

**Architecture:** `MountSystem.markers` (data) + a pure `hardwareMarkers(plan, system, model)` in `src/mounting/markers.ts`; `Preview` renders circles (and seam ticks) from a `markers` prop; `App` computes them and passes through `Canvas`.

Spec: `docs/superpowers/specs/2026-09-06-hardware-markers-design.md` (exact geometry, radii, colours, data). Use it verbatim.

## Global Constraints
- Positions in wall mm; covered area only; screw inset from `model.screwInsetMm` (10 for Skadis).
- Radii in screen px as the spec table; constant under zoom (`r = px / scale`); markers hidden when the shorter side of a board is under 32 screen px.
- StyleX only; SVG colours through StyleX classes like the rest of `Preview.tsx`; `pointer-events: none` on markers; drawn after boards, before the outline; hover highlight still last.
- No solver change. `npm test`, `npm run typecheck`, `npm run build` pass; warning-free.
- Commit messages: plain sentences, no conventional-commit prefixes, no "Fix X:" colon subjects; end with a blank line and `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`. Stage files by path.

## Tasks

### Task 1: Markers data, geometry and rendering
**Files:** `src/mounting/types.ts` (+ `MarkerKind`, `markers`, `HardwareMarker`), `src/mounting/systems.ts` (+ `markers` per system), `src/models/types.ts` + `src/models/skadisInfinity.ts` (+ `screwInsetMm`), `src/mounting/markers.ts` (NEW) + `markers.test.ts`, `src/mounting/index.ts` (re-export), `src/ui/Preview.tsx` (+ `markers` prop, circles, seam ticks, hide rule) + `Preview.test.tsx`, `src/ui/Canvas.tsx` (+ `markers` prop passthrough), `src/ui/App.tsx` (compute and pass), `src/ui/App.test.tsx`, `src/mounting/index.test.ts` (every system has ≥1 marker kind).
- [ ] Tests first (spec Testing section), see them fail; implement; run everything; one commit: `Draw the mounting hardware on the 2D preview`.

Geometry helpers: column boundaries = prefix sums of `plan.columns.map(model.sizeMm)` from 0 to the covered width; row boundaries likewise. `nodes`: all (bx, by) pairs with role by position (both interior → junction; exactly one interior → edgeNode; neither → outerCorner). `outerNodes`: nodes whose role is not junction. `boardCorners`: for each `plan.boards` entry, four points at `xMm ± inset` / `yMm ± inset` inside the board. `seams`: for each row, midpoints between horizontally adjacent boards `(boundary x, yMm + heightMm/2)` with `orientation: 'vertical'` (the seam line is vertical); for each column, `(xMm + widthMm/2, boundary y)` with `orientation: 'horizontal'`. `HardwareMarker { x: number; y: number; kind: MarkerKind; role?: 'junction' | 'edgeNode' | 'outerCorner'; orientation?: 'vertical' | 'horizontal' }`.

Rendering: `<g data-markers>`; each marker a `<circle data-marker data-kind={kind} cx cy r={px / scale} vectorEffect="non-scaling-stroke">` with StyleX class `marker` (`fill: mixes.vizData`, `stroke: colors.surface`, `strokeWidth: 1.5`, `pointerEvents: 'none'`); seam markers add a `<line>` tick of 12 px (6 px each side, in mm = 6 / scale) perpendicular to the seam with class `tick` (`stroke: mixes.vizLineStrong`, `strokeWidth: 1.5`, `pointerEvents: 'none'`). Hide rule: compute `minSide = Math.min(...plan.boards.map(b => Math.min(b.widthMm, b.heightMm)))`; render markers only if `minSide * scale >= 32`.

### Task 2: Screenshot check
Capture the default plan with each of the three systems at fit and one zoomed-in shot (markers constant size), judge legibility and that markers sit on the grid lines / corners / seams. Same Playwright scratch setup (`/tmp/planner-shots`, port 5188, `kill $(lsof -t -i:5188)`). Fix only real breakage.
