import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewCard } from './PreviewCard';
import { Preview } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const mockState = vi.hoisted(() => ({ shouldThrow: false }));

vi.mock('./three/BoardScene', () => ({
  default: ({ plan }: { plan: { boards: unknown[] } }) => {
    if (mockState.shouldThrow) throw new Error('WebGL unavailable');
    return <div data-testid="board-scene">{plan.boards.length} boards in 3D</div>;
  },
}));

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });

const renderCard = (plan: typeof p | null) =>
  render(
    <PreviewCard plan={plan} model={skadisInfinity}>
      <Preview plan={plan} />
    </PreviewCard>,
  );

afterEach(() => {
  mockState.shouldThrow = false;
  vi.restoreAllMocks();
});

describe('PreviewCard', () => {
  it('renders nothing without a plan', () => {
    const { container } = renderCard(null);
    expect(container.firstChild).toBeNull();
  });

  it('shows the 2D children by default with 2D selected', () => {
    const { container } = renderCard(p);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('radio', { name: '2D' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '3D' }).getAttribute('aria-checked')).toBe('false');
  });

  it('switches to the lazy 3D scene and back', async () => {
    const { container } = renderCard(p);
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByTestId('board-scene')).toBeTruthy();
    expect(screen.getByText('15 boards in 3D')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '2D' }));
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByTestId('board-scene')).toBeNull();
  });

  it('falls back to a message and a way back to 2D when the scene fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockState.shouldThrow = true;
    const { container } = renderCard(p);
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(await screen.findByText('3D view is not available in this browser.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to 2D' }));
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
