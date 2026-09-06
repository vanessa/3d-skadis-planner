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

  it('lists the wall-mount hardware for the mini plan in a second, named table', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    const hardwareTable = screen.getByRole('table', { name: 'Hardware' });
    const headers = within(hardwareTable)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Item', 'Qty']);
    const rows = within(hardwareTable).getAllByRole('row').slice(1);
    const itemTexts = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    const qtyTexts = rows.map((r) => within(r).getAllByRole('cell')[1].textContent);
    expect(qtyTexts).toEqual(['2', '4', '6', '8']);
    expect(itemTexts[0]).toBe('Double wall mount');
    expect(itemTexts[1]).toContain('Single wall mount');
    expect(itemTexts[1]).toContain('Separate model: makerworld.com/en/models/420877');
    expect(itemTexts[2]).toBe('M4 x 40-60 wall screw');
    expect(itemTexts[3]).toBe('M4 x 20 board screw');
  });

  it('shows a note under an item name and an assumed line after the Hardware table when the system is assumed', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const threaded = getMountSystem('threaded-connectors');
    render(<PrintList plan={p} model={skadisInfinity} system={threaded} />);
    const assumed = screen.getByText(/Hardware counts are assumed/);
    expect(assumed).toBeTruthy();
    const hardwareTable = screen.getByRole('table', { name: 'Hardware' });
    expect(hardwareTable.compareDocumentPosition(assumed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Assumed two per connector/)).toBeTruthy();
  });

  it('renders a note in full inside the item cell instead of clipping it', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const threaded = getMountSystem('threaded-connectors');
    render(<PrintList plan={p} model={skadisInfinity} system={threaded} />);
    const hardwareTable = screen.getByRole('table', { name: 'Hardware' });
    const rows = within(hardwareTable).getAllByRole('row').slice(1);
    const connectorScrewRow = rows.find((r) => within(r).getAllByRole('cell')[0].textContent?.includes('Connector screw'));
    expect(connectorScrewRow).toBeTruthy();
    const itemCell = within(connectorScrewRow!).getAllByRole('cell')[0];
    expect(itemCell.textContent).toContain('Assumed two per connector; check the model page');
  });
});
