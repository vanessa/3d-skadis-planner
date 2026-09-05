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
  useLayoutEffect(() => {
    fitRef.current = fit;
  });

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

  // A new world size always refits, before paint, so nothing ever renders one
  // frame under the old zoomed transform.
  useLayoutEffect(() => {
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
    if (e.buttons === 0) {
      // The primary button was released without us seeing pointerup/cancel
      // (e.g. released outside the window). Stop panning rather than get
      // stuck dragging on hover.
      dragRef.current = null;
      setDragging(false);
      return;
    }
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
