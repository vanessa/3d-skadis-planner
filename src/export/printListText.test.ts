import { describe, it, expect } from 'vitest';
import { formatPrintList, printListFileName, wrapText, creditLines } from './printListText';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { getMountSystem, resolveMountSystem, type MountSystem } from '../mounting';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const date = new Date(2026, 8, 5, 12);
const wallMounts = getMountSystem('wall-mounts');
const notedSystem: MountSystem = {
  id: 'test',
  name: 'Test',
  url: 'https://example.com',
  description: '',
  markers: [],
  items: [{ name: 'Widget', per: { board: 1 }, source: 'buy', note: 'Only if needed' }],
};

describe('printListFileName', () => {
  it('uses whole millimetres', () => {
    expect(printListFileName(1000, 600)).toBe('skadis-plan-1000x600.txt');
    expect(printListFileName(1000.3, 599.6)).toBe('skadis-plan-1000x600.txt');
  });
});

describe('formatPrintList', () => {
  it('formats the default plan', () => {
    const p = plan({ widthMm: 1015, heightMm: 600, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 1015, heightMm: 600, date, system: wallMounts,
    });
    expect(text).toBe(
      [
        'Skadis Planner - print list',
        '===========================',
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
        'Hardware (Wall mounts (AU3D))',
        '3D print:',
        '  8  Quad wall mount',
        ' 12  Double wall mount',
        '  4  Single wall mount (model: https://makerworld.com/en/models/420877)',
        'Buy:',
        ' 24  M4 x 40-60 wall screw',
        ' 60  M4 x 20 board screw',
        'Mount files: https://makerworld.com/en/models/861073',
        '',
        'Drill point measurements (mm, from the bottom-left corner)',
        'X: 200, 400, 600, 800, 1000',
        'Y: 200, 400, 600',
        '',
        'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
        '9x9  9x9  9x9  9x9  9x9',
        '9x9  9x9  9x9  9x9  9x9',
        '9x9  9x9  9x9  9x9  9x9',
        '',
        'Boards and mounts by AU3D - https://makerworld.com/en/@AU3D',
        'Thank you!',
        'Generated 2026-09-05 with Skadis Planner',
        '',
      ].join('\n'),
    );
  });

  it('names the wall distance in the hardware header and links the resolved profiles', () => {
    const p = plan({ widthMm: 1015, heightMm: 600, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 1015, heightMm: 600, date,
      system: resolveMountSystem(wallMounts, 20), wallDistanceMm: 20,
    });
    expect(text).toContain('Hardware (Wall mounts (AU3D), 20 mm from the wall)');
    expect(text).toContain('  4  Single wall mount (model: https://makerworld.com/en/models/420877#profileId-323616)');
    expect(text).toContain('Mount files: https://makerworld.com/en/models/861073#profileId-811358');
  });

  it('credits the boards and the mounts separately when their authors differ', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    const other: MountSystem = { ...notedSystem, author: { name: 'Someone', url: 'https://example.com/someone' } };
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 200, heightMm: 200, date, system: other,
    });
    expect(text).toContain('Boards by AU3D - https://makerworld.com/en/@AU3D\nMounts by Someone - https://example.com/someone');
    expect(creditLines(skadisInfinity, notedSystem)).toEqual([
      { label: 'Boards', name: 'AU3D', url: 'https://makerworld.com/en/@AU3D' },
    ]);
  });

  it('omits the mirror note when no board in the plan needs mirroring', () => {
    const p = plan({ widthMm: 1015, heightMm: 600, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 1015, heightMm: 600, date, system: wallMounts,
    });
    expect(text).not.toContain('mirror image');
  });

  it('prints a note in parentheses after the hardware item name', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 200, heightMm: 200, date, system: notedSystem,
    });
    expect(text).toContain('  1  Widget (Only if needed)');
    expect(text).not.toContain('3D print:');
    expect(text).toContain('Buy:');
  });

  it('widens the Qty column in the hardware block to fit a four-digit quantity', () => {
    const p = plan({ widthMm: 10000, heightMm: 10000, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 10000, heightMm: 10000, date, system: wallMounts,
    });
    expect(text).toContain('7056  M4 x 20 board screw');
    expect(text).toContain('   4  Single wall mount (model: https://makerworld.com/en/models/420877)');
  });

  it('marks mirrored boards in the layout and lists every variant', () => {
    const p = plan({ widthMm: 720, heightMm: 360, model: skadisInfinity, printer: mini });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: mini, widthMm: 720, heightMm: 360, date, system: wallMounts,
    });
    expect(text).toContain('8x8   8x8*  8x8   8x8*');
    expect(text).toContain('8x8+  8x8#  8x8+  8x8#');
    expect(text).toContain('  2  8 x 8.stl  180 x 180 mm  mirrored X + Y');
    expect(text).toContain('Strategy: Balanced');
    expect(text).toContain('mirror image');
  });

  it('lists the drill point measurements from the bottom-left corner', () => {
    const p = plan({ widthMm: 400, heightMm: 400, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 400, heightMm: 400, date, system: wallMounts,
    });
    expect(text).toContain('Drill point measurements (mm, from the bottom-left corner)');
    expect(text).toContain('X: 200, 400');
    expect(text).toContain('Y: 200, 400');
  });

  it('flips Y from the total height (covered + leftover), not just the covered height', () => {
    // Same fixture as plan.test.ts's "board count equals ceil..." case: 1015x725 on
    // an A1 covers 1000x720mm (15 boards of 200x240mm) with 15mm left on the right
    // and 5mm left at the bottom, so coveredHeightMm (720) !== heightMm (725).
    // rowB = [0,240,480,720]; Y = 725 - rowB = [725,485,245,5], sorted, origin dropped.
    // A regression that flipped off coveredHeightMm instead would produce
    // Y: 240, 480, 720 instead - a different set, not just a different order.
    const p = plan({ widthMm: 1015, heightMm: 725, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 1015, heightMm: 725, date, system: wallMounts,
    });
    expect(text).toContain('X: 200, 400, 600, 800, 1000');
    expect(text).toContain('Y: 5, 245, 485, 725');
  });

  it('omits the measurements block for a system with no markers', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    const text = formatPrintList({
      plan: p, model: skadisInfinity, printer: a1, widthMm: 200, heightMm: 200, date, system: notedSystem,
    });
    expect(text).not.toContain('Drill point measurements');
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
