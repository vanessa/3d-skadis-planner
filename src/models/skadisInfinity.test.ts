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

describe('skadisInfinity pattern', () => {
  it('has slots on a checkerboard where col + row is odd', () => {
    const { pattern } = skadisInfinity;
    expect(pattern.isHole(0, 0)).toBe(false);
    expect(pattern.isHole(1, 0)).toBe(true);
    expect(pattern.isHole(0, 1)).toBe(true);
    expect(pattern.isHole(1, 1)).toBe(false);
    expect(pattern.isHole(2, 3)).toBe(true);
  });

  it('matches the geometry measured from the STL files', () => {
    expect(skadisInfinity.pattern).toMatchObject({
      thicknessMm: 5,
      slotWidthMm: 5,
      slotHeightMm: 15,
      screwHoleRadiusMm: 1.5,
      screwInsetMm: 10,
    });
  });
});
