import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Canvas } from './Canvas';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

vi.mock('./three/BoardScene', () => ({
  default: ({ plan }: { plan: { boards: unknown[] } }) => (
    <div data-testid="board-scene">{plan.boards.length} boards in 3D</div>
  ),
}));

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });

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
      observe() {
        resizeCallbacks.forEach((cb) => cb([] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver));
      }
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

// The surface div (ref={stageRef} from useViewport) is not directly queryable
// by role or text. It is the grandparent of the "Fit to view" button: the
// button lives inside CanvasToolbar's own wrapper div, which is a direct
// child of the surface div rendered by Canvas.
function getSurface(): HTMLElement {
  const fitButton = screen.getByRole('button', { name: 'Fit to view' });
  const surface = fitButton.parentElement?.parentElement;
  if (!surface) throw new Error('could not locate the surface div from the Fit to view button');
  return surface;
}

describe('Canvas', () => {
  it('keeps pan/zoom working after a 3D round trip', async () => {
    render(<Canvas plan={p} error={null} model={skadisInfinity} />);
    expect(screen.getByText('100%')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByTestId('board-scene')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fit to view' })).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: '2D' }));
    expect(screen.getByText('100%')).toBeTruthy();

    const surfaceAfter = getSurface();
    act(() => {
      fireEvent.wheel(surfaceAfter, { deltaY: -100, deltaMode: 0, clientX: 0, clientY: 0 });
    });
    expect(screen.queryByText('100%')).toBeNull();
    expect(resizeObserverConstructions).toBe(2);
  });
});
