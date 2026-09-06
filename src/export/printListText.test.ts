import { describe, it, expect } from 'vitest';
import { formatPrintList, printListFileName, wrapText } from './printListText';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const date = new Date(2026, 8, 5, 12);

describe('printListFileName', () => {
  it('uses whole millimetres', () => {
    expect(printListFileName(1000, 600)).toBe('board-plan-1000x600.txt');
    expect(printListFileName(1000.3, 599.6)).toBe('board-plan-1000x600.txt');
  });
});

describe('formatPrintList', () => {
  it('formats the default plan', () => {
    const p = plan({ widthMm: 1015, heightMm: 600, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({ plan: p, model: skadisInfinity, printer: a1, widthMm: 1015, heightMm: 600, date });
    expect(text).toBe(
      [
        'Board planner - print list',
        '==========================',
        'Space:    1015 x 600 mm',
        'Model:    IKEA Skadis Infinity',
        '          https://makerworld.com/en/models/1309689-ikea-skadis-infinity',
        'Printer:  Bambu Lab A1 (bed 256 x 256 mm)',
        'Strategy: Balanced',
        'Result:   15 boards, covers 1000 x 600 mm, 15 mm left on the right',
        '',
        'Qty  File       Size          Print as',
        ' 15  9 x 9.stl  200 x 200 mm  as is',
        '',
        'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
        '9x9  9x9  9x9  9x9  9x9',
        '9x9  9x9  9x9  9x9  9x9',
        '9x9  9x9  9x9  9x9  9x9',
        '',
        ...wrapText(skadisInfinity.mirrorNote),
        '',
        'Boards designed by AU3D - https://makerworld.com/en/@AU3D',
        'Thank you for sharing them!',
        'Generated 2026-09-05 with Board planner',
        '',
      ].join('\n'),
    );
  });

  it('marks mirrored boards in the layout and lists every variant', () => {
    const p = plan({ widthMm: 720, heightMm: 360, model: skadisInfinity, printer: mini });
    const text = formatPrintList({ plan: p, model: skadisInfinity, printer: mini, widthMm: 720, heightMm: 360, date });
    expect(text).toContain('8x8   8x8*  8x8   8x8*');
    expect(text).toContain('8x8+  8x8#  8x8+  8x8#');
    expect(text).toContain('  2  8 x 8.stl  180 x 180 mm  mirrored X + Y');
    expect(text).toContain('Strategy: Balanced');
  });
});

describe('wrapText', () => {
  it('does not emit a blank line for a word longer than the wrap width', () => {
    const word = 'a'.repeat(90);
    expect(wrapText(`short ${word} tail`)).toEqual(['short', word, 'tail']);
  });

  it('wraps at the given width and keeps every line within 78 columns', () => {
    expect(wrapText('aa bb cc', 5)).toEqual(['aa bb', 'cc']);
    expect(wrapText(skadisInfinity.mirrorNote).every((l) => l.length <= 78)).toBe(true);
    expect(wrapText(skadisInfinity.mirrorNote).length).toBeGreaterThan(1);
  });
});
