import { describe, it, expect } from 'vitest';
import { PRINTERS, getPrinter, CUSTOM_PRINTER_ID, DEFAULT_PRINTER_ID } from './index';

describe('printers', () => {
  it('has the Bambu presets', () => {
    const byId = Object.fromEntries(PRINTERS.map((p) => [p.id, p]));
    expect(byId['a1']).toMatchObject({ bedWidthMm: 256, bedDepthMm: 256 });
    expect(byId['a1-mini']).toMatchObject({ bedWidthMm: 180, bedDepthMm: 180 });
    expect(byId['p1s']).toMatchObject({ bedWidthMm: 256, bedDepthMm: 256 });
    expect(byId['x1c']).toMatchObject({ bedWidthMm: 256, bedDepthMm: 256 });
    expect(byId['h2d']).toMatchObject({ bedWidthMm: 350, bedDepthMm: 320 });
  });
  it('defaults to the A1', () => {
    expect(DEFAULT_PRINTER_ID).toBe('a1');
  });
  it('returns a preset by id', () => {
    expect(getPrinter('a1-mini', { bedWidthMm: 1, bedDepthMm: 1 }).name).toBe('Bambu Lab A1 mini');
  });
  it('builds a custom printer from the given bed', () => {
    expect(getPrinter(CUSTOM_PRINTER_ID, { bedWidthMm: 300, bedDepthMm: 200 })).toEqual({
      id: 'custom',
      name: 'Custom',
      bedWidthMm: 300,
      bedDepthMm: 200,
    });
  });
  it('throws on an unknown id', () => {
    expect(() => getPrinter('nope', { bedWidthMm: 1, bedDepthMm: 1 })).toThrow(/unknown printer/i);
  });
});
