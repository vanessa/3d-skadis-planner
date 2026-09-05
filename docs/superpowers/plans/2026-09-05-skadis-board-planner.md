# Skadis Board Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static single-page app that takes a wall width and height and returns the fewest-board tiling of printable IKEA Skadis Infinity boards for a chosen printer, with an SVG preview and a print list.

**Architecture:** Pure TypeScript modules for models, printers, units and the solver (no React, fully unit-tested). A thin React UI on top that recomputes the plan on every valid input change. Each board model is one file; adding a model means adding a file and registering it.

**Tech Stack:** Vite 8, React 19, TypeScript, StyleX 0.19 via `@stylexjs/unplugin`, Vitest 5 with jsdom and Testing Library.

Spec: `docs/superpowers/specs/2026-09-05-skadis-board-planner-design.md`

## Global Constraints

- Node 25 / npm 11 are installed. Use `npm`.
- Styling is StyleX only: `stylex.create` + `stylex.props`, tokens via `stylex.defineVars` in `src/ui/tokens.stylex.ts`. The only plain CSS file is `src/reset.css`.
- Everything internal is millimetres. Units are converted at the input boundary only.
- Solver code never imports React or anything from `src/ui`.
- Commit messages: plain sentences, **no conventional-commit prefixes** (`feat:`, `fix:` etc. are forbidden). End every commit message with a blank line and then `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`.
- Tests: `npm test` runs `vitest run`. Type check: `npm run typecheck` runs `tsc --noEmit`.
- Printer presets (bed width x depth, mm): A1 256x256, A1 mini 180x180, P1S 256x256, X1 Carbon 256x256, H2D 350x320.
- Skadis Infinity: pitch 20 mm, holes 2..15, `sizeMm = 20 * (holes + 1)`, symmetric iff both counts odd, even columns need mirror X, even rows need mirror Y.

## File Structure

```
index.html                     Vite entry
package.json / tsconfig.json / vite.config.ts / .gitignore
src/
  main.tsx                     mounts <App/>, imports reset.css, dev-only StyleX runtime
  reset.css                    box-sizing, margin 0, font stack
  vite-env.d.ts                vite/client types + virtual module declarations
  units.ts                     Unit type, toMm/fromMm
  models/types.ts              BoardModel interface
  models/skadisInfinity.ts     the first model
  models/index.ts              MODELS, getModel, DEFAULT_MODEL_ID
  printers/index.ts            Printer type, PRINTERS, CUSTOM_PRINTER_ID, getPrinter
  solver/errors.ts             PlanError
  solver/axis.ts               splitAxis (1D split with tie-breaks)
  solver/plan.ts               plan() -> Plan (2D grid, mirror flags, groups)
  solver/types.ts              PlanRequest, Plan, PlacedBoard, BoardGroup
  ui/tokens.stylex.ts          StyleX design tokens
  ui/planState.ts              FormState, DEFAULT_FORM, computePlan (pure)
  ui/App.tsx                   layout + state
  ui/InputPanel.tsx            width/height/unit/model/printer form
  ui/Summary.tsx               board count, coverage, leftover, error line
  ui/Preview.tsx               SVG wall preview
  ui/PrintList.tsx             grouped print list + mirror note + model link
  test/setup.ts                vitest setup (Testing Library cleanup)
```

Tests live next to the code as `*.test.ts` / `*.test.tsx`.

---

### Task 1: Project scaffold with StyleX and Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/reset.css`, `src/vite-env.d.ts`, `src/ui/tokens.stylex.ts`, `src/ui/App.tsx`, `src/test/setup.ts`
- Test: `src/ui/App.test.tsx`

**Interfaces:**
- Produces: `tokens.stylex.ts` exporting `colors`, `space`, `radius`, `font` (StyleX vars) used by every UI task. `App` default export rendering a heading "Board planner".

- [ ] **Step 1: Create package.json and install dependencies**

```json
{
  "name": "skadis-board-planner",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

Run:
```bash
npm i react@19 react-dom@19 @stylexjs/stylex@0.19.0
npm i -D vite@8 @vitejs/plugin-react @stylexjs/unplugin@0.19.0 unplugin typescript @types/react @types/react-dom @types/node vitest@5 jsdom @testing-library/react
```
Expected: `node_modules` created, no peer-dependency errors. (`unplugin` is a peer dependency of `@stylexjs/unplugin`.)

- [ ] **Step 2: Write .gitignore, tsconfig.json, vite.config.ts**

`.gitignore`:
```
node_modules
dist
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

const stylexPlugin = stylex.vite({
  unstable_moduleResolution: { type: 'commonJS', rootDir: process.cwd() },
});

// Under Vitest there is no HTTP server, and the unplugin's configureServer hook
// leaves a polling interval running that delays process exit by ~10 s.
// The hook only serves the dev CSS endpoint, which tests never use.
const stylexForEnv = process.env.VITEST ? { ...stylexPlugin, configureServer: undefined } : stylexPlugin;

export default defineConfig({
  plugins: [stylexForEnv, react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

The unplugin injects the dev stylesheet link and runtime script into `index.html` itself; no custom HTML plugin is needed.

- [ ] **Step 3: Write index.html, reset.css, vite-env.d.ts, main.tsx, test setup**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Board planner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/reset.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
input, select, button { font: inherit; }
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
declare module 'virtual:stylex:runtime';
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './reset.css';
import App from './ui/App';

if (import.meta.env.DEV) {
  // Hot-reloads the StyleX stylesheet in dev. Not bundled in production.
  void import('virtual:stylex:runtime');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/test/setup.ts`:
```ts
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

- [ ] **Step 4: Write tokens and a minimal App**

`src/ui/tokens.stylex.ts` (file name must end in `.stylex.ts`; it may only export `defineVars` results):
```ts
import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  bg: '#fafaf9',
  surface: '#ffffff',
  text: '#1c1917',
  muted: '#78716c',
  border: '#e7e5e4',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  danger: '#b91c1c',
  boardFill: '#eef2ff',
  boardStroke: '#3730a3',
  leftover: '#d6d3d1',
});

export const space = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
});

export const radius = stylex.defineVars({
  sm: '6px',
  md: '10px',
});

export const font = stylex.defineVars({
  sizeSm: '13px',
  sizeMd: '15px',
  sizeLg: '22px',
});
```

`src/ui/App.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import { colors, font, space } from './tokens.stylex';

const styles = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
    padding: space.xl,
  },
  title: {
    fontSize: font.sizeLg,
    fontWeight: 600,
    margin: 0,
  },
});

export default function App() {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>Board planner</h1>
    </main>
  );
}
```

- [ ] **Step 5: Write the smoke test**

`src/ui/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Board planner' })).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run the test, type check and build**

Run: `npm test`
Expected: 1 test passes. If StyleX throws inside vitest, the cause is the plugin not transforming test files; confirm `vite.config.ts` is picked up (vitest reads it automatically) before changing anything else.

Run: `npm run build`
Expected: `dist/` produced. Then `grep -l "background-color" dist/assets/*.css` prints one file, proving StyleX CSS was emitted.

Run: `npm run dev &` then `curl -s http://localhost:5173/ | grep virtual:stylex.css` and `curl -s http://localhost:5173/virtual:stylex.css | head -c 200`. Expected: the link tag is present and the CSS endpoint returns rules. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold the Vite, React and StyleX app with a smoke test

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 2: Units

**Files:**
- Create: `src/units.ts`
- Test: `src/units.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Unit = 'mm' | 'cm' | 'in';
  export const UNITS: Unit[];
  export function toMm(value: number, unit: Unit): number;
  export function fromMm(mm: number, unit: Unit): number;
  ```

- [ ] **Step 1: Write the failing test**

`src/units.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toMm, fromMm, UNITS } from './units';

describe('units', () => {
  it('lists mm, cm and in', () => {
    expect(UNITS).toEqual(['mm', 'cm', 'in']);
  });
  it('converts to mm', () => {
    expect(toMm(100, 'mm')).toBe(100);
    expect(toMm(10, 'cm')).toBe(100);
    expect(toMm(1, 'in')).toBeCloseTo(25.4);
  });
  it('round-trips cm and inches', () => {
    expect(fromMm(toMm(12.5, 'cm'), 'cm')).toBeCloseTo(12.5);
    expect(fromMm(toMm(3.25, 'in'), 'in')).toBeCloseTo(3.25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/units.test.ts`
Expected: FAIL, cannot find module `./units`.

- [ ] **Step 3: Implement**

`src/units.ts`:
```ts
export type Unit = 'mm' | 'cm' | 'in';

export const UNITS: Unit[] = ['mm', 'cm', 'in'];

const MM_PER_UNIT: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };

export function toMm(value: number, unit: Unit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMm(mm: number, unit: Unit): number {
  return mm / MM_PER_UNIT[unit];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/units.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/units.ts src/units.test.ts
git commit -m "Add unit conversion helpers

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 3: Board model definitions

**Files:**
- Create: `src/models/types.ts`, `src/models/skadisInfinity.ts`, `src/models/index.ts`
- Test: `src/models/skadisInfinity.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/models/types.ts
  export interface BoardModel {
    id: string;
    name: string;
    url: string;
    pitchMm: number;
    minHoles: number;
    maxHoles: number;
    sizeMm(holes: number): number;
    isSymmetric(cols: number, rows: number): boolean;
    needsMirrorX(cols: number): boolean;
    needsMirrorY(rows: number): boolean;
    mirrorNote: string;
  }
  // src/models/index.ts
  export const MODELS: BoardModel[];
  export const DEFAULT_MODEL_ID: string;      // 'skadis-infinity'
  export function getModel(id: string): BoardModel;  // throws on unknown id
  ```

- [ ] **Step 1: Write the failing test**

`src/models/skadisInfinity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { skadisInfinity } from './skadisInfinity';
import { MODELS, getModel, DEFAULT_MODEL_ID } from './index';

describe('skadisInfinity', () => {
  it('sizes boards as 20 * (holes + 1)', () => {
    expect(skadisInfinity.sizeMm(2)).toBe(60);
    expect(skadisInfinity.sizeMm(3)).toBe(80);
    expect(skadisInfinity.sizeMm(11)).toBe(240);
    expect(skadisInfinity.sizeMm(15)).toBe(320);
  });
  it('allows 2 to 15 holes with a 20 mm pitch', () => {
    expect(skadisInfinity.pitchMm).toBe(20);
    expect(skadisInfinity.minHoles).toBe(2);
    expect(skadisInfinity.maxHoles).toBe(15);
  });
  it('is symmetric only when both counts are odd', () => {
    expect(skadisInfinity.isSymmetric(9, 9)).toBe(true);
    expect(skadisInfinity.isSymmetric(10, 9)).toBe(false);
    expect(skadisInfinity.isSymmetric(9, 10)).toBe(false);
    expect(skadisInfinity.isSymmetric(10, 10)).toBe(false);
  });
  it('needs mirroring on even counts', () => {
    expect(skadisInfinity.needsMirrorX(10)).toBe(true);
    expect(skadisInfinity.needsMirrorX(11)).toBe(false);
    expect(skadisInfinity.needsMirrorY(8)).toBe(true);
    expect(skadisInfinity.needsMirrorY(7)).toBe(false);
  });
});

describe('model registry', () => {
  it('registers Skadis Infinity as the default', () => {
    expect(MODELS.map((m) => m.id)).toContain('skadis-infinity');
    expect(getModel(DEFAULT_MODEL_ID).name).toBe('IKEA Skadis Infinity');
  });
  it('throws on an unknown id', () => {
    expect(() => getModel('nope')).toThrow(/unknown model/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/models/types.ts`:
```ts
/**
 * A printable pegboard model. One file per model in this folder.
 * The solver assumes sizeMm(holes) === pitchMm * (holes + 1) when it
 * enumerates board sizes, so keep that linear form.
 */
export interface BoardModel {
  id: string;
  name: string;
  /** Link to the model page, shown in the UI. */
  url: string;
  /** Hole pitch in mm. Board sizes step by this amount. */
  pitchMm: number;
  minHoles: number;
  maxHoles: number;
  /** Outer board size along one axis for the given hole count. */
  sizeMm(holes: number): number;
  /** True when the hole pattern is symmetric and the board tiles without mirroring. */
  isSymmetric(cols: number, rows: number): boolean;
  /** True when boards of this column count must alternate mirroring along X. */
  needsMirrorX(cols: number): boolean;
  /** True when boards of this row count must alternate mirroring along Y. */
  needsMirrorY(rows: number): boolean;
  /** One paragraph shown under the print list. */
  mirrorNote: string;
}
```

`src/models/skadisInfinity.ts`:
```ts
import type { BoardModel } from './types';

const PITCH_MM = 20;

export const skadisInfinity: BoardModel = {
  id: 'skadis-infinity',
  name: 'IKEA Skadis Infinity',
  url: 'https://makerworld.com/en/models/1309689-ikea-skadis-infinity',
  pitchMm: PITCH_MM,
  minHoles: 2,
  maxHoles: 15,
  sizeMm: (holes) => PITCH_MM * (holes + 1),
  isSymmetric: (cols, rows) => cols % 2 === 1 && rows % 2 === 1,
  needsMirrorX: (cols) => cols % 2 === 0,
  needsMirrorY: (rows) => rows % 2 === 0,
  mirrorNote:
    'Boards with an even hole count are not symmetric. In Bambu Studio, right-click the board, ' +
    'choose Mirror, and pick the axis listed. Lines mixing odd and even boards use the same ' +
    'alternating rule but have not been checked on a physical print.',
};
```

`src/models/index.ts`:
```ts
import type { BoardModel } from './types';
import { skadisInfinity } from './skadisInfinity';

export type { BoardModel } from './types';

/** Add new models here. Order is the order shown in the UI. */
export const MODELS: BoardModel[] = [skadisInfinity];

export const DEFAULT_MODEL_ID = skadisInfinity.id;

export function getModel(id: string): BoardModel {
  const model = MODELS.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/models`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/models
git commit -m "Add the board model interface and the Skadis Infinity model

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 4: Printer presets

**Files:**
- Create: `src/printers/index.ts`
- Test: `src/printers/index.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Printer { id: string; name: string; bedWidthMm: number; bedDepthMm: number; }
  export const PRINTERS: Printer[];            // presets only
  export const CUSTOM_PRINTER_ID = 'custom';
  export const DEFAULT_PRINTER_ID = 'a1';
  export function getPrinter(id: string, custom: { bedWidthMm: number; bedDepthMm: number }): Printer;
  ```

- [ ] **Step 1: Write the failing test**

`src/printers/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PRINTERS, getPrinter, CUSTOM_PRINTER_ID, DEFAULT_PRINTER_ID } from './index';

describe('printers', () => {
  it('has the Bambu presets', () => {
    const byId = Object.fromEntries(PRINTERS.map((p) => [p.id, p]));
    expect(byId['a1']).toMatchObject({ bedWidthMm: 256, bedDepthMm: 256 });
    expect(byId['a1-mini']).toMatchObject({ bedWidthMm: 180, bedDepthMm: 180 });
    expect(byId['p1s']).toMatchObject({ bedWidthMm: 256, bedDepthMm: 256 });
    expect(byId['x1c']).toMatchObject({ bedWidthMm: 256, bedDepthMm: 256 });
    expect(byId['h2d']).toMatchObject({ bedWidthMm: 350, bedDepthMm: 320 });
  });
  it('defaults to the A1', () => {
    expect(DEFAULT_PRINTER_ID).toBe('a1');
  });
  it('returns a preset by id', () => {
    expect(getPrinter('a1-mini', { bedWidthMm: 1, bedDepthMm: 1 }).name).toBe('Bambu Lab A1 mini');
  });
  it('builds a custom printer from the given bed', () => {
    expect(getPrinter(CUSTOM_PRINTER_ID, { bedWidthMm: 300, bedDepthMm: 200 })).toEqual({
      id: 'custom',
      name: 'Custom',
      bedWidthMm: 300,
      bedDepthMm: 200,
    });
  });
  it('throws on an unknown id', () => {
    expect(() => getPrinter('nope', { bedWidthMm: 1, bedDepthMm: 1 })).toThrow(/unknown printer/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/printers`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/printers/index.ts`:
```ts
export interface Printer {
  id: string;
  name: string;
  bedWidthMm: number;
  bedDepthMm: number;
}

/** Bed sizes in mm. Add presets here. */
export const PRINTERS: Printer[] = [
  { id: 'a1', name: 'Bambu Lab A1', bedWidthMm: 256, bedDepthMm: 256 },
  { id: 'a1-mini', name: 'Bambu Lab A1 mini', bedWidthMm: 180, bedDepthMm: 180 },
  { id: 'p1s', name: 'Bambu Lab P1S', bedWidthMm: 256, bedDepthMm: 256 },
  { id: 'x1c', name: 'Bambu Lab X1 Carbon', bedWidthMm: 256, bedDepthMm: 256 },
  { id: 'h2d', name: 'Bambu Lab H2D', bedWidthMm: 350, bedDepthMm: 320 },
];

export const CUSTOM_PRINTER_ID = 'custom';
export const DEFAULT_PRINTER_ID = 'a1';

export function getPrinter(
  id: string,
  custom: { bedWidthMm: number; bedDepthMm: number },
): Printer {
  if (id === CUSTOM_PRINTER_ID) {
    return { id, name: 'Custom', bedWidthMm: custom.bedWidthMm, bedDepthMm: custom.bedDepthMm };
  }
  const printer = PRINTERS.find((p) => p.id === id);
  if (!printer) throw new Error(`Unknown printer: ${id}`);
  return printer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/printers`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/printers
git commit -m "Add printer presets and custom bed support

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 5: Axis split solver

**Files:**
- Create: `src/solver/errors.ts`, `src/solver/axis.ts`
- Test: `src/solver/axis.test.ts`

**Interfaces:**
- Consumes: `BoardModel` from `src/models`.
- Produces:
  ```ts
  // errors.ts
  export type PlanErrorCode = 'too-small' | 'bed-too-small';
  export class PlanError extends Error { code: PlanErrorCode }
  // axis.ts
  export interface AxisSplit { holes: number[]; leftoverMm: number; }  // holes sorted descending
  export function splitAxis(lengthMm: number, bedMm: number, model: BoardModel): AxisSplit;
  ```

- [ ] **Step 1: Write the failing test**

`src/solver/axis.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { splitAxis } from './axis';
import { PlanError } from './errors';
import { skadisInfinity as model } from '../models/skadisInfinity';
import type { BoardModel } from '../models/types';

const A1 = 256;
const A1_MINI = 180;
const H2D_W = 350;

describe('splitAxis bed cap', () => {
  it('caps at 11 holes (240 mm) on a 256 mm bed', () => {
    expect(splitAxis(240, A1, model)).toEqual({ holes: [11], leftoverMm: 0 });
  });
  it('caps at 8 holes (180 mm) on a 180 mm bed', () => {
    expect(splitAxis(180, A1_MINI, model)).toEqual({ holes: [8], leftoverMm: 0 });
  });
  it('caps at the model max of 15 holes on a 350 mm bed', () => {
    expect(splitAxis(320, H2D_W, model)).toEqual({ holes: [15], leftoverMm: 0 });
  });
});

describe('splitAxis board count', () => {
  it('uses ceil(length / max) boards', () => {
    expect(splitAxis(1000, A1, model).holes).toHaveLength(5);
    expect(splitAxis(480, A1, model).holes).toHaveLength(2);
    expect(splitAxis(500, A1, model).holes).toHaveLength(3);
  });
  it('reports leftover below one pitch', () => {
    expect(splitAxis(1015, A1, model).leftoverMm).toBe(15);
    expect(splitAxis(1000, A1, model).leftoverMm).toBe(0);
  });
});

describe('splitAxis tie-breaks', () => {
  it('prefers symmetric (odd) boards and a single size: 1000 mm on A1 -> five 9-hole boards', () => {
    expect(splitAxis(1000, A1, model).holes).toEqual([9, 9, 9, 9, 9]);
  });
  it('prefers fewer distinct sizes when odd counts are equal', () => {
    // 600 mm on A1: 3 boards, 30 units. [10,10,10] units = 9 holes each.
    expect(splitAxis(600, A1, model).holes).toEqual([9, 9, 9]);
  });
  it('returns holes sorted descending with the fewest even boards possible', () => {
    // 500 mm on A1: 25 units, 3 boards. 25 is odd so three odd-hole (even-unit)
    // boards are impossible; one even board is unavoidable. Among the one-even
    // candidates with two distinct sizes, larger-first picks units [10, 10, 5].
    expect(splitAxis(500, A1, model).holes).toEqual([9, 9, 4]);
  });
  it('falls back to even boards when odd cannot fill: 260 mm on A1', () => {
    // 13 units, 2 boards. Options: [10,3]->9,2 holes; [8,5]->7,4; [7,6]->6,5; [9,4]->8,3; [11,2] invalid.
    // Best: one even hole count is unavoidable; fewest even = 1, then fewest distinct, then larger first.
    expect(splitAxis(260, A1, model).holes).toEqual([9, 2]);
  });
});

describe('splitAxis errors', () => {
  it('throws too-small when the space is under the smallest board', () => {
    expect(() => splitAxis(59, A1, model)).toThrow(PlanError);
    try {
      splitAxis(59, A1, model);
    } catch (e) {
      expect((e as PlanError).code).toBe('too-small');
    }
  });
  it('throws bed-too-small when the bed cannot fit the smallest board', () => {
    try {
      splitAxis(1000, 59, model);
      throw new Error('did not throw');
    } catch (e) {
      expect((e as PlanError).code).toBe('bed-too-small');
    }
  });
  it('drops a board when an exact cover is impossible', () => {
    // A model with only one size (3 holes = 4 units) on a 100 mm space: 5 units.
    const rigid: BoardModel = { ...model, minHoles: 3, maxHoles: 3 };
    expect(splitAxis(100, A1, rigid)).toEqual({ holes: [3], leftoverMm: 20 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/solver/axis.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement errors and axis split**

`src/solver/errors.ts`:
```ts
export type PlanErrorCode = 'too-small' | 'bed-too-small';

export class PlanError extends Error {
  readonly code: PlanErrorCode;

  constructor(code: PlanErrorCode, message: string) {
    super(message);
    this.name = 'PlanError';
    this.code = code;
  }
}
```

`src/solver/axis.ts`:
```ts
import type { BoardModel } from '../models/types';
import { PlanError } from './errors';

export interface AxisSplit {
  /** Hole counts per board along this axis, largest first. */
  holes: number[];
  /** Space left uncovered along this axis. Always below one board pitch unless a cover was impossible. */
  leftoverMm: number;
}

/**
 * Split one axis of the space into the fewest boards that fit the bed.
 * Works in "units" of one pitch: a board with h holes is h + 1 units long.
 */
export function splitAxis(lengthMm: number, bedMm: number, model: BoardModel): AxisSplit {
  const pitch = model.pitchMm;
  const minU = model.minHoles + 1;
  const bedHoles = Math.floor(bedMm / pitch) - 1;
  const maxU = Math.min(model.maxHoles, bedHoles) + 1;
  const smallest = model.sizeMm(model.minHoles);

  if (maxU < minU) {
    throw new PlanError(
      'bed-too-small',
      `The print bed (${bedMm} mm) cannot fit the smallest board (${smallest} mm).`,
    );
  }

  const avail = Math.floor(lengthMm / pitch);
  if (avail < minU) {
    throw new PlanError(
      'too-small',
      `The space (${lengthMm} mm) is smaller than the smallest board (${smallest} mm).`,
    );
  }

  const k = Math.ceil(avail / maxU);
  const units = k * minU > avail ? Array<number>(k - 1).fill(maxU) : bestSplit(avail, k, minU, maxU);

  const used = units.reduce((sum, u) => sum + u, 0);
  return { holes: units.map((u) => u - 1), leftoverMm: lengthMm - used * pitch };
}

/**
 * All ways to split `avail` units into `k` boards of minU..maxU, scored.
 * Enumerated as partitions of the slack (k * maxU - avail) into at most k
 * cuts of at most maxU - minU each. The slack is always below maxU, so this
 * is a handful of candidates.
 */
function bestSplit(avail: number, k: number, minU: number, maxU: number): number[] {
  const slack = k * maxU - avail;
  const maxCut = maxU - minU;
  // Declared with `as` so TypeScript does not narrow it to `null` for the closure below.
  let best = null as number[] | null;
  let bestScore: number[] = [];
  const cuts: number[] = [];

  const visit = (remaining: number, maxPart: number): void => {
    if (remaining === 0) {
      const units = Array.from({ length: k }, (_, i) => maxU - (cuts[i] ?? 0)).sort((a, b) => b - a);
      const score = scoreSplit(units);
      if (best === null || compareScores(score, bestScore) < 0) {
        best = units;
        bestScore = score;
      }
      return;
    }
    if (cuts.length === k) return;
    for (let c = Math.min(remaining, maxPart); c >= 1; c--) {
      cuts.push(c);
      visit(remaining - c, c);
      cuts.pop();
    }
  };

  visit(slack, maxCut);
  if (best === null) throw new Error('bestSplit: no candidate found');
  return best;
}

/** Lower is better. [even-hole boards, distinct sizes, -size1, -size2, ...] */
function scoreSplit(unitsDesc: number[]): number[] {
  const evenHoles = unitsDesc.filter((u) => (u - 1) % 2 === 0).length;
  const distinct = new Set(unitsDesc).size;
  return [evenHoles, distinct, ...unitsDesc.map((u) => -u)];
}

function compareScores(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/solver/axis.test.ts`
Expected: all tests pass. If the 260 mm case disagrees, print the candidates and check the scoring order (even count, then distinct, then larger first) before changing the test.

- [ ] **Step 5: Commit**

```bash
git add src/solver/errors.ts src/solver/axis.ts src/solver/axis.test.ts
git commit -m "Add the single-axis board split with symmetry tie-breaks

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 6: 2D plan with mirror flags and print groups

**Files:**
- Create: `src/solver/types.ts`, `src/solver/plan.ts`, `src/solver/index.ts`
- Test: `src/solver/plan.test.ts`

**Interfaces:**
- Consumes: `splitAxis` from Task 5, `BoardModel`, `Printer`.
- Produces (re-exported from `src/solver/index.ts`):
  ```ts
  export interface PlanRequest { widthMm: number; heightMm: number; model: BoardModel; printer: Printer; }
  export interface PlacedBoard {
    col: number; row: number; cols: number; rows: number;
    xMm: number; yMm: number; widthMm: number; heightMm: number;
    mirrorX: boolean; mirrorY: boolean;
  }
  export interface BoardGroup {
    cols: number; rows: number; mirrorX: boolean; mirrorY: boolean;
    widthMm: number; heightMm: number; count: number;
  }
  export interface Plan {
    columns: number[]; rows: number[]; boards: PlacedBoard[];
    coveredWidthMm: number; coveredHeightMm: number;
    leftoverWidthMm: number; leftoverHeightMm: number;
    groups: BoardGroup[];
  }
  export function plan(req: PlanRequest): Plan;
  export { PlanError } from './errors';
  export type { PlanErrorCode } from './errors';
  ```

- [ ] **Step 1: Write the failing test**

`src/solver/plan.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { plan, PlanError } from './index';
import { skadisInfinity as model } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const req = (widthMm: number, heightMm: number, printer = a1) => ({ widthMm, heightMm, model, printer });

describe('plan grid', () => {
  it('tiles 1000 x 600 on an A1 with 15 boards of 9 x 9', () => {
    const p = plan(req(1000, 600));
    expect(p.columns).toEqual([9, 9, 9, 9, 9]);
    expect(p.rows).toEqual([9, 9, 9]);
    expect(p.boards).toHaveLength(15);
    expect(p.coveredWidthMm).toBe(1000);
    expect(p.coveredHeightMm).toBe(600);
    expect(p.leftoverWidthMm).toBe(0);
    expect(p.leftoverHeightMm).toBe(0);
  });
  it('board count equals ceil(w / max) * ceil(h / max)', () => {
    const p = plan(req(1015, 725));
    expect(p.boards).toHaveLength(Math.ceil(1000 / 240) * Math.ceil(720 / 240));
    expect(p.leftoverWidthMm).toBe(15);
    expect(p.leftoverHeightMm).toBe(5);
  });
  it('places boards left to right, top to bottom in mm', () => {
    const p = plan(req(400, 200));
    const first = p.boards.find((b) => b.col === 0 && b.row === 0)!;
    const second = p.boards.find((b) => b.col === 1 && b.row === 0)!;
    expect(first.xMm).toBe(0);
    expect(first.yMm).toBe(0);
    expect(second.xMm).toBe(first.widthMm);
    expect(first.widthMm + second.widthMm).toBe(400);
  });
});

describe('plan mirroring', () => {
  it('alternates mirror X along a line of even boards', () => {
    // 720 mm on an A1 mini: 36 units, max 9 units (8 holes), 4 boards of 9 units = 8 holes each.
    const p = plan(req(720, 180, mini));
    expect(p.columns).toEqual([8, 8, 8, 8]);
    expect(p.boards.map((b) => b.mirrorX)).toEqual([false, true, false, true]);
    expect(p.boards.every((b) => b.mirrorY === false)).toBe(true);
  });
  it('alternates mirror Y down a column of even boards', () => {
    const p = plan(req(180, 720, mini));
    expect(p.rows).toEqual([8, 8, 8, 8]);
    expect(p.boards.map((b) => b.mirrorY)).toEqual([false, true, false, true]);
  });
  it('carries the flag across odd boards in a mixed line', () => {
    // 260 mm on A1 -> columns [9, 2]. 9 is odd (no mirror), 2 is even and first in the flag sequence.
    const p = plan(req(260, 80));
    expect(p.columns).toEqual([9, 2]);
    expect(p.boards.map((b) => b.mirrorX)).toEqual([false, false]);
  });
  it('never mirrors symmetric boards', () => {
    const p = plan(req(1000, 600));
    expect(p.boards.every((b) => !b.mirrorX && !b.mirrorY)).toBe(true);
  });
});

describe('plan groups', () => {
  it('groups identical boards and splits mirrored variants', () => {
    const p = plan(req(720, 360, mini));
    // 4 columns of 8 holes (alternating mirror X), 2 rows of 8 holes (second row mirror Y).
    expect(p.groups).toEqual([
      { cols: 8, rows: 8, mirrorX: false, mirrorY: false, widthMm: 180, heightMm: 180, count: 2 },
      { cols: 8, rows: 8, mirrorX: true, mirrorY: false, widthMm: 180, heightMm: 180, count: 2 },
      { cols: 8, rows: 8, mirrorX: false, mirrorY: true, widthMm: 180, heightMm: 180, count: 2 },
      { cols: 8, rows: 8, mirrorX: true, mirrorY: true, widthMm: 180, heightMm: 180, count: 2 },
    ]);
  });
  it('sorts groups by area descending', () => {
    const p = plan(req(260, 260));
    expect(p.groups[0]).toMatchObject({ cols: 9, rows: 9, count: 1 });
    expect(p.groups.at(-1)).toMatchObject({ cols: 2, rows: 2, count: 1 });
    expect(p.groups.reduce((n, g) => n + g.count, 0)).toBe(4);
  });
});

describe('plan errors', () => {
  it('propagates PlanError for a too-small space', () => {
    expect(() => plan(req(50, 600))).toThrow(PlanError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/solver/plan.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/solver/types.ts`:
```ts
import type { BoardModel } from '../models/types';
import type { Printer } from '../printers';

export interface PlanRequest {
  widthMm: number;
  heightMm: number;
  model: BoardModel;
  printer: Printer;
}

export interface PlacedBoard {
  /** Grid indices, 0-based, left to right and top to bottom. */
  col: number;
  row: number;
  /** Hole counts. */
  cols: number;
  rows: number;
  /** Position and size in mm, origin top-left of the space. */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  mirrorX: boolean;
  mirrorY: boolean;
}

export interface BoardGroup {
  cols: number;
  rows: number;
  mirrorX: boolean;
  mirrorY: boolean;
  widthMm: number;
  heightMm: number;
  count: number;
}

export interface Plan {
  /** Hole columns per grid column, left to right. */
  columns: number[];
  /** Hole rows per grid row, top to bottom. */
  rows: number[];
  boards: PlacedBoard[];
  coveredWidthMm: number;
  coveredHeightMm: number;
  leftoverWidthMm: number;
  leftoverHeightMm: number;
  /** Print list, largest area first, unmirrored before mirrored. */
  groups: BoardGroup[];
}
```

`src/solver/plan.ts`:
```ts
import { splitAxis } from './axis';
import type { BoardGroup, PlacedBoard, Plan, PlanRequest } from './types';

export function plan(req: PlanRequest): Plan {
  const { model, printer } = req;
  const x = splitAxis(req.widthMm, printer.bedWidthMm, model);
  const y = splitAxis(req.heightMm, printer.bedDepthMm, model);

  const colWidths = x.holes.map((h) => model.sizeMm(h));
  const rowHeights = y.holes.map((h) => model.sizeMm(h));
  const colX = prefixSums(colWidths);
  const rowY = prefixSums(rowHeights);
  const mirrorXByCol = carryFlags(x.holes, (h) => model.needsMirrorX(h));
  const mirrorYByRow = carryFlags(y.holes, (h) => model.needsMirrorY(h));

  const boards: PlacedBoard[] = [];
  for (let row = 0; row < y.holes.length; row++) {
    for (let col = 0; col < x.holes.length; col++) {
      boards.push({
        col,
        row,
        cols: x.holes[col],
        rows: y.holes[row],
        xMm: colX[col],
        yMm: rowY[row],
        widthMm: colWidths[col],
        heightMm: rowHeights[row],
        mirrorX: mirrorXByCol[col],
        mirrorY: mirrorYByRow[row],
      });
    }
  }

  return {
    columns: x.holes,
    rows: y.holes,
    boards,
    coveredWidthMm: req.widthMm - x.leftoverMm,
    coveredHeightMm: req.heightMm - y.leftoverMm,
    leftoverWidthMm: x.leftoverMm,
    leftoverHeightMm: y.leftoverMm,
    groups: groupBoards(boards),
  };
}

/** [0, a, a+b, ...] without the final total. */
function prefixSums(values: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of values) {
    out.push(acc);
    acc += v;
  }
  return out;
}

/**
 * Walk a line of boards. Boards that need mirroring take the current flag
 * and toggle it; boards that do not need it leave the flag alone.
 * A line of identical even boards becomes false, true, false, true...
 */
function carryFlags(holes: number[], needsMirror: (h: number) => boolean): boolean[] {
  let flag = false;
  return holes.map((h) => {
    if (!needsMirror(h)) return false;
    const mirrored = flag;
    flag = !flag;
    return mirrored;
  });
}

function groupBoards(boards: PlacedBoard[]): BoardGroup[] {
  const groups = new Map<string, BoardGroup>();
  for (const b of boards) {
    const key = `${b.cols}x${b.rows}:${b.mirrorX}:${b.mirrorY}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        cols: b.cols,
        rows: b.rows,
        mirrorX: b.mirrorX,
        mirrorY: b.mirrorY,
        widthMm: b.widthMm,
        heightMm: b.heightMm,
        count: 1,
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const area = b.widthMm * b.heightMm - a.widthMm * a.heightMm;
    if (area !== 0) return area;
    const mirrorRank = (g: BoardGroup) => (g.mirrorY ? 2 : 0) + (g.mirrorX ? 1 : 0);
    return mirrorRank(a) - mirrorRank(b);
  });
}
```

`src/solver/index.ts`:
```ts
export { plan } from './plan';
export { PlanError } from './errors';
export type { PlanErrorCode } from './errors';
export type { Plan, PlanRequest, PlacedBoard, BoardGroup } from './types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/solver`
Expected: all solver tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/solver
git commit -m "Add the 2D plan with mirror flags and grouped print list

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 7: Form state and plan computation for the UI

**Files:**
- Create: `src/ui/planState.ts`
- Test: `src/ui/planState.test.ts`

**Interfaces:**
- Consumes: `plan`, `PlanError` from `src/solver`; `getModel`, `DEFAULT_MODEL_ID`; `getPrinter`, `DEFAULT_PRINTER_ID`; `toMm`, `Unit`.
- Produces:
  ```ts
  export interface FormState {
    width: string; height: string; unit: Unit;
    modelId: string; printerId: string;
    customBedWidth: string; customBedDepth: string;
  }
  export const DEFAULT_FORM: FormState;
  export interface PlanOutcome { plan: Plan | null; error: string | null; }
  export function computePlan(form: FormState): PlanOutcome;
  ```

- [ ] **Step 1: Write the failing test**

`src/ui/planState.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computePlan, DEFAULT_FORM } from './planState';

describe('computePlan', () => {
  it('plans the defaults: 1000 x 600 mm on an A1', () => {
    const out = computePlan(DEFAULT_FORM);
    expect(out.error).toBeNull();
    expect(out.plan?.boards).toHaveLength(15);
  });
  it('converts cm input to mm', () => {
    const out = computePlan({ ...DEFAULT_FORM, width: '100', height: '60', unit: 'cm' });
    expect(out.plan?.boards).toHaveLength(15);
  });
  it('rejects empty, non-numeric and non-positive sizes', () => {
    expect(computePlan({ ...DEFAULT_FORM, width: '' }).error).toMatch(/width/i);
    expect(computePlan({ ...DEFAULT_FORM, height: 'abc' }).error).toMatch(/height/i);
    expect(computePlan({ ...DEFAULT_FORM, width: '0' }).error).toMatch(/width/i);
    expect(computePlan({ ...DEFAULT_FORM, height: '-5' }).error).toMatch(/height/i);
  });
  it('uses the custom bed when the custom printer is selected', () => {
    const out = computePlan({
      ...DEFAULT_FORM,
      printerId: 'custom',
      customBedWidth: '180',
      customBedDepth: '180',
    });
    // 1000 / 180-cap(8 holes = 180 mm) -> 6 columns, 600 -> 4 rows.
    expect(out.plan?.boards).toHaveLength(24);
  });
  it('rejects an invalid custom bed', () => {
    const out = computePlan({ ...DEFAULT_FORM, printerId: 'custom', customBedWidth: '' });
    expect(out.error).toMatch(/bed/i);
  });
  it('surfaces solver errors as messages', () => {
    const out = computePlan({ ...DEFAULT_FORM, width: '50' });
    expect(out.plan).toBeNull();
    expect(out.error).toMatch(/smaller than the smallest board/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/planState.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/ui/planState.ts`:
```ts
import { plan, PlanError, type Plan } from '../solver';
import { getModel, DEFAULT_MODEL_ID } from '../models';
import { getPrinter, DEFAULT_PRINTER_ID, CUSTOM_PRINTER_ID } from '../printers';
import { toMm, type Unit } from '../units';

export interface FormState {
  width: string;
  height: string;
  unit: Unit;
  modelId: string;
  printerId: string;
  customBedWidth: string;
  customBedDepth: string;
}

export const DEFAULT_FORM: FormState = {
  width: '1000',
  height: '600',
  unit: 'mm',
  modelId: DEFAULT_MODEL_ID,
  printerId: DEFAULT_PRINTER_ID,
  customBedWidth: '256',
  customBedDepth: '256',
};

export interface PlanOutcome {
  plan: Plan | null;
  error: string | null;
}

function parsePositive(raw: string): number | null {
  const n = Number(raw.trim());
  if (raw.trim() === '' || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function computePlan(form: FormState): PlanOutcome {
  const width = parsePositive(form.width);
  if (width === null) return { plan: null, error: 'Enter a width greater than zero.' };
  const height = parsePositive(form.height);
  if (height === null) return { plan: null, error: 'Enter a height greater than zero.' };

  let bedWidthMm = 0;
  let bedDepthMm = 0;
  if (form.printerId === CUSTOM_PRINTER_ID) {
    const w = parsePositive(form.customBedWidth);
    const d = parsePositive(form.customBedDepth);
    if (w === null || d === null) return { plan: null, error: 'Enter a bed width and depth greater than zero.' };
    bedWidthMm = w;
    bedDepthMm = d;
  }

  try {
    const result = plan({
      widthMm: toMm(width, form.unit),
      heightMm: toMm(height, form.unit),
      model: getModel(form.modelId),
      printer: getPrinter(form.printerId, { bedWidthMm, bedDepthMm }),
    });
    return { plan: result, error: null };
  } catch (e) {
    if (e instanceof PlanError) return { plan: null, error: e.message };
    throw e;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/planState.test.ts`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/planState.ts src/ui/planState.test.ts
git commit -m "Add form state parsing and plan computation for the UI

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 8: Input panel, summary and App wiring

**Files:**
- Create: `src/ui/InputPanel.tsx`, `src/ui/Summary.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `FormState`, `DEFAULT_FORM`, `computePlan`; `MODELS`; `PRINTERS`, `CUSTOM_PRINTER_ID`; `UNITS`, `toMm`, `fromMm`; tokens.
- Produces:
  ```ts
  // InputPanel.tsx
  export interface InputPanelProps { form: FormState; onChange: (patch: Partial<FormState>) => void; }
  export function InputPanel(props: InputPanelProps): JSX.Element;
  // Summary.tsx
  export interface SummaryProps { plan: Plan | null; error: string | null; }
  export function Summary(props: SummaryProps): JSX.Element;
  ```
  `App` keeps `form` in state, computes `{ plan, error }` with `computePlan`, and keeps the last valid plan in a ref so an invalid edit shows the error but not an empty page. It renders `InputPanel`, `Summary`, and later `Preview` and `PrintList` inside a two-column grid.

- [ ] **Step 1: Write the failing tests**

Replace `src/ui/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the title and the default plan', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Board planner' })).toBeTruthy();
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });

  it('recomputes when the width changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '500' } });
    expect(screen.getByText(/9 boards/)).toBeTruthy();
  });

  it('shows an error and keeps the last plan on invalid input', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toMatch(/width/i);
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });

  it('reveals bed inputs for a custom printer', () => {
    render(<App />);
    expect(screen.queryByLabelText('Bed width')).toBeNull();
    fireEvent.change(screen.getByLabelText('Printer'), { target: { value: 'custom' } });
    expect(screen.getByLabelText('Bed width')).toBeTruthy();
    expect(screen.getByLabelText('Bed depth')).toBeTruthy();
  });

  it('converts the typed values when the unit changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'cm' } });
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('100');
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/App.test.tsx`
Expected: the first test passes on the title only if `15 boards` is missing; the rest fail.

- [ ] **Step 3: Implement InputPanel**

`src/ui/InputPanel.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { FormState } from './planState';
import { MODELS } from '../models';
import { PRINTERS, CUSTOM_PRINTER_ID } from '../printers';
import { UNITS, toMm, fromMm, type Unit } from '../units';
import { colors, font, radius, space } from './tokens.stylex';

export interface InputPanelProps {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: space.sm,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  label: {
    fontSize: font.sizeSm,
    color: colors.muted,
  },
  control: {
    fontSize: font.sizeMd,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: colors.border,
      ':focus': colors.accent,
    },
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    outline: 'none',
    width: '100%',
  },
});

function convert(value: string, from: Unit, to: Unit): string {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n)) return value;
  const converted = fromMm(toMm(n, from), to);
  return String(Math.round(converted * 100) / 100);
}

export function InputPanel({ form, onChange }: InputPanelProps) {
  const isCustom = form.printerId === CUSTOM_PRINTER_ID;

  const changeUnit = (unit: Unit) => {
    onChange({
      unit,
      width: convert(form.width, form.unit, unit),
      height: convert(form.height, form.unit, unit),
    });
  };

  return (
    <form {...stylex.props(styles.panel)} onSubmit={(e) => e.preventDefault()}>
      <div {...stylex.props(styles.row)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Width</span>
          <input
            {...stylex.props(styles.control)}
            type="number"
            inputMode="decimal"
            min={0}
            value={form.width}
            onChange={(e) => onChange({ width: e.target.value })}
          />
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.label)}>Height</span>
          <input
            {...stylex.props(styles.control)}
            type="number"
            inputMode="decimal"
            min={0}
            value={form.height}
            onChange={(e) => onChange({ height: e.target.value })}
          />
        </label>
      </div>

      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Unit</span>
        <select
          {...stylex.props(styles.control)}
          value={form.unit}
          onChange={(e) => changeUnit(e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Board model</span>
        <select
          {...stylex.props(styles.control)}
          value={form.modelId}
          onChange={(e) => onChange({ modelId: e.target.value })}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.label)}>Printer</span>
        <select
          {...stylex.props(styles.control)}
          value={form.printerId}
          onChange={(e) => onChange({ printerId: e.target.value })}
        >
          {PRINTERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value={CUSTOM_PRINTER_ID}>Custom bed size</option>
        </select>
      </label>

      {isCustom && (
        <div {...stylex.props(styles.row)}>
          <label {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.label)}>Bed width</span>
            <input
              {...stylex.props(styles.control)}
              type="number"
              inputMode="decimal"
              min={0}
              value={form.customBedWidth}
              onChange={(e) => onChange({ customBedWidth: e.target.value })}
            />
          </label>
          <label {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.label)}>Bed depth</span>
            <input
              {...stylex.props(styles.control)}
              type="number"
              inputMode="decimal"
              min={0}
              value={form.customBedDepth}
              onChange={(e) => onChange({ customBedDepth: e.target.value })}
            />
          </label>
        </div>
      )}
    </form>
  );
}
```

Note: the label text must be exactly `Width`, `Height`, `Unit`, `Printer`, `Bed width`, `Bed depth` because the tests query by label. Custom bed inputs are always in mm.

- [ ] **Step 4: Implement Summary**

`src/ui/Summary.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import { colors, font, radius, space } from './tokens.stylex';

export interface SummaryProps {
  plan: Plan | null;
  error: string | null;
}

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  headline: {
    fontSize: font.sizeLg,
    fontWeight: 600,
    margin: 0,
  },
  detail: {
    fontSize: font.sizeMd,
    color: colors.muted,
    margin: 0,
  },
  error: {
    fontSize: font.sizeSm,
    color: colors.danger,
    backgroundColor: '#fef2f2',
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    margin: 0,
  },
});

const mm = (n: number) => `${Math.round(n)} mm`;

export function Summary({ plan, error }: SummaryProps) {
  return (
    <div {...stylex.props(styles.wrap)}>
      {error && (
        <p role="alert" {...stylex.props(styles.error)}>
          {error}
        </p>
      )}
      {plan && (
        <>
          <p {...stylex.props(styles.headline)}>
            {plan.boards.length} {plan.boards.length === 1 ? 'board' : 'boards'}
          </p>
          <p {...stylex.props(styles.detail)}>
            Covers {mm(plan.coveredWidthMm)} × {mm(plan.coveredHeightMm)}
            {plan.leftoverWidthMm > 0 && ` · ${mm(plan.leftoverWidthMm)} left on the right`}
            {plan.leftoverHeightMm > 0 && ` · ${mm(plan.leftoverHeightMm)} left at the bottom`}
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire up App**

Replace `src/ui/App.tsx`:
```tsx
import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { InputPanel } from './InputPanel';
import { Summary } from './Summary';
import { computePlan, DEFAULT_FORM, type FormState } from './planState';
import type { Plan } from '../solver';
import { colors, font, space } from './tokens.stylex';

const styles = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
    paddingBlock: space.xl,
    paddingInline: space.lg,
  },
  inner: {
    maxWidth: 1100,
    marginInline: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  title: {
    fontSize: font.sizeLg,
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    fontSize: font.sizeMd,
    color: colors.muted,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '320px minmax(0, 1fr)',
      '@media (max-width: 800px)': 'minmax(0, 1fr)',
    },
    gap: space.lg,
    alignItems: 'start',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    minWidth: 0,
  },
});

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const lastPlan = useRef<Plan | null>(null);

  const { plan, error } = computePlan(form);
  if (plan) lastPlan.current = plan;
  const shown = plan ?? lastPlan.current;

  const onChange = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.inner)}>
        <header {...stylex.props(styles.header)}>
          <h1 {...stylex.props(styles.title)}>Board planner</h1>
          <p {...stylex.props(styles.subtitle)}>
            Enter the space you want to cover. Get the fewest printable boards that fit.
          </p>
        </header>
        <div {...stylex.props(styles.grid)}>
          <InputPanel form={form} onChange={onChange} />
          <section {...stylex.props(styles.results)}>
            <Summary plan={shown} error={error} />
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run tests and type check**

Run: `npm test -- src/ui/App.test.tsx && npm run typecheck`
Expected: 5 tests pass, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/ui
git commit -m "Add the input panel and summary and wire the plan into the app

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 9: SVG preview

**Files:**
- Create: `src/ui/Preview.tsx`
- Modify: `src/ui/App.tsx` (render `<Preview plan={shown} />` under `Summary`)
- Test: `src/ui/Preview.test.tsx`

**Interfaces:**
- Consumes: `Plan`, `PlacedBoard`; tokens.
- Produces: `export function Preview({ plan }: { plan: Plan | null }): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

`src/ui/Preview.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Preview } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });

describe('Preview', () => {
  it('renders nothing without a plan', () => {
    const { container } = render(<Preview plan={null} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('draws one rect per board plus leftover strips', () => {
    // 375 x 185 on a mini: 2 x 1 boards, 15 mm leftover right, 5 mm bottom.
    const p = plan({ widthMm: 375, heightMm: 185, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 375 185');
    expect(container.querySelectorAll('[data-board]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-leftover]')).toHaveLength(2);
  });

  it('labels boards with hole counts and marks mirrored ones', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} />);
    const labels = [...container.querySelectorAll('[data-board] text')].map((t) => t.textContent);
    expect(labels.join(' ')).toContain('8×8');
    expect(container.querySelectorAll('[data-mirror="x"]')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/Preview.test.tsx`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/ui/Preview.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import { colors, radius, space } from './tokens.stylex';

const styles = stylex.create({
  frame: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  svg: {
    display: 'block',
    width: '100%',
    height: 'auto',
    maxHeight: '60vh',
  },
});

const STROKE_COLOR = '#3730a3';
const FILL_COLOR = '#eef2ff';
const MIRROR_FILL = '#e0e7ff';
const LEFTOVER_COLOR = '#d6d3d1';
const TEXT_COLOR = '#1c1917';

function Board({ b }: { b: PlacedBoard }) {
  const fontSize = Math.min(b.widthMm, b.heightMm) * 0.14;
  const cx = b.xMm + b.widthMm / 2;
  const cy = b.yMm + b.heightMm / 2;
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel = mirror === 'xy' ? 'mirror X+Y' : mirror === 'x' ? 'mirror X' : mirror === 'y' ? 'mirror Y' : null;
  return (
    <g data-board data-mirror={mirror}>
      <rect
        x={b.xMm}
        y={b.yMm}
        width={b.widthMm}
        height={b.heightMm}
        fill={mirror ? MIRROR_FILL : FILL_COLOR}
        stroke={STROKE_COLOR}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <text x={cx} y={cy - fontSize * 0.2} fontSize={fontSize} textAnchor="middle" fill={TEXT_COLOR} fontWeight={600}>
        {b.cols}×{b.rows}
      </text>
      <text x={cx} y={cy + fontSize * 0.9} fontSize={fontSize * 0.7} textAnchor="middle" fill={TEXT_COLOR} opacity={0.7}>
        {b.widthMm}×{b.heightMm} mm
      </text>
      {mirrorLabel && (
        <text x={cx} y={cy + fontSize * 1.8} fontSize={fontSize * 0.6} textAnchor="middle" fill={STROKE_COLOR}>
          {mirrorLabel}
        </text>
      )}
    </g>
  );
}

export function Preview({ plan }: { plan: Plan | null }) {
  if (!plan) return null;
  const totalW = plan.coveredWidthMm + plan.leftoverWidthMm;
  const totalH = plan.coveredHeightMm + plan.leftoverHeightMm;
  return (
    <div {...stylex.props(styles.frame)}>
      <svg
        {...stylex.props(styles.svg)}
        viewBox={`0 0 ${totalW} ${totalH}`}
        role="img"
        aria-label="Board layout preview"
      >
        <defs>
          <pattern id="leftover-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={LEFTOVER_COLOR} strokeWidth="3" />
          </pattern>
        </defs>
        {plan.leftoverWidthMm > 0 && (
          <rect data-leftover x={plan.coveredWidthMm} y={0} width={plan.leftoverWidthMm} height={totalH} fill="url(#leftover-hatch)" />
        )}
        {plan.leftoverHeightMm > 0 && (
          <rect data-leftover x={0} y={plan.coveredHeightMm} width={plan.coveredWidthMm} height={plan.leftoverHeightMm} fill="url(#leftover-hatch)" />
        )}
        {plan.boards.map((b) => (
          <Board key={`${b.col}-${b.row}`} b={b} />
        ))}
      </svg>
    </div>
  );
}
```

SVG presentation attributes take literal colours because StyleX tokens are CSS variables and `fill` on an SVG element accepts them only via `style`; literals keep the test environment simple. Keep the hex values identical to `tokens.stylex.ts`.

Then in `src/ui/App.tsx` add `import { Preview } from './Preview';` and render `<Preview plan={shown} />` directly after `<Summary ... />` inside the results section.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Preview.tsx src/ui/Preview.test.tsx src/ui/App.tsx
git commit -m "Add the SVG wall preview with board labels and leftover strips

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 10: Print list

**Files:**
- Create: `src/ui/PrintList.tsx`
- Modify: `src/ui/App.tsx` (render `<PrintList plan={shown} model={getModel(form.modelId)} />` under `Preview`)
- Test: `src/ui/PrintList.test.tsx`

**Interfaces:**
- Consumes: `Plan`, `BoardGroup`, `BoardModel`; tokens.
- Produces: `export function PrintList({ plan, model }: { plan: Plan | null; model: BoardModel }): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

`src/ui/PrintList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintList } from './PrintList';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });

describe('PrintList', () => {
  it('renders nothing without a plan', () => {
    const { container } = render(<PrintList plan={null} model={skadisInfinity} />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('lists one row per group with size, holes, quantity and mirror', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('180 × 180 mm');
    expect(rows[0].textContent).toContain('8 × 8');
    expect(rows[0].textContent).toContain('1');
    expect(rows[0].textContent).toContain('—');
    expect(rows[1].textContent).toContain('Mirror X');
  });

  it('shows the mirror note and the model link', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} />);
    expect(screen.getByText(/right-click the board/)).toBeTruthy();
    const link = screen.getByRole('link', { name: /IKEA Skadis Infinity/ }) as HTMLAnchorElement;
    expect(link.href).toBe(skadisInfinity.url);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/PrintList.test.tsx`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/ui/PrintList.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { Plan, BoardGroup } from '../solver';
import type { BoardModel } from '../models';
import { colors, font, radius, space } from './tokens.stylex';

const styles = stylex.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  heading: {
    fontSize: font.sizeMd,
    fontWeight: 600,
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: font.sizeMd,
  },
  th: {
    textAlign: 'left',
    fontWeight: 500,
    fontSize: font.sizeSm,
    color: colors.muted,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
  },
  td: {
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
  },
  count: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  mirror: {
    display: 'inline-block',
    fontSize: font.sizeSm,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingBlock: 2,
    paddingInline: space.sm,
  },
  note: {
    fontSize: font.sizeSm,
    color: colors.muted,
    margin: 0,
    lineHeight: 1.5,
  },
  link: {
    color: colors.accent,
  },
});

function mirrorLabel(g: BoardGroup): string | null {
  if (g.mirrorX && g.mirrorY) return 'Mirror X + Y';
  if (g.mirrorX) return 'Mirror X';
  if (g.mirrorY) return 'Mirror Y';
  return null;
}

export function PrintList({ plan, model }: { plan: Plan | null; model: BoardModel }) {
  if (!plan) return null;
  return (
    <section {...stylex.props(styles.card)}>
      <h2 {...stylex.props(styles.heading)}>Print list</h2>
      <table {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th {...stylex.props(styles.th)}>Size</th>
            <th {...stylex.props(styles.th)}>Holes</th>
            <th {...stylex.props(styles.th)}>Qty</th>
            <th {...stylex.props(styles.th)}>Mirror</th>
          </tr>
        </thead>
        <tbody>
          {plan.groups.map((g) => {
            const label = mirrorLabel(g);
            return (
              <tr key={`${g.cols}x${g.rows}-${g.mirrorX}-${g.mirrorY}`}>
                <td {...stylex.props(styles.td)}>
                  {g.widthMm} × {g.heightMm} mm
                </td>
                <td {...stylex.props(styles.td)}>
                  {g.cols} × {g.rows}
                </td>
                <td {...stylex.props(styles.td, styles.count)}>{g.count}</td>
                <td {...stylex.props(styles.td)}>
                  {label ? <span {...stylex.props(styles.mirror)}>{label}</span> : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p {...stylex.props(styles.note)}>{model.mirrorNote}</p>
      <p {...stylex.props(styles.note)}>
        Files:{' '}
        <a {...stylex.props(styles.link)} href={model.url} target="_blank" rel="noreferrer">
          {model.name} on MakerWorld
        </a>
      </p>
    </section>
  );
}
```

Then in `src/ui/App.tsx`:
- add `import { PrintList } from './PrintList';` and `import { getModel } from '../models';`
- render `<PrintList plan={shown} model={getModel(form.modelId)} />` after `<Preview plan={shown} />`.

- [ ] **Step 4: Run all tests, type check, build**

Run: `npm test && npm run build`
Expected: all tests pass, `dist/` builds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/PrintList.tsx src/ui/PrintList.test.tsx src/ui/App.tsx
git commit -m "Add the grouped print list with mirror notes and model link

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 11: Visual check and README

**Files:**
- Create: `README.md`
- Modify: any `src/ui/*.tsx` only for visual fixes found in this task

- [ ] **Step 1: Run the dev server and check the page by hand**

Run: `npm run dev`
Open http://localhost:5173 and check, in this order:
1. Defaults show "15 boards", a 5 × 3 grid of 9×9 boards, an empty print list row count of 1.
2. Width 1015 shows a hatched strip on the right and "15 mm left on the right".
3. Printer "Bambu Lab A1 mini", width 720, height 360 shows alternating "mirror X" labels and four print-list rows.
4. Clearing the width shows the red alert and keeps the previous preview.
5. Narrow the window below 800 px: the input panel stacks above the results, nothing scrolls horizontally.

Fix anything broken. Common fixes: `minWidth: 0` on grid children so the SVG shrinks; `maxHeight` on the SVG so tall walls do not push the print list off screen.

- [ ] **Step 2: Write README.md**

```markdown
# Board planner

Enter the width and height of a wall area and get the fewest 3D-printable
pegboard boards that cover it, sized to your printer's bed.

First model: [IKEA Skadis Infinity](https://makerworld.com/en/models/1309689-ikea-skadis-infinity) by AU3D.

## Run

    npm install
    npm run dev       # http://localhost:5173
    npm test
    npm run build     # static output in dist/

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

Design spec: `docs/superpowers/specs/2026-09-05-skadis-board-planner-design.md`.
```

- [ ] **Step 3: Final verification and commit**

Run: `npm test && npm run build`
Expected: all green.

```bash
git add -A
git commit -m "Add README and visual polish after a manual check

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```
