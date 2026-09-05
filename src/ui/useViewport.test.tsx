import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, createEvent, act } from '@testing-library/react';
import { useViewport } from './useViewport';
import type { Size } from './viewport';

function Harness({ world, show = true }: { world: Size | null; show?: boolean }) {
  const vp = useViewport(world);
  return (
    <div>
      {show && <div data-testid="stage" ref={vp.stageRef} {...vp.handlers} />}
      <output data-testid="state">
        {JSON.stringify({ viewport: vp.viewport, fitted: vp.fitted, ratio: vp.ratio, size: vp.size, dragging: vp.dragging })}
      </output>
      <button type="button" onClick={vp.refit}>refit</button>
    </div>
  );
}

const read = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

let resizeCallbacks: ResizeObserverCallback[] = [];
let resizeObserverConstructions = 0;

beforeEach(() => {
  resizeCallbacks = [];
  resizeObserverConstructions = 0;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        resizeObserverConstructions += 1;
        resizeCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 24, y: 56, left: 24, top: 56, right: 824, bottom: 656, width: 800, height: 600, toJSON: () => ({}),
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
    let ev!: Event;
    act(() => {
      ev = createEvent.wheel(stage, { deltaY: -100, deltaMode: 0, clientX: 124, clientY: 156 });
      fireEvent(stage, ev);
    });
    expect(ev.defaultPrevented).toBe(true);
    const s = read();
    expect(s.fitted).toBe(false);
    expect(s.viewport.scale).toBeCloseTo(0.752 * Math.exp(0.15));
    expect(s.ratio).toBeCloseTo(Math.exp(0.15));
    const k = Math.exp(0.15);
    expect(s.viewport.tx).toBeCloseTo(100 - (100 - 24) * k);
    expect(s.viewport.ty).toBeCloseTo(100 - (100 - 74.4) * k);
  });

  it('pans on pointer drag past the 3 px threshold and stops on pointer up', () => {
    render(<Harness world={world} />);
    const stage = screen.getByTestId('stage');
    const before = read().viewport;
    fireEvent.pointerDown(stage, { button: 0, buttons: 1, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, buttons: 1, clientX: 101, clientY: 101 });
    expect(read().viewport).toEqual(before);
    fireEvent.pointerMove(stage, { pointerId: 1, buttons: 1, clientX: 110, clientY: 105 });
    fireEvent.pointerMove(stage, { pointerId: 1, buttons: 1, clientX: 130, clientY: 125 });
    let s = read();
    expect(s.dragging).toBe(true);
    expect(s.fitted).toBe(false);
    expect(s.viewport.tx).toBeCloseTo(before.tx + 30);
    expect(s.viewport.ty).toBeCloseTo(before.ty + 25);
    fireEvent.pointerUp(stage, { pointerId: 1 });
    s = read();
    expect(s.dragging).toBe(false);
  });

  it('releases pointer capture when the primary button vanishes without a pointerup', () => {
    render(<Harness world={world} />);
    const stage = screen.getByTestId('stage');
    fireEvent.pointerDown(stage, { button: 0, buttons: 1, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, buttons: 1, clientX: 130, clientY: 125 });
    expect(read().dragging).toBe(true);
    fireEvent.pointerMove(stage, { pointerId: 1, buttons: 0, clientX: 140, clientY: 135 });
    expect(read().dragging).toBe(false);
    expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalledWith(1);
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
    expect(read().viewport.scale).toBeCloseTo(0.752 * Math.exp(0.15));
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
      x: 24, y: 56, left: 24, top: 56, right: 424, bottom: 356, width: 400, height: 300, toJSON: () => ({}),
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

  it('re-measures and re-attaches the wheel listener when the stage element is swapped out', () => {
    const { rerender } = render(<Harness world={world} show />);
    const stageBefore = screen.getByTestId('stage');
    act(() => {
      fireEvent.wheel(stageBefore, { deltaY: -100, deltaMode: 0, clientX: 0, clientY: 0 });
    });
    const scaleAfterFirstWheel = read().viewport.scale;
    expect(scaleAfterFirstWheel).toBeCloseTo(0.752 * Math.exp(0.15));

    // Unmount the stage element (as happens when a parallel PreviewCard hides
    // it in 3D mode) and remount a brand-new node (2D mode again).
    rerender(<Harness world={world} show={false} />);
    rerender(<Harness world={world} show />);

    const s = read();
    expect(s.size).toEqual({ width: 800, height: 600 });

    const stageAfter = screen.getByTestId('stage');
    act(() => {
      fireEvent.wheel(stageAfter, { deltaY: -100, deltaMode: 0, clientX: 0, clientY: 0 });
    });
    expect(read().viewport.scale).not.toBeCloseTo(scaleAfterFirstWheel);
    expect(resizeObserverConstructions).toBe(2);
  });
});
