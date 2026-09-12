import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Preview, DIM_LABEL_INSET_PX, DIM_LABEL_LINE_GAP_PX } from './Preview';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';
import { IDENTITY } from './viewport';
import {
  getMountSystem, hardwareMarkers, laneChains, marginMm, type HardwareMarker,
} from '../mounting';
import type { Highlight } from './highlight';

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
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} />,
    );
    expect(container.querySelectorAll('[data-marker]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);
  });

  it('draws dimension lines alongside the hardware dots in measurements mode, not instead of them', () => {
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} mode="measurements" />,
    );
    // The dots stay visible so it's still clear what each dimension line is measuring.
    expect(container.querySelectorAll('[data-marker]').length).toBeGreaterThan(0);
    const lines = container.querySelectorAll('[data-dim-line]');
    // 400x400 wall-mounts (2x2 boards): every boundary point (edge nodes and
    // corners) insets 9mm on the axis with no interior neighbor, so the raw
    // 0/400 values never appear — only X = Y = [9, 200, 391].
    expect(lines).toHaveLength(6);
  });

  it('paints every dimension label after every dimension line, so a longer shared-lane line never covers a shorter one\'s label', () => {
    // Baseline dimensioning runs every line from 0, so same-lane lines overlap:
    // e.g. the 400 mm line's stroke spans the same range as the 200 mm line's.
    // If a value's own label were painted as part of its own group, a later
    // (longer) sibling's line would paint over an earlier (shorter) one's label.
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} mode="measurements" />,
    );
    const dims = container.querySelector('[data-dimensions]')!;
    const children = Array.from(dims.children);
    const geometryIdx = children.findIndex((c) => c.hasAttribute('data-dim-geometry'));
    const labelsIdx = children.findIndex((c) => c.hasAttribute('data-dim-labels'));
    expect(geometryIdx).toBeGreaterThanOrEqual(0);
    expect(labelsIdx).toBeGreaterThan(geometryIdx);
    // Every actual label lives in the labels group, not inside a line group.
    expect(container.querySelectorAll('[data-dim-line] text')).toHaveLength(0);
    expect(container.querySelectorAll('[data-dim-label]').length).toBeGreaterThan(0);
  });

  it('labels Y using height from the floor, not raw SVG y', () => {
    // 400x450 leaves a 10mm leftover row: covered height 440 != total height 450,
    // with rows [0,240,440] (the middle boundary, y=240, is an interior junction
    // and stays exact; the top/bottom boundaries at y=0/440 are edge nodes and
    // corners, so they inset 9mm to raw y=9/431). Floor-relative (450 - raw):
    // 450-9=441, 450-240=210, 450-431=19. An unflipped implementation would
    // show 9mm/431mm instead of 441mm/19mm — genuinely different sets, not
    // just reordered, so a text-only check can still tell them apart.
    const asym = plan({ widthMm: 400, heightMm: 450, model: skadisInfinity, printer: a1 });
    const asymMarkers = hardwareMarkers(asym, getMountSystem('wall-mounts'), skadisInfinity);
    const { container } = render(
      <Preview plan={asym} viewport={IDENTITY} width={800} height={800} markers={asymMarkers} mode="measurements" />,
    );
    const yLabelEls = Array.from(container.querySelectorAll('[data-dim-label][data-axis="y"]'));
    const yLabels = yLabelEls.map((el) => el.textContent);
    expect(yLabels).toContain('19 mm');
    expect(yLabels).toContain('210 mm');
    expect(yLabels).toContain('441 mm');
    // These would appear instead if the raw (unflipped) SVG y were used.
    expect(yLabels).not.toContain('9 mm');
    expect(yLabels).not.toContain('431 mm');
  });

  it('keeps the outermost dimension line on each axis exactly at the margin marginMm reserves for it', () => {
    // marginMm() (dimensions.ts) and each line's own lane offset (XDimensionLine /
    // YDimensionLine below) are two independent expressions that only agree because
    // laneCount === maxLane + 1 by construction. Recompute the expected offsets from
    // the real marginMm/laneChains — not a hardcoded number — so a future change to
    // either formula that breaks their agreement fails this test, not just clips
    // silently past the reserved margin.
    const totalH = p.coveredHeightMm + p.leftoverHeightMm;
    const chains = laneChains(markers, totalH);
    const expectedYMargin = marginMm(chains.y);
    const expectedXMargin = marginMm(chains.x);
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} mode="measurements" />,
    );

    const yGroups = Array.from(container.querySelectorAll('[data-dim-line][data-axis="y"]'));
    const yLineX1s = yGroups.map((g) => {
      const dimLine = Array.from(g.querySelectorAll('line')).find((l) => l.getAttribute('x1') === l.getAttribute('x2'));
      return Number(dimLine?.getAttribute('x1'));
    });
    // The outermost lane's line sits exactly at -marginMm; no lane sits further out.
    expect(Math.min(...yLineX1s)).toBe(-expectedYMargin);
    expect(yLineX1s.every((x1) => x1 >= -expectedYMargin)).toBe(true);

    const xGroups = Array.from(container.querySelectorAll('[data-dim-line][data-axis="x"]'));
    const xLineY1s = xGroups.map((g) => {
      const dimLine = Array.from(g.querySelectorAll('line')).find((l) => l.getAttribute('y1') === l.getAttribute('y2'));
      return Number(dimLine?.getAttribute('y1'));
    });
    expect(Math.max(...xLineY1s)).toBe(totalH + expectedXMargin);
    expect(xLineY1s.every((y1) => y1 <= totalH + expectedXMargin)).toBe(true);
  });

  it('anchors each label next to its own point, inset a fixed screen distance back along the line', () => {
    // The label must read as "this point's measurement", so it sits at the
    // measured end of its line — not at the line's midpoint, which for a 400 mm
    // line floats 200 mm away from the marker it belongs to. The inset is a
    // screen-px amount (so it stays constant under zoom), derived here from the
    // same constant and formula the component uses rather than a magic number.
    const totalH = p.coveredHeightMm + p.leftoverHeightMm;
    for (const scale of [1, 2]) {
      const { container } = render(
        <Preview plan={p} viewport={{ scale, tx: 0, ty: 0 }} width={800} height={800} markers={markers} mode="measurements" />,
      );

      const xLabels = Array.from(container.querySelectorAll('[data-dim-label][data-axis="x"]'));
      expect(xLabels.length).toBeGreaterThan(0);
      for (const text of xLabels) {
        const value = Number(text.getAttribute('data-value'));
        const labelX = Number(text.getAttribute('x'));
        const inset = Math.min(DIM_LABEL_INSET_PX / scale, value / 2);
        expect(labelX).toBeCloseTo(value - inset);
        // At least as close to the point as to the origin — never past the
        // old midpoint (the very short 9mm outer-corner line clamps exactly to it).
        expect(labelX).toBeGreaterThanOrEqual(value / 2);
      }

      const yLabels = Array.from(container.querySelectorAll('[data-dim-label][data-axis="y"]'));
      expect(yLabels.length).toBeGreaterThan(0);
      for (const text of yLabels) {
        const value = Number(text.getAttribute('data-value'));
        const pointY = totalH - value;
        const labelX = Number(text.getAttribute('x'));
        const labelY = Number(text.getAttribute('y'));
        const inset = Math.min(DIM_LABEL_INSET_PX / scale, value / 2);
        expect(labelY).toBeCloseTo(pointY + inset);
        // At least as close to the point as to the floor — never past the old
        // midpoint (the very short 9mm outer-corner line clamps exactly to it).
        expect(labelY).toBeLessThanOrEqual((totalH + pointY) / 2);
        // The rotation must pivot on the label's own anchor or it drifts sideways.
        expect(text.getAttribute('transform')).toBe(`rotate(-90 ${labelX} ${labelY})`);
      }
    }
  });

  it('sits each label off its own line, not centered on it, so the stroke runs beside the glyphs instead of through them', () => {
    for (const scale of [1, 2]) {
      const { container } = render(
        <Preview plan={p} viewport={{ scale, tx: 0, ty: 0 }} width={800} height={800} markers={markers} mode="measurements" />,
      );
      const gap = DIM_LABEL_LINE_GAP_PX / scale;

      const xGroups = Array.from(container.querySelectorAll('[data-dim-line][data-axis="x"]'));
      const xLabels = Array.from(container.querySelectorAll('[data-dim-label][data-axis="x"]'));
      expect(xGroups.length).toBeGreaterThan(0);
      for (const g of xGroups) {
        const value = g.getAttribute('data-value');
        const dimLine = Array.from(g.querySelectorAll('line')).find((l) => l.getAttribute('y1') === l.getAttribute('y2'))!;
        const lineY = Number(dimLine.getAttribute('y1'));
        const label = xLabels.find((t) => t.getAttribute('data-value') === value)!;
        expect(Number(label.getAttribute('y'))).toBeCloseTo(lineY - gap);
      }

      const yGroups = Array.from(container.querySelectorAll('[data-dim-line][data-axis="y"]'));
      const yLabels = Array.from(container.querySelectorAll('[data-dim-label][data-axis="y"]'));
      expect(yGroups.length).toBeGreaterThan(0);
      for (const g of yGroups) {
        const value = g.getAttribute('data-value');
        const dimLine = Array.from(g.querySelectorAll('line')).find((l) => l.getAttribute('x1') === l.getAttribute('x2'))!;
        const lineX = Number(dimLine.getAttribute('x1'));
        const label = yLabels.find((t) => t.getAttribute('data-value') === value)!;
        const labelX = Number(label.getAttribute('x'));
        expect(labelX).toBeCloseTo(lineX + gap);
        // The rotation must pivot on the shifted anchor or the label drifts back onto the line.
        expect(label.getAttribute('transform')).toContain(`${labelX} `);
      }
    }
  });

  it('never insets a label past the midpoint of a very short line', () => {
    // 400x450's bottom-edge outer corner/edge nodes inset 9mm from the true
    // 440mm row boundary to raw y=431, which floor-relative is 450-431=19: a
    // line only 19 mm long, shorter than the 2 * inset it would need. The
    // label falls back to the midpoint instead of crossing it.
    const asym = plan({ widthMm: 400, heightMm: 450, model: skadisInfinity, printer: a1 });
    const asymMarkers = hardwareMarkers(asym, getMountSystem('wall-mounts'), skadisInfinity);
    const totalH = asym.coveredHeightMm + asym.leftoverHeightMm;
    const { container } = render(
      <Preview plan={asym} viewport={IDENTITY} width={800} height={800} markers={asymMarkers} mode="measurements" />,
    );
    const text = Array.from(container.querySelectorAll('[data-dim-label][data-axis="y"]'))
      .find((el) => el.getAttribute('data-value') === '19')!;
    expect(text).toBeDefined();
    expect(19 / 2).toBeLessThan(DIM_LABEL_INSET_PX); // the fixture really is the short case
    const pointY = totalH - 19;
    expect(Number(text.getAttribute('y'))).toBeCloseTo((totalH + pointY) / 2);
  });

  it('formats dimension labels in the given unit while leaving their screen position unchanged', () => {
    // Same 400x400 wall-mounts fixture used elsewhere in this describe block:
    // X = Y = [9, 200, 391] mm. In cm: 0.9, 20, 39.1.
    const { container: mmContainer } = render(
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} mode="measurements" />,
    );
    const { container: cmContainer } = render(
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} mode="measurements" unit="cm" />,
    );

    const mmLabels = Array.from(mmContainer.querySelectorAll('[data-dim-label][data-axis="x"]'));
    const cmLabels = Array.from(cmContainer.querySelectorAll('[data-dim-label][data-axis="x"]'));
    expect(cmLabels.length).toBe(mmLabels.length);
    expect(cmLabels.map((l) => l.textContent).sort()).toEqual(['0.9 cm', '20 cm', '39.1 cm'].sort());

    // Position (x/y) is driven by the raw mm value regardless of display unit.
    for (const mmLabel of mmLabels) {
      const value = mmLabel.getAttribute('data-value');
      const cmLabel = cmLabels.find((l) => l.getAttribute('data-value') === value)!;
      expect(cmLabel.getAttribute('x')).toBe(mmLabel.getAttribute('x'));
      expect(cmLabel.getAttribute('y')).toBe(mmLabel.getAttribute('y'));
    }
  });

  it('shifts the drawing by the given origin', () => {
    const { container } = render(
      <Preview plan={p} viewport={IDENTITY} width={800} height={800} markers={markers} origin={{ x: 100, y: 0 }} />,
    );
    const board = container.querySelector('[data-board]') as SVGGElement;
    const rect = board.querySelector('rect')!;
    expect(rect.getAttribute('x')).toBe('0'); // board's own mm coords are unaffected
    const outerGroup = container.querySelector('svg > g') as SVGGElement;
    expect(outerGroup.getAttribute('transform')).toContain('translate(100 0)');
  });
});
