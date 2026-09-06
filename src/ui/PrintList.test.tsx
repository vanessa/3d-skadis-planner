import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PrintList, ASSUMED_TOOLTIP } from './PrintList';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { getMountSystem, type MountSystem } from '../mounting';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const wallMounts = getMountSystem('wall-mounts');
const notedSystem: MountSystem = {
  id: 'test',
  name: 'Test',
  url: 'https://example.com',
  description: '',
  markers: [],
  items: [{ name: 'Widget', per: { board: 1 }, source: 'buy', note: 'Only if needed' }],
};

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
    const hardwareTable = screen.getByRole('table', { name: /^Hardware/ });
    const headers = within(hardwareTable)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Item', 'Get', 'Qty']);
    const rows = within(hardwareTable).getAllByRole('row').slice(1);
    const itemTexts = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    const getTexts = rows.map((r) => within(r).getAllByRole('cell')[1].textContent);
    const qtyTexts = rows.map((r) => within(r).getAllByRole('cell')[2].textContent);
    expect(qtyTexts).toEqual(['2', '4', '6', '8']);
    expect(itemTexts[0]).toBe('Double wall mount');
    expect(itemTexts[1]).toBe('Single wall mount');
    expect(itemTexts[2]).toBe('M4 x 40-60 wall screw');
    expect(itemTexts[3]).toBe('M4 x 20 board screw');
    expect(getTexts).toEqual(['Print', 'Print', 'Buy', 'Buy']);
  });

  it('renders the Single wall mount name as a link to its model page', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    const link = screen.getByRole('link', { name: 'Single wall mount' }) as HTMLAnchorElement;
    expect(link.href).toBe('https://makerworld.com/en/models/420877');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('shows an assumed badge next to the Hardware caption only for the threaded system', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const threaded = getMountSystem('threaded-connectors');
    render(<PrintList plan={p} model={skadisInfinity} system={threaded} />);
    const hardwareTable = screen.getByRole('table', { name: /^Hardware/ });
    const badge = within(hardwareTable).getByText('assumed');
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('title')).toBe(ASSUMED_TOOLTIP);
    expect(screen.queryByText(/Hardware counts are assumed/)).toBeNull();
  });

  it('does not show an assumed badge for the wall-mount system', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    const hardwareTable = screen.getByRole('table', { name: /^Hardware/ });
    expect(within(hardwareTable).queryByText('assumed')).toBeNull();
  });

  it('renders a note under the item name for a system with a noted item', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    render(<PrintList plan={p} model={skadisInfinity} system={notedSystem} />);
    const hardwareTable = screen.getByRole('table', { name: /^Hardware/ });
    expect(within(hardwareTable).getByText('Widget')).toBeTruthy();
    expect(within(hardwareTable).getByText('Only if needed')).toBeTruthy();
  });

  it('renders no mirror note when no board in the plan needs mirroring', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    render(<PrintList plan={p} model={skadisInfinity} system={wallMounts} />);
    expect(screen.queryByText(/mirror image/)).toBeNull();
  });
});
