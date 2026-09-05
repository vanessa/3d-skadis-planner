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
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey = false): number {
  const raw = ctrlKey ? deltaY * 10 : deltaY;
  const delta = deltaMode === 1 ? raw * 16 : deltaMode === 2 ? raw * 400 : raw;
  return Math.min(2, Math.max(0.5, Math.exp(-delta * WHEEL_SENSITIVITY)));
}
