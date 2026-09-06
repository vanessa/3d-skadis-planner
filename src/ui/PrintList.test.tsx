import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PrintList } from './PrintList';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });

describe('PrintList', () => {
  it('renders nothing without a plan', () => {
    const { container } = render(<PrintList plan={null} model={skadisInfinity} />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('lists one row per group with size, holes, quantity and mirror', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header
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
    render(<PrintList plan={p} model={skadisInfinity} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header
    expect(rows).toHaveLength(4);
    const mirrorCells = rows.map((r) => within(r).getAllByRole('cell')[3].textContent);
    expect(mirrorCells).toEqual(['as is', 'mirrored X', 'mirrored Y', 'mirrored X + Y']);
    const qtyCells = rows.map((r) => within(r).getAllByRole('cell')[2].textContent);
    expect(qtyCells).toEqual(['2', '2', '2', '2']);
  });

  it('shows the mirror note', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} />);
    expect(screen.getByText(/mirror image/)).toBeTruthy();
  });
});
