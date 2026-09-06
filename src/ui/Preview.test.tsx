import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Preview } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { IDENTITY } from './viewport';
import type { HardwareMarker } from '../mounting';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });

describe('Preview', () => {
  it('renders nothing without a plan', () => {
    const { container } = render(<Preview plan={null} viewport={IDENTITY} width={0} height={0} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('draws one rect per board plus leftover strips', () => {
    // 375 x 185 on a mini: 2 x 1 boards, 15 mm leftover right, 5 mm bottom.
    const p = plan({ widthMm: 375, heightMm: 185, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 375 185');
    expect(container.querySelectorAll('[data-board]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-leftover]')).toHaveLength(2);
  });

  it('labels boards with hole counts and marks mirrored ones', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} />);
    const labels = [...container.querySelectorAll('[data-board] text')].map((t) => t.textContent);
    expect(labels.join(' ')).toContain('8×8');
    expect(container.querySelectorAll('[data-mirror="x"]')).toHaveLength(1);
  });

  it('draws the wall outline and omits labels on boards under 64 screen px', () => {
    // 260 x 60 on a mini: columns [6, 5] (140 + 120 mm), one row of 2 holes (60 mm).
    const p = plan({ widthMm: 260, heightMm: 60, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} />);
    expect(container.querySelector('[data-outline]')).not.toBeNull();
    expect(container.querySelectorAll('[data-board]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-board] text')).toHaveLength(0);
  });

  it('keeps labels on boards of 64 screen px or more', () => {
    const p = plan({ widthMm: 80, heightMm: 80, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} />);
    expect(container.querySelectorAll('[data-board] text').length).toBeGreaterThan(0);
  });

  it('draws through the viewport transform with screen-sized labels', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 }) });
    const { container } = render(<Preview plan={p} viewport={{ scale: 2, tx: 10, ty: 20 }} width={1000} height={600} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 600');
    const g = container.querySelector('svg > g[transform]')!;
    expect(g.getAttribute('transform')).toBe('translate(10 20) scale(2)');
    const texts = container.querySelectorAll('[data-board] text');
    expect(Number(texts[0].getAttribute('font-size'))).toBeCloseTo(13 / 2);
    expect(Number(texts[1].getAttribute('font-size'))).toBeCloseTo(11 / 2);
    expect(container.querySelector('pattern')!.getAttribute('width')).toBe('4');
  });

  it('omits labels when the board is under 64 screen px', () => {
    // 200 mm boards at scale 0.3 are 60 px wide.
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 }) });
    const { container } = render(<Preview plan={p} viewport={{ scale: 0.3, tx: 0, ty: 0 }} width={1000} height={600} />);
    expect(container.querySelectorAll('[data-board]')).toHaveLength(15);
    expect(container.querySelectorAll('[data-board] text')).toHaveLength(0);
  });

  it('ignores the viewport and uses the identity fallback without layout', () => {
    const p = plan({ widthMm: 360, heightMm: 180, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} viewport={{ scale: 2, tx: 10, ty: 20 }} width={0} height={0} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 360 180');
    const g = container.querySelector('svg > g[transform]')!;
    expect(g.getAttribute('transform')).toBe('translate(0 0) scale(1)');
  });

  it('paints the hover highlight after every board so neighbours cannot cover it', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} />);
    expect(container.querySelector('[data-highlight]')).toBeNull();
    const rects = container.querySelectorAll('[data-board] rect');
    fireEvent.pointerEnter(rects[7]);
    const highlight = container.querySelector('[data-highlight]');
    expect(highlight).not.toBeNull();
    const group = container.querySelector('svg > g[transform]')!;
    expect(group.lastElementChild).toBe(highlight);
    expect(highlight!.getAttribute('x')).toBe('400');
    expect(highlight!.getAttribute('y')).toBe('200');
    expect(highlight!.getAttribute('width')).toBe('200');
    fireEvent.pointerLeave(rects[7]);
    expect(container.querySelector('[data-highlight]')).toBeNull();
  });
});

describe('Preview markers', () => {
  it('draws one marker per item and none when the prop is omitted', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const markers: HardwareMarker[] = [{ x: 0, y: 0, kind: 'nodes', role: 'outerCorner' }];
    const { container, rerender } = render(
      <Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} />,
    );
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(1);
    rerender(<Preview plan={p} viewport={IDENTITY} width={0} height={0} />);
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(0);
  });

  it('draws a perpendicular tick alongside each seam marker', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const markers: HardwareMarker[] = [{ x: 200, y: 100, kind: 'seams', orientation: 'vertical' }];
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} />);
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-tick]')).toHaveLength(1);
  });

  it('hides markers when the shorter board side is under 32 screen px', () => {
    // 200 mm boards at scale 0.1 are 20 px wide.
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const markers: HardwareMarker[] = [{ x: 0, y: 0, kind: 'nodes', role: 'outerCorner' }];
    const { container } = render(
      <Preview plan={p} viewport={{ scale: 0.1, tx: 0, ty: 0 }} width={1000} height={600} markers={markers} />,
    );
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(0);
  });

  it('draws markers after the boards and before the wall outline', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const markers: HardwareMarker[] = [{ x: 0, y: 0, kind: 'nodes', role: 'outerCorner' }];
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} />);
    const group = container.querySelector('svg > g[transform]')!;
    const children = [...group.children];
    const boardIdx = children.findIndex((c) => c.hasAttribute('data-board'));
    const markersIdx = children.findIndex((c) => c.hasAttribute('data-markers'));
    const outlineIdx = children.findIndex((c) => c.hasAttribute('data-outline'));
    expect(boardIdx).toBeLessThan(markersIdx);
    expect(markersIdx).toBeLessThan(outlineIdx);
  });
});
