import * as THREE from 'three';
import type { BoardModel } from '../models/types';
import { boardOutline, type BoardOutline } from './outline';

const CURVE_SEGMENTS = 8;

/** A stadium (rounded slot): two semicircles joined by straight sides. Valid whenever width <= height. */
function slotPath(cxMm: number, cyMm: number, widthMm: number, heightMm: number): THREE.Path {
  const r = widthMm / 2;
  const path = new THREE.Path();
  path.absarc(cxMm, cyMm - heightMm / 2 + r, r, Math.PI, Math.PI * 2, false);
  path.lineTo(cxMm + r, cyMm + heightMm / 2 - r);
  path.absarc(cxMm, cyMm + heightMm / 2 - r, r, 0, Math.PI, false);
  path.closePath();
  return path;
}

function circlePath(cxMm: number, cyMm: number, radiusMm: number): THREE.Path {
  const path = new THREE.Path();
  path.absarc(cxMm, cyMm, radiusMm, 0, Math.PI * 2, false);
  path.closePath();
  return path;
}

/** Board mesh spanning x 0..width, y 0..height, z 0..thickness. */
export function buildBoardGeometry(outline: BoardOutline): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(outline.widthMm, 0);
  shape.lineTo(outline.widthMm, outline.heightMm);
  shape.lineTo(0, outline.heightMm);
  shape.closePath();
  for (const s of outline.slots) shape.holes.push(slotPath(s.cxMm, s.cyMm, s.widthMm, s.heightMm));
  for (const h of outline.screwHoles) shape.holes.push(circlePath(h.cxMm, h.cyMm, h.radiusMm));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: outline.thicknessMm,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  geometry.computeBoundingBox();
  return geometry;
}

export function boardGeometryKey(
  cols: number,
  rows: number,
  mirrorX: boolean,
  mirrorY: boolean,
  modelId: string,
): string {
  return `${modelId}:${cols}x${rows}:${mirrorX ? 'mx' : ''}${mirrorY ? 'my' : ''}`;
}

const cache = new Map<string, THREE.BufferGeometry>();

export function getBoardGeometry(
  cols: number,
  rows: number,
  mirrorX: boolean,
  mirrorY: boolean,
  model: BoardModel,
): THREE.BufferGeometry {
  const key = boardGeometryKey(cols, rows, mirrorX, mirrorY, model.id);
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = buildBoardGeometry(boardOutline(cols, rows, mirrorX, mirrorY, model));
    cache.set(key, geometry);
  }
  return geometry;
}

export function clearBoardGeometryCache(): void {
  for (const geometry of cache.values()) geometry.dispose();
  cache.clear();
}
