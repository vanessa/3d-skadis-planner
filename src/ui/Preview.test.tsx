import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Preview } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { IDENTITY, type Viewport } from './viewport';
import { getMountSystem, hardwareMarkers, type HardwareMarker } from '../mounting';
import type { Highlight } from './highlight';

const mini = getPrinter('a1-mini', { bedWidthMm: 0, bedDepthMm: 0 });
const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });
const viewport: Viewport = { scale: 1, tx: 0, ty: 0 };

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
    expect(g.getAttribute('transform')).toBe('translate(10 20) scale(2) translate(0 0)');
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
    expect(g.getAttribute('transform')).toBe('translate(0 0) scale(1) translate(0 0)');
  });
});

describe('Preview highlight', () => {
  it('lights every board that matches a boards highlight and dims the rest', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const highlight: Highlight = { kind: 'boards', cols: 9, rows: 9, mirrorX: false, mirrorY: false };
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} highlight={highlight} />);
    expect(container.querySelectorAll('[data-board] rect[data-lit]')).toHaveLength(15);
    expect(container.querySelectorAll('[data-board] rect[data-dim]')).toHaveLength(0);
  });

  it('dims every board when a boards highlight matches none', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const highlight: Highlight = { kind: 'boards', cols: 5, rows: 5, mirrorX: false, mirrorY: false };
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} highlight={highlight} />);
    expect(container.querySelectorAll('[data-board] rect[data-lit]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-board] rect[data-dim]')).toHaveLength(15);
  });

  it('lights matching hardware markers and dims the rest without dimming boards', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const wallMounts = getMountSystem('wall-mounts');
    const markers = hardwareMarkers(p, wallMounts, skadisInfinity);
    const highlight: Highlight = { kind: 'hardware', per: { junction: 1 } };
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} highlight={highlight} />,
    );
    const circles = container.querySelectorAll('[data-markers] circle');
    expect(circles.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-markers] circle[data-lit]')).toHaveLength(8);
    expect(container.querySelectorAll('[data-markers] circle[data-dim]')).toHaveLength(circles.length - 8);
    expect(container.querySelectorAll('[data-board] rect[data-dim]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-board] rect[data-lit]')).toHaveLength(0);
  });

  it('lights every board for a per-board hardware highlight when no marker matches', () => {
    // wall-mounts only draws `nodes` markers, so a hardware row with per.board
    // has nothing to match and must not dim everything on the preview.
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const wallMounts = getMountSystem('wall-mounts');
    const markers = hardwareMarkers(p, wallMounts, skadisInfinity);
    const highlight: Highlight = { kind: 'hardware', per: { board: 4 } };
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} highlight={highlight} />,
    );
    expect(container.querySelectorAll('[data-dim]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-board] rect[data-lit]')).toHaveLength(15);
  });

  it('lights only matching board-corner markers for a per-board hardware highlight, leaving boards unlit', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const spacers = getMountSystem('spacers');
    const markers = hardwareMarkers(p, spacers, skadisInfinity);
    const highlight: Highlight = { kind: 'hardware', per: { board: 4 } };
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} highlight={highlight} />,
    );
    expect(container.querySelectorAll('[data-markers] circle[data-lit]')).toHaveLength(60);
    expect(container.querySelectorAll('[data-board] rect[data-lit]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-dim]')).toHaveLength(0);
  });

  it('has no lit/dim/highlight markup without a highlight prop', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const wallMounts = getMountSystem('wall-mounts');
    const markers = hardwareMarkers(p, wallMounts, skadisInfinity);
    const { container } = render(<Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={markers} />);
    expect(container.querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-dim]')).toHaveLength(0);
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

  it('caps the marker count so a pathological plan cannot flood the SVG', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const many = (n: number): HardwareMarker[] =>
      Array.from({ length: n }, (_, i) => ({ x: i, y: 0, kind: 'boardCorners' }));
    const { container: atCap } = render(
      <Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={many(4000)} />,
    );
    expect(atCap.querySelectorAll('[data-marker]')).toHaveLength(4000);
    const { container: overCap } = render(
      <Preview plan={p} viewport={IDENTITY} width={0} height={0} markers={many(4001)} />,
    );
    expect(overCap.querySelectorAll('[data-marker]')).toHaveLength(0);
  });
});

describe('Preview measurements mode', () => {
  const p = plan({ widthMm: 400, heightMm: 400, model: skadisInfinity, printer: a1 });
  const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);

  it('draws hardware dots and no dimension lines by default', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} />,
    );
    expect(container.querySelectorAll('[data-marker]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);
  });

  it('draws dimension lines and no hardware dots in measurements mode', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} mode="measurements" />,
    );
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(0);
    const lines = container.querySelectorAll('[data-dim-line]');
    // 400x400 wall-mounts: X = [200, 400], Y = [200, 400] once the origin corner is dropped.
    expect(lines).toHaveLength(4);
  });

  it('labels Y using height from the floor, not raw SVG y', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} mode="measurements" />,
    );
    // totalHeightMm is 400; the row boundary at SVG y=0 is 400mm from the floor.
    // Scoped to the Y axis: this square plan also has X values of 200/400, so an
    // unscoped getByText('400 mm') would match both axes and be ambiguous.
    const yLines = Array.from(container.querySelectorAll('[data-dim-line][data-axis="y"]'));
    const yLabels = yLines.map((g) => g.querySelector('text')?.textContent);
    expect(yLabels).toContain('400 mm');
    expect(yLabels).toContain('200 mm');
  });

  it('shifts the drawing by the given origin', () => {
    const { container } = render(
      <Preview plan={p} viewport={viewport} width={800} height={800} markers={markers} origin={{ x: 100, y: 0 }} />,
    );
    const board = container.querySelector('[data-board]') as SVGGElement;
    const rect = board.querySelector('rect')!;
    expect(rect.getAttribute('x')).toBe('0'); // board's own mm coords are unaffected
    const outerGroup = container.querySelector('svg > g') as SVGGElement;
    expect(outerGroup.getAttribute('transform')).toContain('translate(100 0)');
  });
});
