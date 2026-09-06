# Mounting Hardware and Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app to Skadis Planner and add a selectable mounting system whose connector and screw counts appear in the print list and the TXT export.

**Architecture:** A data-only `src/mounting/` registry (three systems, per-node-kind multipliers) plus a pure `hardwareList(plan, system)` counter. The form gains `mountId`; the panel gains a Mounting section; `PrintList` and `formatPrintList` render the hardware rows. No solver change.

**Tech Stack:** Existing Vite 8 + React 19 + TypeScript + StyleX 0.19 + Vitest 5.

Spec: `docs/superpowers/specs/2026-09-06-mounting-and-rename-design.md`.

## Global Constraints

- Name: `Skadis Planner` (panel `h1`, `<title>`, README, TXT title `Skadis Planner - print list`, `Generated <date> with Skadis Planner`, file name `skadis-plan-<W>x<H>.txt`, `package.json` name `skadis-planner`).
- Node counts for a `c × r` grid: board `c·r`, junction `(c−1)(r−1)`, edgeNode `2(c−1)+2(r−1)`, outerCorner `4`, seam `r(c−1)+c(r−1)`. Hand-checked 5×3: 15 / 8 / 12 / 4 / 22. Mini 2×1: 2 / 0 / 2 / 4 / 1.
- Systems, ids and items exactly as the spec table; default `wall-mounts`; `threaded-connectors` has `assumed: true`.
- Labels: section `Mounting`, select `System`, link text `Mount files`. Hardware table headers `Item`, `Qty`.
- Solver, models, printers, units untouched. StyleX only.
- `npm test`, `npm run typecheck`, `npm run build` pass after every task; output warning-free.
- Commit messages: plain sentences, no conventional-commit prefixes, no "Fix X:" colon subjects; end with a blank line and `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`. Stage files by path.

## File Structure

```
src/mounting/types.ts          NEW: NodeKind, HardwareItem, MountSystem
src/mounting/systems.ts        NEW: the three systems (data)
src/mounting/index.ts          NEW: MOUNT_SYSTEMS, DEFAULT_MOUNT_ID, getMountSystem, re-exports
src/mounting/hardware.ts       NEW: countNodes, hardwareList
src/mounting/*.test.ts         NEW
src/ui/planState.ts            + mountId
src/ui/InputPanel.tsx          + Mounting section
src/ui/PrintList.tsx           + Hardware table (props gain `system`)
src/export/printListText.ts    + Hardware block, rename
src/ui/App.tsx                 rename, pass system
index.html, README.md, package.json   rename
```

---

### Task 1: Rename to Skadis Planner

**Files:** `index.html`, `package.json`, `README.md`, `src/ui/App.tsx` (title and subtitle), `src/export/printListText.ts` (title, generated line, file prefix), `src/ui/App.test.tsx`, `src/export/printListText.test.ts`, any other test asserting `Board planner`.

- [ ] Grep for `Board planner` and `board-plan-` across `src/`, `index.html`, `README.md`; list every hit.
- [ ] Update tests first: `App.test.tsx` heading query → `Skadis Planner`; download file name → `skadis-plan-1000x600.txt`; `printListText.test.ts` title line `Skadis Planner - print list` with a matching `=` underline (26 chars), `Generated 2026-09-05 with Skadis Planner`, `printListFileName` expectations → `skadis-plan-…`. Run and see them fail.
- [ ] Apply the rename in source and docs: `index.html` title, `package.json` `"name": "skadis-planner"`, README first heading `# Skadis Planner` and the intro sentence, `App.tsx` `h1`/`Panel title` and subtitle if it names the app, `printListText.ts` `title` constant, `Generated … with Skadis Planner`, `skadis-plan-` prefix.
- [ ] `npm test && npm run typecheck && npm run build`; commit: `Rename the app to Skadis Planner`.

---

### Task 2: Mounting registry and hardware counting (pure)

**Files:** Create `src/mounting/types.ts`, `src/mounting/systems.ts`, `src/mounting/index.ts`, `src/mounting/hardware.ts`, `src/mounting/hardware.test.ts`, `src/mounting/index.test.ts`.

- [ ] **Tests first.** `hardware.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { countNodes, hardwareList } from './hardware';
import { getMountSystem } from './index';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const byName = (rows: { name: string; qty: number }[]) => Object.fromEntries(rows.map((r) => [r.name, r.qty]));

describe('countNodes', () => {
  it('counts a 5 x 3 grid', () => {
    expect(countNodes(5, 3)).toEqual({ board: 15, junction: 8, edgeNode: 12, outerCorner: 4, seam: 22 });
  });
  it('counts single boards and single lines', () => {
    expect(countNodes(1, 1)).toEqual({ board: 1, junction: 0, edgeNode: 0, outerCorner: 4, seam: 0 });
    expect(countNodes(4, 1)).toEqual({ board: 4, junction: 0, edgeNode: 6, outerCorner: 4, seam: 3 });
    expect(countNodes(1, 4)).toEqual({ board: 4, junction: 0, edgeNode: 6, outerCorner: 4, seam: 3 });
  });
});

describe('hardwareList', () => {
  const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
  it('counts wall mounts for the default plan', () => {
    expect(byName(hardwareList(p, getMountSystem('wall-mounts')))).toEqual({
      'Quad wall mount': 8, 'Double wall mount': 12, 'Single wall mount': 4, 'M4 x 40-60 wall screw': 24, 'M4 x 20 board screw': 60,
    });
  });
  it('counts spacers', () => {
    expect(byName(hardwareList(p, getMountSystem('spacers')))).toEqual({
      'Screw spacer (10, 15 or 20 mm)': 60, 'M4 wall screw (30 mm or longer)': 60, 'Wall plug': 60,
    });
  });
  it('counts threaded connectors', () => {
    expect(byName(hardwareList(p, getMountSystem('threaded-connectors')))).toEqual({
      'Threaded connector': 22, 'Connector screw': 44, 'Spacer and M4 wall screw': 16,
    });
  });
  it('omits zero rows and keeps notes', () => {
    const one = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    const rows = hardwareList(one, getMountSystem('wall-mounts'));
    expect(rows.map((r) => r.name)).toEqual(['Single wall mount', 'M4 x 40-60 wall screw', 'M4 x 20 board screw']);
    const mini2 = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    expect(byName(hardwareList(mini2, getMountSystem('wall-mounts')))).toEqual({
      'Double wall mount': 2, 'Single wall mount': 4, 'M4 x 40-60 wall screw': 6, 'M4 x 20 board screw': 8,
    });
    expect(hardwareList(one, getMountSystem('spacers')).find((r) => r.name === 'Wall plug')?.note).toMatch(/wall/i);
  });
});
```
`index.test.ts`: `MOUNT_SYSTEMS.map(s => s.id)` equals `['wall-mounts', 'spacers', 'threaded-connectors']`; `DEFAULT_MOUNT_ID === 'wall-mounts'`; `getMountSystem('nope')` throws `/unknown mount/i`; `getMountSystem('threaded-connectors').assumed === true`; every item has at least one `per` entry with a positive integer.

- [ ] **Implement.** `types.ts` as the spec. `hardware.ts`:
```ts
import type { Plan } from '../solver';
import type { MountSystem, NodeKind } from './types';

export const NODE_KINDS: NodeKind[] = ['board', 'junction', 'edgeNode', 'outerCorner', 'seam'];

export function countNodes(columns: number, rows: number): Record<NodeKind, number> {
  const c = Math.max(0, columns);
  const r = Math.max(0, rows);
  if (c === 0 || r === 0) return { board: 0, junction: 0, edgeNode: 0, outerCorner: 0, seam: 0 };
  return {
    board: c * r,
    junction: (c - 1) * (r - 1),
    edgeNode: 2 * (c - 1) + 2 * (r - 1),
    outerCorner: 4,
    seam: r * (c - 1) + c * (r - 1),
  };
}

export interface HardwareRow { name: string; qty: number; note?: string }

export function hardwareList(plan: Plan, system: MountSystem): HardwareRow[] {
  const nodes = countNodes(plan.columns.length, plan.rows.length);
  return system.items
    .map((item) => ({
      name: item.name,
      qty: NODE_KINDS.reduce((sum, kind) => sum + (item.per[kind] ?? 0) * nodes[kind], 0),
      ...(item.note ? { note: item.note } : {}),
    }))
    .filter((row) => row.qty > 0);
}
```
`systems.ts`: the three systems with the exact names used in the tests above, urls `https://makerworld.com/en/models/861073`, `https://makerworld.com/en/models/418874`, `https://www.printables.com/model/1371785-threaded-connector-for-ikea-skadis-infinity`, descriptions from the spec, `assumed: true` on the third, notes: wall plug `If the wall needs them`; connector screw `Assumed two per connector; check the model page`; spacer+screw `The outside of the assembly still needs fixing to the wall`. `index.ts`: `MOUNT_SYSTEMS`, `DEFAULT_MOUNT_ID = 'wall-mounts'`, `getMountSystem(id)` throwing `Unknown mount system: ${id}`, re-export types and `hardwareList`, `countNodes`.
- [ ] Run, typecheck, commit: `Add mounting systems and hardware counting`.

---

### Task 3: Mounting section, hardware table, export

**Files:** `src/ui/planState.ts` (+ `mountId`, default), `src/ui/InputPanel.tsx` (+ Mounting section: `SelectField` label `System`, `FieldHint` description, a `Mount files` link styled like the footer link but 11 px muted underline), `src/ui/PrintList.tsx` (props `{ plan, model, system }`; Hardware table under the board table: header `Item` / `Qty`, notes as a muted line under the item name), `src/export/printListText.ts` (`PrintListInput` gains `system: MountSystem`; after the board table: blank line, `Hardware (<system name>)`, rows `Qty  Item (note)` padded like the board table, then `Mount files: <url>`), `src/ui/App.tsx` (resolve `system = getMountSystem(state.form.mountId)`, pass to `PrintList` and the export), tests: `planState.test.ts` (default id), `PrintList.test.tsx` (mini plan wall-mount rows 2/4/6/8 in a second table: use `getAllByRole('table')[1]`), `printListText.test.ts` (default plan expectation gains the Hardware block: `Hardware (Wall mounts (AU3D))` then `  8  Quad wall mount`, ` 12  Double wall mount`, `  4  Single wall mount`, ` 24  M4 x 40-60 wall screw`, ` 60  M4 x 20 board screw`, then `Mount files: https://makerworld.com/en/models/861073`), `App.test.tsx` (Mounting select options, link href for the default, download text contains `Quad wall mount`).
- [ ] Tests first, see them fail, implement, run everything, commit: `Let the user pick a mounting system and list its hardware`.

Notes: the hardware block in the TXT sits between the board table and the Layout grid. Pad the `Qty` column to width 3 (right-aligned) like the board table; a note follows the item in parentheses.

---

### Task 4: Screenshot check

Capture (same Playwright scratch setup as before, port of your choice, kill with `kill $(lsof -t -i:PORT)`): the Mounting section for each system (three shots), the print list with the Hardware table for the default plan, and the first 25 lines of a real download. Fix only real visual breakage in `src/ui/*.tsx`. Commit only if source changed.
