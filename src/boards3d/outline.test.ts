import { describe, it, expect } from 'vitest';
import { boardOutline } from './outline';
import { skadisInfinity as model } from '../models/skadisInfinity';

const slotKeys = (cols: number, rows: number, mx = false, my = false) =>
  boardOutline(cols, rows, mx, my, model)
    .slots.map((s) => `${s.cxMm},${s.cyMm}`)
    .sort();

describe('boardOutline', () => {
  it('sizes the board like the solver does', () => {
    const o = boardOutline(11, 11, false, false, model);
    expect(o.widthMm).toBe(240);
    expect(o.heightMm).toBe(240);
    expect(o.thicknessMm).toBe(5);
  });

  it('places one slot per checkerboard cell', () => {
    expect(boardOutline(11, 11, false, false, model).slots).toHaveLength(60);
    expect(boardOutline(8, 8, false, false, model).slots).toHaveLength(32);
    expect(boardOutline(2, 2, false, false, model).slots).toHaveLength(2);
    expect(boardOutline(3, 3, false, false, model).slots).toHaveLength(4);
  });

  it('centres slots on the 20 mm grid, matching the probed STL', () => {
    expect(slotKeys(3, 3)).toEqual(['20,40', '40,20', '40,60', '60,40']);
  });

  it('gives every slot the model slot size', () => {
    for (const s of boardOutline(8, 5, false, false, model).slots) {
      expect(s.widthMm).toBe(5);
      expect(s.heightMm).toBe(15);
      expect(s.cxMm % 20).toBe(0);
      expect(s.cyMm % 20).toBe(0);
    }
  });

  it('adds four corner screw holes inset by 10 mm', () => {
    const o = boardOutline(11, 9, false, false, model);
    expect(o.screwHoles.map((h) => `${h.cxMm},${h.cyMm}`).sort()).toEqual(
      ['10,10', '10,190', '230,10', '230,190'].sort(),
    );
    expect(o.screwHoles.every((h) => h.radiusMm === 1.5)).toBe(true);
  });

  it('mirroring flips the pattern of an even board', () => {
    expect(slotKeys(8, 8, true, false)).not.toEqual(slotKeys(8, 8));
    expect(slotKeys(8, 8, false, true)).not.toEqual(slotKeys(8, 8));
    expect(slotKeys(8, 8, true, true)).toEqual(slotKeys(8, 8)); // two flips cancel
  });

  it('mirroring leaves an odd board unchanged', () => {
    expect(slotKeys(9, 9, true, false)).toEqual(slotKeys(9, 9));
    expect(slotKeys(9, 9, false, true)).toEqual(slotKeys(9, 9));
  });

  it('mirrors only the requested axis on a mixed board', () => {
    // 8 columns (even) x 9 rows (odd): mirror Y changes nothing, mirror X does.
    expect(slotKeys(8, 9, false, true)).toEqual(slotKeys(8, 9));
    expect(slotKeys(8, 9, true, false)).not.toEqual(slotKeys(8, 9));
  });
});
