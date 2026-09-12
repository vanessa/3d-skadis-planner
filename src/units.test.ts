import { describe, it, expect } from 'vitest';
import { toMm, fromMm, formatMm, UNITS } from './units';

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

describe('formatMm', () => {
  it('passes mm through unrounded-looking (no decimals for whole numbers)', () => {
    expect(formatMm(200, 'mm')).toBe('200 mm');
    expect(formatMm(9, 'mm')).toBe('9 mm');
  });
  it('converts to cm, rounded to 2 decimal places', () => {
    expect(formatMm(200, 'cm')).toBe('20 cm');
    expect(formatMm(9, 'cm')).toBe('0.9 cm');
  });
  it('converts to inches, rounded to 2 decimal places', () => {
    expect(formatMm(200, 'in')).toBe('7.87 in');
  });
  it('drops trailing zeros for whole-number results after conversion', () => {
    expect(formatMm(254, 'in')).toBe('10 in');
  });
});
