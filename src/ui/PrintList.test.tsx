import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PrintList } from './PrintList';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { getMountSystem } from '../mounting';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const wallMounts = getMountSystem('wall-mounts');

describe('PrintList', () => {
  it('renders nothing without a plan', () => {
    const { container } = render(<PrintList plan={null} model={skadisInfinity} system={wallMounts} />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('lists one row per group with file, size, quantity and print instruction', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    const boardTable = screen.getAllByRole('table')[0];
    expect(within(boardTable).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'File', 'Size', 'Qty', 'Print as',
    ]);
    const rows = within(boardTable).getAllByRole('row').slice(1); // skip header
    expect(rows).toHaveLength(2);
    const cells0 = within(rows[0])
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells0).toEqual(['8 x 8.stl', '180 × 180 mm', '1', 'as is']);
    const cells1 = within(rows[1])
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells1[2]).toBe('1');
    expect(cells1[3]).toBe('mirrored X');
  });

  it('shows all four mirror variants with the correct quantity and mirror label', () => {
    const p = plan({ widthMm: 720, heightMm: 360, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    const boardTable = screen.getAllByRole('table')[0];
    const rows = within(boardTable).getAllByRole('row').slice(1); // skip header
    expect(rows).toHaveLength(4);
    const mirrorCells = rows.map((r) => within(r).getAllByRole('cell')[3].textContent);
    expect(mirrorCells).toEqual(['as is', 'mirrored X', 'mirrored Y', 'mirrored X + Y']);
    const qtyCells = rows.map((r) => within(r).getAllByRole('cell')[2].textContent);
    expect(qtyCells).toEqual(['2', '2', '2', '2']);
  });

  it('shows the mirror note', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    expect(screen.getByText(/mirror image/)).toBeTruthy();
  });

  it('lists the wall-mount hardware for the mini plan in a second table', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    const headers = within(tables[1])
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Item', 'Qty']);
    const rows = within(tables[1]).getAllByRole('row').slice(1);
    const cellTexts = rows.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent));
    expect(cellTexts).toEqual([
      ['Double wall mount', '2'],
      ['Single wall mount', '4'],
      ['M4 x 40-60 wall screw', '6'],
      ['M4 x 20 board screw', '8'],
    ]);
  });

  it('shows a note under an item name and an assumed line when the system is assumed', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const threaded = getMountSystem('threaded-connectors');
    render(<PrintList plan={p} model={skadisInfinity} system={threaded} />);
    expect(screen.getByText(/Counts are assumed; check the model page\./)).toBeTruthy();
    expect(screen.getByText(/Assumed two per connector/)).toBeTruthy();
  });
});
