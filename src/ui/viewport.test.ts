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
  it('scales trackpad pinch (ctrlKey) deltas by 10, matching an unscaled 10x delta', () => {
    expect(wheelFactor(-10, 0, true)).toBe(wheelFactor(-100, 0));
  });
});
