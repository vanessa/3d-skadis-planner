import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryChip } from './SummaryChip';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });

describe('SummaryChip', () => {
  it('shows count and coverage with no leftover text when leftover rounds to zero', () => {
    const p = plan({ widthMm: 1000.3, heightMm: 600, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error={null} />);
    const text = screen.getByTestId('summary').textContent ?? '';
    expect(text).toMatch(/15 boards/);
    expect(text).toMatch(/1000 × 600 mm/);
    expect(text).not.toMatch(/left/);
  });

  it('shows leftover on the right and at the bottom', () => {
    const p = plan({ widthMm: 1015, heightMm: 725, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error={null} />);
    const text = screen.getByTestId('summary').textContent ?? '';
    expect(text).toMatch(/15 mm left on the right/);
    expect(text).toMatch(/5 mm left at the bottom/);
  });

  it('renders the error as an alert and keeps the summary', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error="Enter a width greater than zero." />);
    expect(screen.getByRole('alert').textContent).toMatch(/width/i);
    expect(screen.getByTestId('summary').textContent).toMatch(/15 boards/);
  });

  it('uses the singular for one board', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error={null} />);
    expect(screen.getByTestId('summary').textContent).toMatch(/^1 board ·/);
  });
});
