import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(rows[0].textContent).toContain('180 × 180 mm');
    expect(rows[0].textContent).toContain('8 × 8');
    expect(rows[0].textContent).toContain('1');
    expect(rows[0].textContent).toContain('—');
    expect(rows[1].textContent).toContain('Mirror X');
  });

  it('shows the mirror note and the model link', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    render(<PrintList plan={p} model={skadisInfinity} />);
    expect(screen.getByText(/right-click the board/)).toBeTruthy();
    const link = screen.getByRole('link', { name: /IKEA Skadis Infinity/ }) as HTMLAnchorElement;
    expect(link.href).toBe(skadisInfinity.url);
  });
});
