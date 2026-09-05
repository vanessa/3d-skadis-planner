# Canvas Pan and Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wheel-zoom around the cursor, drag-pan, and refit (double-click or a Fit button) on the 2D preview, with labels that stay at screen size; plus the parked phone-chip wrap fix.

**Architecture:** A pure viewport module (`fit`, `zoomAt`, `panBy`, `wheelFactor`) and a `useViewport` hook that measures the stage with `ResizeObserver` and owns the interaction state. `Preview` gains `{ viewport, width, height }` and draws inside a `<g transform>`; `Canvas` wires the hook onto its stage and renders a bottom-left `CanvasToolbar`. Nothing in the solver, panel, or theme changes. The 3D branch will later wrap the stage in a `PreviewCard`; the stage's top-right corner stays free for its toggle.

**Tech Stack:** Existing Vite 8 + React 19 + TypeScript + StyleX 0.19 + Vitest 5/jsdom/Testing Library.

Spec: `docs/superpowers/specs/2026-09-05-canvas-zoom-pan-design.md`.

## Global Constraints

- Styling is StyleX only (`stylex.create` + `stylex.props`); tokens from `src/ui/tokens.stylex.ts` (`colors`, `space`, `radius`, `font`) and `src/ui/mixes.stylex.ts` (`mixes`). No CSS files, no inline `style=`.
- Viewport: `scale` in screen px per mm; `tx`/`ty` the stage-relative px position of the wall's top-left. Fit margin 24 px. Zoom range 0.5× to 16× of the fit scale. Wheel factor `exp(-delta * 0.0015)` clamped to [0.5, 2] per event, with `deltaMode` 1 scaled by 16 and 2 by 400.
- Labels at constant screen size: hole count 13 px, mm and mirror lines 11 px; shown only when the board's shorter side is at least 64 screen px (`MIN_LABEL_PX = 64`).
- Toolbar: absolutely positioned at the stage's bottom-left, 10 px inset, 28 px tall; `Fit` button with `aria-label="Fit to view"`; readout `NNN%` (`100%` at fit) with `aria-live="polite"`. Nothing is placed at the stage's top-right.
- Do not touch `src/solver`, `src/models`, `src/printers`, `src/units.ts`, `src/ui/planState.ts`, `src/ui/Panel.tsx`, `src/ui/App.tsx` (except tests), `src/ui/three/**`, `src/boards3d/**`.
- `npm test`, `npm run typecheck`, `npm run build` must pass after every task; test output warning-free.
- Commit messages: plain sentences, no conventional-commit prefixes, no "Fix X:" colon subjects. End every commit message with a blank line and then `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`. Stage specific paths (the repo root has untracked zip files and a `.claude/` directory that must stay uncommitted).

## File Structure

```
src/ui/viewport.ts            NEW pure math
src/ui/viewport.test.ts       NEW
src/ui/useViewport.ts         NEW hook
src/ui/useViewport.test.tsx   NEW
src/ui/Preview.tsx            props + <g transform> + px-based labels
src/ui/Preview.test.tsx       updated + new transform test
src/ui/CanvasToolbar.tsx      NEW
src/ui/Canvas.tsx             wires the hook, renders the toolbar
src/ui/SummaryChip.tsx        phone block flow
src/ui/App.test.tsx           + toolbar assertions
```

---

### Task 1: Pure viewport math

**Files:**
- Create: `src/ui/viewport.ts`
- Test: `src/ui/viewport.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Viewport { scale: number; tx: number; ty: number }
  export interface Size { width: number; height: number }
  export const IDENTITY: Viewport;
  export const FIT_MARGIN_PX = 24; export const ZOOM_MIN_RATIO = 0.5; export const ZOOM_MAX_RATIO = 16;
  export function fitViewport(stage: Size, world: Size, marginPx?: number): Viewport;
  export function zoomAt(v: Viewport, factor: number, point: { x: number; y: number }, fit: Viewport): Viewport;
  export function panBy(v: Viewport, dx: number, dy: number): Viewport;
  export function zoomRatio(v: Viewport, fit: Viewport): number;
  export function wheelFactor(deltaY: number, deltaMode: number): number;
  ```

- [ ] **Step 1: Write the failing test**

`src/ui/viewport.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  fitViewport, zoomAt, panBy, zoomRatio, wheelFactor, IDENTITY, ZOOM_MAX_RATIO, ZOOM_MIN_RATIO,
} from './viewport';

const stage = { width: 800, height: 600 };
const world = { width: 1000, height: 600 };

describe('fitViewport', () => {
  it('fits the wall inside the stage with a 24 px margin and centres it', () => {
    const v = fitViewport(stage, world);
    expect(v.scale).toBeCloseTo(0.752);
    expect(v.tx).toBeCloseTo(24);
    expect(v.ty).toBeCloseTo(74.4);
  });
  it('uses the limiting axis', () => {
    const v = fitViewport({ width: 800, height: 300 }, world);
    expect(v.scale).toBeCloseTo(252 / 600);
  });
  it('returns identity for a zero-sized stage or world', () => {
    expect(fitViewport({ width: 0, height: 0 }, world)).toEqual(IDENTITY);
    expect(fitViewport(stage, { width: 0, height: 10 })).toEqual(IDENTITY);
  });
  it('honours a custom margin', () => {
    const v = fitViewport(stage, world, 0);
    expect(v.scale).toBeCloseTo(0.8);
    expect(v.tx).toBeCloseTo(0);
  });
});

describe('zoomAt', () => {
  const fit = fitViewport(stage, world);
  const worldPoint = (v: { scale: number; tx: number; ty: number }, p: { x: number; y: number }) => ({
    x: (p.x - v.tx) / v.scale,
    y: (p.y - v.ty) / v.scale,
  });
  it('keeps the point under the cursor fixed', () => {
    const point = { x: 100, y: 100 };
    const before = worldPoint(fit, point);
    const v = zoomAt(fit, 2, point, fit);
    expect(v.scale).toBeCloseTo(fit.scale * 2);
    const after = worldPoint(v, point);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it('clamps to the zoom range relative to fit', () => {
    expect(zoomAt(fit, 1000, { x: 0, y: 0 }, fit).scale).toBeCloseTo(fit.scale * ZOOM_MAX_RATIO);
    expect(zoomAt(fit, 0.0001, { x: 0, y: 0 }, fit).scale).toBeCloseTo(fit.scale * ZOOM_MIN_RATIO);
  });
});

describe('panBy and zoomRatio', () => {
  it('adds the offsets', () => {
    expect(panBy({ scale: 2, tx: 10, ty: 20 }, 5, -3)).toEqual({ scale: 2, tx: 15, ty: 17 });
  });
  it('reports zoom relative to fit', () => {
    const fit = fitViewport(stage, world);
    expect(zoomRatio(fit, fit)).toBeCloseTo(1);
    expect(zoomRatio({ ...fit, scale: fit.scale * 3 }, fit)).toBeCloseTo(3);
    expect(zoomRatio(IDENTITY, { scale: 0, tx: 0, ty: 0 })).toBe(1);
  });
});

describe('wheelFactor', () => {
  it('zooms out on positive delta and in on negative', () => {
    expect(wheelFactor(100, 0)).toBeCloseTo(Math.exp(-0.15));
    expect(wheelFactor(-100, 0)).toBeCloseTo(Math.exp(0.15));
  });
  it('scales line and page delta modes', () => {
    expect(wheelFactor(3, 1)).toBeCloseTo(Math.exp(-48 * 0.0015));
    expect(wheelFactor(1, 2)).toBeCloseTo(Math.exp(-400 * 0.0015));
  });
  it('clamps a single event to [0.5, 2]', () => {
    expect(wheelFactor(-10000, 0)).toBe(2);
    expect(wheelFactor(10000, 0)).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/viewport.test.ts` → FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/ui/viewport.ts`:
```ts
/** Screen px per mm, and the stage-relative px position of the wall's top-left. */
export interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

export interface Size {
  width: number;
  height: number;
}

export const IDENTITY: Viewport = { scale: 1, tx: 0, ty: 0 };
export const FIT_MARGIN_PX = 24;
/** Zoom limits relative to the fit scale. */
export const ZOOM_MIN_RATIO = 0.5;
export const ZOOM_MAX_RATIO = 16;

const WHEEL_SENSITIVITY = 0.0015;

export function fitViewport(stage: Size, world: Size, marginPx: number = FIT_MARGIN_PX): Viewport {
  if (stage.width <= 0 || stage.height <= 0 || world.width <= 0 || world.height <= 0) return IDENTITY;
  const availW = Math.max(1, stage.width - 2 * marginPx);
  const availH = Math.max(1, stage.height - 2 * marginPx);
  const scale = Math.min(availW / world.width, availH / world.height);
  return {
    scale,
    tx: (stage.width - world.width * scale) / 2,
    ty: (stage.height - world.height * scale) / 2,
  };
}

/** Zoom by `factor` keeping the world point under `point` (stage px) fixed. */
export function zoomAt(
  v: Viewport,
  factor: number,
  point: { x: number; y: number },
  fit: Viewport,
): Viewport {
  const min = fit.scale * ZOOM_MIN_RATIO;
  const max = fit.scale * ZOOM_MAX_RATIO;
  const scale = Math.min(max, Math.max(min, v.scale * factor));
  const k = scale / v.scale;
  return {
    scale,
    tx: point.x - (point.x - v.tx) * k,
    ty: point.y - (point.y - v.ty) * k,
  };
}

export function panBy(v: Viewport, dx: number, dy: number): Viewport {
  return { scale: v.scale, tx: v.tx + dx, ty: v.ty + dy };
}

export function zoomRatio(v: Viewport, fit: Viewport): number {
  return fit.scale > 0 ? v.scale / fit.scale : 1;
}

/** Multiplicative zoom factor for one wheel event. Positive deltaY zooms out. */
export function wheelFactor(deltaY: number, deltaMode: number): number {
  const delta = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return Math.min(2, Math.max(0.5, Math.exp(-delta * WHEEL_SENSITIVITY)));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/ui/viewport.test.ts` → all pass. Then `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewport.ts src/ui/viewport.test.ts
git commit -m "Add the pure viewport math for fit, zoom and pan

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 2: The `useViewport` hook

**Files:**
- Create: `src/ui/useViewport.ts`
- Test: `src/ui/useViewport.test.tsx`

**Interfaces:**
- Consumes: `viewport.ts`.
- Produces:
  ```ts
  export interface StageHandlers {
    onPointerDown(e: React.PointerEvent<HTMLElement>): void;
    onPointerMove(e: React.PointerEvent<HTMLElement>): void;
    onPointerUp(e: React.PointerEvent<HTMLElement>): void;
    onPointerCancel(e: React.PointerEvent<HTMLElement>): void;
    onDoubleClick(): void;
  }
  export function useViewport(stageRef: RefObject<HTMLElement | null>, world: Size | null): {
    size: Size; viewport: Viewport; fit: Viewport; ratio: number; fitted: boolean; dragging: boolean;
    refit(): void; handlers: StageHandlers;
  }
  ```
  The wheel listener is attached natively (non-passive) inside the hook; it is not part of `handlers`.

- [ ] **Step 1: Write the failing test**

`src/ui/useViewport.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useViewport } from './useViewport';
import type { Size } from './viewport';

function Harness({ world }: { world: Size | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const vp = useViewport(ref, world);
  return (
    <div>
      <div data-testid="stage" ref={ref} {...vp.handlers} />
      <output data-testid="state">
        {JSON.stringify({ viewport: vp.viewport, fitted: vp.fitted, ratio: vp.ratio, size: vp.size, dragging: vp.dragging })}
      </output>
      <button type="button" onClick={vp.refit}>refit</button>
    </div>
  );
}

const read = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

let resizeCallbacks: ResizeObserverCallback[] = [];

beforeEach(() => {
  resizeCallbacks = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        resizeCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}),
  } as DOMRect);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const world = { width: 1000, height: 600 };

describe('useViewport', () => {
  it('starts fitted to the measured stage', () => {
    render(<Harness world={world} />);
    const s = read();
    expect(s.size).toEqual({ width: 800, height: 600 });
    expect(s.fitted).toBe(true);
    expect(s.viewport.scale).toBeCloseTo(0.752);
    expect(s.ratio).toBeCloseTo(1);
  });

  it('zooms in around the cursor on wheel and leaves the fitted state', () => {
    render(<Harness world={world} />);
    const stage = screen.getByTestId('stage');
    act(() => {
      fireEvent.wheel(stage, { deltaY: -100, deltaMode: 0, clientX: 100, clientY: 100 });
    });
    const s = read();
    expect(s.fitted).toBe(false);
    expect(s.viewport.scale).toBeCloseTo(0.752 * Math.exp(0.15));
    expect(s.ratio).toBeCloseTo(Math.exp(0.15));
  });

  it('pans on pointer drag past the 3 px threshold and stops on pointer up', () => {
    render(<Harness world={world} />);
    const stage = screen.getByTestId('stage');
    const before = read().viewport;
    fireEvent.pointerDown(stage, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 101, clientY: 101 });
    expect(read().viewport).toEqual(before);
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 110, clientY: 105 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 130, clientY: 125 });
    let s = read();
    expect(s.dragging).toBe(true);
    expect(s.fitted).toBe(false);
    expect(s.viewport.tx).toBeCloseTo(before.tx + 30);
    expect(s.viewport.ty).toBeCloseTo(before.ty + 25);
    fireEvent.pointerUp(stage, { pointerId: 1 });
    s = read();
    expect(s.dragging).toBe(false);
  });

  it('refits on double-click and on the refit callback', () => {
    render(<Harness world={world} />);
    const stage = screen.getByTestId('stage');
    act(() => {
      fireEvent.wheel(stage, { deltaY: -100, deltaMode: 0, clientX: 0, clientY: 0 });
    });
    expect(read().fitted).toBe(false);
    fireEvent.doubleClick(stage);
    expect(read().fitted).toBe(true);
    expect(read().viewport.scale).toBeCloseTo(0.752);
    act(() => {
      fireEvent.wheel(stage, { deltaY: -100, deltaMode: 0, clientX: 0, clientY: 0 });
    });
    fireEvent.click(screen.getByRole('button', { name: 'refit' }));
    expect(read().fitted).toBe(true);
  });

  it('refits when the world size changes', () => {
    const { rerender } = render(<Harness world={world} />);
    const stage = screen.getByTestId('stage');
    act(() => {
      fireEvent.wheel(stage, { deltaY: -100, deltaMode: 0, clientX: 0, clientY: 0 });
    });
    rerender(<Harness world={{ width: 2000, height: 600 }} />);
    const s = read();
    expect(s.fitted).toBe(true);
    expect(s.viewport.scale).toBeCloseTo(752 / 2000);
  });

  it('re-measures when the ResizeObserver fires', () => {
    render(<Harness world={world} />);
    (HTMLElement.prototype.getBoundingClientRect as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON: () => ({}),
    } as DOMRect);
    act(() => {
      resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
    });
    expect(read().size).toEqual({ width: 400, height: 300 });
    expect(read().viewport.scale).toBeCloseTo(352 / 1000);
  });

  it('renders identity with a null world', () => {
    render(<Harness world={null} />);
    expect(read().viewport).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/useViewport.test.tsx` → FAIL, cannot find module.

- [ ] **Step 3: Implement**

`src/ui/useViewport.ts`:
```ts
import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type PointerEvent as ReactPointerEvent, type RefObject,
} from 'react';
import {
  fitViewport, panBy, wheelFactor, zoomAt, zoomRatio, IDENTITY, type Size, type Viewport,
} from './viewport';

export interface StageHandlers {
  onPointerDown(e: ReactPointerEvent<HTMLElement>): void;
  onPointerMove(e: ReactPointerEvent<HTMLElement>): void;
  onPointerUp(e: ReactPointerEvent<HTMLElement>): void;
  onPointerCancel(e: ReactPointerEvent<HTMLElement>): void;
  onDoubleClick(): void;
}

const DRAG_THRESHOLD_PX = 3;

interface Drag {
  id: number;
  x: number;
  y: number;
  moved: boolean;
}

export function useViewport(stageRef: RefObject<HTMLElement | null>, world: Size | null) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [fitted, setFitted] = useState(true);
  const [view, setView] = useState<Viewport>(IDENTITY);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<Drag | null>(null);

  const worldW = world?.width ?? 0;
  const worldH = world?.height ?? 0;
  const fit = useMemo(() => fitViewport(size, { width: worldW, height: worldH }), [size, worldW, worldH]);
  const fitRef = useRef(fit);
  fitRef.current = fit;

  // Measure the stage now and whenever it resizes.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [stageRef]);

  // A new wall size always refits.
  useEffect(() => {
    setFitted(true);
  }, [worldW, worldH]);

  // While fitted, the view tracks the fit (before paint, so there is no flash).
  useLayoutEffect(() => {
    if (fitted) setView(fit);
  }, [fitted, fit]);

  // Wheel must be non-passive to prevent page scroll and browser zoom.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const point = { x: e.clientX - r.left, y: e.clientY - r.top };
      const factor = wheelFactor(e.deltaY, e.deltaMode);
      setView((prev) => zoomAt(prev, factor, point, fitRef.current));
      setFitted(false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stageRef]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      setDragging(true);
      setFitted(false);
    }
    d.x = e.clientX;
    d.y = e.clientY;
    setView((prev) => panBy(prev, dx, dy));
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const refit = useCallback(() => setFitted(true), []);

  const handlers: StageHandlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onDoubleClick: refit }),
    [onPointerDown, onPointerMove, endDrag, refit],
  );

  const viewport = fitted ? fit : view;
  return { size, viewport, fit, ratio: zoomRatio(viewport, fit), fitted, dragging, refit, handlers };
}
```
Note: `viewport` is derived as `fitted ? fit : view` so the fitted state is exact on the same render; the layout effect keeps `view` in sync so the first wheel/drag starts from the fit.

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/ui/useViewport.test.tsx` → all pass, no act() warnings. Then `npm run typecheck`. If jsdom's `PointerEvent` lacks `pointerId` in `fireEvent.pointerDown`, Testing Library falls back to a `MouseEvent`; in that case set `pointerId` via `Object.defineProperty` on the event init or use `fireEvent(stage, new PointerEvent('pointerdown', {...}))` — report which was needed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useViewport.ts src/ui/useViewport.test.tsx
git commit -m "Add the viewport hook with wheel zoom, drag pan and refit

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 3: Preview draws through the viewport with screen-sized labels

**Files:**
- Modify: `src/ui/Preview.tsx`, `src/ui/Preview.test.tsx`, `src/ui/Canvas.tsx` (only to pass the new props so it compiles: `viewport={IDENTITY} width={0} height={0}`; Task 4 replaces this)

**Interfaces:**
- Produces: `Preview({ plan, viewport, width, height }: { plan: Plan | null; viewport: Viewport; width: number; height: number })`. With `width`/`height` 0 it renders exactly as before (mm `viewBox`, identity transform), so existing DOM assertions hold.

- [ ] **Step 1: Update and extend the tests (failing first)**

In `src/ui/Preview.test.tsx`: import `IDENTITY` from `./viewport`; change every `<Preview plan={…} />` to `<Preview plan={…} viewport={IDENTITY} width={0} height={0} />`. Add:
```tsx
  it('draws through the viewport transform with screen-sized labels', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 }) });
    const { container } = render(<Preview plan={p} viewport={{ scale: 2, tx: 10, ty: 20 }} width={1000} height={600} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 600');
    const g = container.querySelector('svg > g[transform]')!;
    expect(g.getAttribute('transform')).toBe('translate(10 20) scale(2)');
    const texts = container.querySelectorAll('[data-board] text');
    expect(Number(texts[0].getAttribute('font-size'))).toBeCloseTo(13 / 2);
    expect(Number(texts[1].getAttribute('font-size'))).toBeCloseTo(11 / 2);
  });

  it('omits labels when the board is under 64 screen px', () => {
    // 200 mm boards at scale 0.3 are 60 px wide.
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 }) });
    const { container } = render(<Preview plan={p} viewport={{ scale: 0.3, tx: 0, ty: 0 }} width={1000} height={600} />);
    expect(container.querySelectorAll('[data-board]')).toHaveLength(15);
    expect(container.querySelectorAll('[data-board] text')).toHaveLength(0);
  });
```
The existing "under 80 mm" tests keep passing with identity (60 mm → 60 px < 64 → no labels; 80 mm → 80 px → labels); rename them to say "64 px" if you like.

- [ ] **Step 2: Run to see the new tests fail**

Run: `npm test -- src/ui/Preview.test.tsx`.

- [ ] **Step 3: Implement**

`src/ui/Preview.tsx` — replace the constants, `Board`, and `Preview`:
```tsx
import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { IDENTITY, type Viewport } from './viewport';

/** Boards narrower than this on screen get no labels. */
const MIN_LABEL_PX = 64;
const LABEL_PX = 13;
const DETAIL_PX = 11;
const HATCH_PX = 8;

// styles unchanged from the port (svg, board, boardMirrored, value, detail, outline, hatch)

function Board({ b, scale }: { b: PlacedBoard; scale: number }) {
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel =
    mirror === 'xy' ? 'mirror X+Y' : mirror === 'x' ? 'mirror X' : mirror === 'y' ? 'mirror Y' : null;
  const showLabels = Math.min(b.widthMm, b.heightMm) * scale >= MIN_LABEL_PX;
  const fs = LABEL_PX / scale;
  const ds = DETAIL_PX / scale;
  const cx = b.xMm + b.widthMm / 2;
  const cy = b.yMm + b.heightMm / 2;
  return (
    <g data-board data-mirror={mirror}>
      <rect
        {...stylex.props(styles.board, mirror !== undefined && styles.boardMirrored)}
        x={b.xMm} y={b.yMm} width={b.widthMm} height={b.heightMm}
        vectorEffect="non-scaling-stroke"
      />
      {showLabels && (
        <>
          <text {...stylex.props(styles.value)} x={cx} y={cy - 2 / scale} fontSize={fs} textAnchor="middle">
            {b.cols}×{b.rows}
          </text>
          <text {...stylex.props(styles.detail)} x={cx} y={cy + 12 / scale} fontSize={ds} textAnchor="middle">
            {b.widthMm}×{b.heightMm} mm
          </text>
          {mirrorLabel && (
            <text {...stylex.props(styles.detail)} x={cx} y={cy + 25 / scale} fontSize={ds} textAnchor="middle">
              {mirrorLabel}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function Preview({
  plan, viewport, width, height,
}: { plan: Plan | null; viewport: Viewport; width: number; height: number }) {
  const hatchId = useId();
  if (!plan) return null;
  const totalW = plan.coveredWidthMm + plan.leftoverWidthMm;
  const totalH = plan.coveredHeightMm + plan.leftoverHeightMm;
  const hasLayout = width > 0 && height > 0;
  const v = hasLayout ? viewport : IDENTITY;
  const s = v.scale;
  const viewBox = hasLayout ? `0 0 ${width} ${height}` : `0 0 ${totalW} ${totalH}`;
  const hatch = HATCH_PX / s;
  return (
    <svg {...stylex.props(styles.svg)} viewBox={viewBox} role="img" aria-label="Board layout preview">
      <defs>
        <pattern id={hatchId} width={hatch} height={hatch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line {...stylex.props(styles.hatch)} x1={hatch / 2} y1={0} x2={hatch / 2} y2={hatch} strokeWidth={3 / s} />
        </pattern>
      </defs>
      <g transform={`translate(${v.tx} ${v.ty}) scale(${s})`}>
        {plan.leftoverWidthMm > 0 && (
          <rect data-leftover x={plan.coveredWidthMm} y={0} width={plan.leftoverWidthMm} height={totalH} fill={`url(#${hatchId})`} />
        )}
        {plan.leftoverHeightMm > 0 && (
          <rect data-leftover x={0} y={plan.coveredHeightMm} width={plan.coveredWidthMm} height={plan.leftoverHeightMm} fill={`url(#${hatchId})`} />
        )}
        {plan.boards.map((b) => (
          <Board key={`${b.col}-${b.row}`} b={b} scale={s} />
        ))}
        <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
```
Keep the `styles` block from the port unchanged. The transform string must be exactly `translate(${tx} ${ty}) scale(${s})` (space-separated, no commas) for the test.

In `src/ui/Canvas.tsx`, for now pass `viewport={IDENTITY} width={0} height={0}` (import `IDENTITY` from `./viewport`) so it compiles; Task 4 wires the real values.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run typecheck && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Preview.tsx src/ui/Preview.test.tsx src/ui/Canvas.tsx
git commit -m "Draw the preview through a viewport transform with screen-sized labels

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 4: Wire the stage, add the toolbar, fix the phone chip

**Files:**
- Create: `src/ui/CanvasToolbar.tsx`
- Modify: `src/ui/Canvas.tsx`, `src/ui/SummaryChip.tsx`, `src/ui/App.test.tsx`

**Interfaces:**
- Produces: `CanvasToolbar({ ratio, onFit, children? }: { ratio: number; onFit: () => void; children?: ReactNode })`.

- [ ] **Step 1: Add the failing App tests**

In `src/ui/App.test.tsx`:
```tsx
  it('shows the fit control and zoom readout on the canvas', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Fit to view' })).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });
```
Run: `npm test -- src/ui/App.test.tsx` → the new test fails.

- [ ] **Step 2: Implement CanvasToolbar**

`src/ui/CanvasToolbar.tsx`:
```tsx
import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  bar: {
    position: 'absolute',
    left: '10px',
    bottom: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: '28px',
    paddingInline: space.xs,
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.sm,
    userSelect: 'none',
    cursor: 'default',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '20px',
    paddingInline: space.sm,
    borderRadius: radius.sm,
    borderWidth: 0,
    backgroundColor: { default: 'transparent', ':hover': colors.mutedBg },
    color: colors.text,
    fontSize: font.sm,
    fontWeight: 500,
    cursor: 'default',
    outlineWidth: { default: '0px', ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '1px',
  },
  readout: {
    minWidth: '40px',
    textAlign: 'end',
    paddingInlineEnd: space.xs,
    color: colors.muted,
    fontVariantNumeric: 'tabular-nums',
  },
});

export function CanvasToolbar({
  ratio, onFit, children,
}: { ratio: number; onFit: () => void; children?: ReactNode }) {
  return (
    <div
      {...stylex.props(styles.bar)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <button type="button" aria-label="Fit to view" onClick={onFit} {...stylex.props(styles.button)}>
        Fit
      </button>
      <span aria-live="polite" {...stylex.props(styles.readout)}>
        {Math.round(ratio * 100)}%
      </span>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Wire Canvas**

In `src/ui/Canvas.tsx`:
```tsx
import { useRef } from 'react';
// … existing imports …
import { useViewport } from './useViewport';
import { CanvasToolbar } from './CanvasToolbar';

// add to styles:
  stage: {
    // existing position/inset/flex properties, plus:
    overflow: 'hidden',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'grab',
  },
  dragging: {
    cursor: 'grabbing',
  },

export function Canvas({ plan, error }: { plan: Plan | null; error: string | null }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const world = plan
    ? { width: plan.coveredWidthMm + plan.leftoverWidthMm, height: plan.coveredHeightMm + plan.leftoverHeightMm }
    : null;
  const { size, viewport, ratio, refit, handlers, dragging } = useViewport(stageRef, world);
  return (
    <main {...stylex.props(styles.canvas)}>
      <div {...stylex.props(styles.chip)}>
        <SummaryChip plan={plan} error={error} />
      </div>
      <div ref={stageRef} {...handlers} {...stylex.props(styles.stage, dragging && styles.dragging)}>
        <Preview plan={plan} viewport={viewport} width={size.width} height={size.height} />
        {plan && <CanvasToolbar ratio={ratio} onFit={refit} />}
      </div>
    </main>
  );
}
```
Remove the temporary `IDENTITY` import from Task 3. Keep the rest of Canvas (dot grid, chip position, stage geometry, `<main>`) exactly as it is. The stage `div` must stay a single element with the `stage` style so the 3D branch can wrap it.

- [ ] **Step 4: Phone chip block flow**

In `src/ui/SummaryChip.tsx`, on the `chip` style change `display: 'inline-flex'` to `display: { default: 'inline-flex', '@media (max-width: 800px)': 'block' }` and add `lineHeight: '18px'` so the wrapped lines read evenly. Nothing else changes; the chip text and `data-testid` stay.

- [ ] **Step 5: Run everything**

Run: `npm test && npm run typecheck && npm run build` → all pass; no act() warnings from the new hook in `App.test.tsx` (jsdom has no `ResizeObserver`, so the hook measures once and stops).

- [ ] **Step 6: Commit**

```bash
git add src/ui/CanvasToolbar.tsx src/ui/Canvas.tsx src/ui/SummaryChip.tsx src/ui/App.test.tsx
git commit -m "Wire pan and zoom onto the canvas stage with a fit toolbar

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 5: Screenshot check

**Files:**
- Modify: `src/ui/*.tsx` only for real visual breakage found

- [ ] **Step 1: Capture**

Dev server on a free port; Playwright from a scratch folder outside the repo (Chromium at `~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`). Capture into `/home/vanessa/Projects/3d-planner/.superpowers/sdd/2026-09-05-canvas-zoom-pan/shots/`:
1. `fit.png` — defaults, 1280×900; assert the readout reads `100%`.
2. `zoomed.png` — after `page.mouse.wheel(0, -600)` with the mouse over the stage centre; assert the readout is above `100%` and the hovered board labels are still 13 px (`getComputedStyle` on a `[data-board] text` gives `font-size` in user units; compare `Number(fontSize) * scale ≈ 13` via the `g` transform).
3. `panned.png` — after `page.mouse.down(); page.mouse.move(+200, +100, { steps: 5 }); page.mouse.up()`; assert the `g` transform's translate changed by about (200, 100).
4. `refit.png` — after clicking `Fit to view`; readout `100%`.
5. `light-zoomed.png` — light theme, zoomed.
6. `phone-chip.png` — 390×844, width 1015, height 725; the chip text flows as one wrapped block; no horizontal scroll.

Judge each image: toolbar legible and not overlapping the wall at fit; labels stay crisp and constant-size; hatch density constant; nothing at the stage's top-right.

- [ ] **Step 2: Verify and commit any fixes**

Run: `npm test && npm run typecheck && npm run build`. Commit only if something changed:
```bash
git add src/ui
git commit -m "Adjust the zoom toolbar after a screenshot check

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```
