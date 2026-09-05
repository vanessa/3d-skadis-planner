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
