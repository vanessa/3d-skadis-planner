import { describe, it, expect, afterEach } from 'vitest';
import { boardOutline } from './outline';
import { buildBoardGeometry, boardGeometryKey, getBoardGeometry, clearBoardGeometryCache } from './geometry';
import { skadisInfinity as model } from '../models/skadisInfinity';

afterEach(() => clearBoardGeometryCache());

describe('buildBoardGeometry', () => {
  it('extrudes a 3x3 board to 80 x 80 x 5 mm with normals', () => {
    const g = buildBoardGeometry(boardOutline(3, 3, false, false, model));
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect([bb.min.x, bb.min.y, bb.min.z]).toEqual([0, 0, 0]);
    expect([bb.max.x, bb.max.y, bb.max.z].map((v) => Math.round(v * 1000) / 1000)).toEqual([80, 80, 5]);
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
    expect(g.getAttribute('normal')).toBeDefined();
  });

  it('has more triangles when there are more holes', () => {
    const small = buildBoardGeometry(boardOutline(3, 3, false, false, model));
    const large = buildBoardGeometry(boardOutline(8, 8, false, false, model));
    expect(large.getAttribute('position').count).toBeGreaterThan(small.getAttribute('position').count);
  });
});

describe('boardGeometryKey', () => {
  it('encodes size, mirror flags and model', () => {
    expect(boardGeometryKey(11, 9, false, false, 'skadis-infinity')).toBe('skadis-infinity:11x9:');
    expect(boardGeometryKey(8, 8, true, false, 'skadis-infinity')).toBe('skadis-infinity:8x8:mx');
    expect(boardGeometryKey(8, 8, true, true, 'skadis-infinity')).toBe('skadis-infinity:8x8:mxmy');
  });
});

describe('getBoardGeometry', () => {
  it('returns the same object for the same key', () => {
    expect(getBoardGeometry(9, 9, false, false, model)).toBe(getBoardGeometry(9, 9, false, false, model));
  });

  it('returns different objects for different mirror flags', () => {
    expect(getBoardGeometry(8, 8, false, false, model)).not.toBe(getBoardGeometry(8, 8, true, false, model));
  });

  it('forgets everything when cleared', () => {
    const before = getBoardGeometry(9, 9, false, false, model);
    clearBoardGeometryCache();
    expect(getBoardGeometry(9, 9, false, false, model)).not.toBe(before);
  });
});
