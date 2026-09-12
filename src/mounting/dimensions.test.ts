import { describe, it, expect } from 'vitest';
import {
  dimensionAxes, assignLanes, laneCount, marginMm, laneChains, scaleAwareMinGapMm,
  MIN_GAP_MM, MAX_LANES, LANE_SPACING_MM, BASE_GAP_MM, LABEL_GAP_PX,
} from './dimensions';
import { hardwareMarkers } from './markers';
import { getMountSystem } from './index';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });

describe('dimensionAxes', () => {
  it('rounds, dedupes, and sorts X directly and Y flipped from the floor', () => {
    const markers = [
      { x: 10.4, y: 5, kind: 'boardCorners' as const },
      { x: 10, y: 5, kind: 'boardCorners' as const },
      { x: 190, y: 195, kind: 'boardCorners' as const },
    ];
    expect(dimensionAxes(markers, 200)).toEqual({ x: [10, 190], y: [5, 195] });
  });

  it('matches the lattice for a real wall-mounts plan, plus the 9mm-inset outer corners', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
    expect(dimensionAxes(markers, 600)).toEqual({
      x: [0, 9, 200, 400, 600, 800, 991, 1000],
      y: [0, 9, 200, 400, 591, 600],
    });
  });
});

describe('assignLanes', () => {
  it('keeps every value on lane 0 when they are all far apart', () => {
    expect(assignLanes([0, 200, 400], 60)).toEqual([
      { mm: 0, lane: 0 }, { mm: 200, lane: 0 }, { mm: 400, lane: 0 },
    ]);
  });

  it('bumps a value too close to the previous one on its lane to the next lane', () => {
    expect(assignLanes([0, 30, 200], 60)).toEqual([
      { mm: 0, lane: 0 }, { mm: 30, lane: 1 }, { mm: 200, lane: 0 },
    ]);
  });

  it('shares the outermost lane once maxLanes is exhausted', () => {
    const result = assignLanes([0, 10, 20, 30, 40], 60, 2);
    expect(result).toEqual([
      { mm: 0, lane: 0 }, { mm: 10, lane: 1 }, { mm: 20, lane: 1 }, { mm: 30, lane: 1 }, { mm: 40, lane: 1 },
    ]);
  });

  it('defaults to MAX_LANES', () => {
    expect(assignLanes([0], MIN_GAP_MM).length).toBe(1);
    expect(MAX_LANES).toBe(4);
  });
});

describe('laneCount and marginMm', () => {
  it('is 0 for no values', () => {
    expect(laneCount([])).toBe(0);
    expect(marginMm([])).toBe(0);
  });

  it('counts the highest lane used, and sizes the margin from it', () => {
    // 0, 10, and 20 are all pairwise under the 60mm gap, so each needs its own lane.
    const laned = assignLanes([0, 10, 20], 60, 4); // lane 0, then 1, then 2
    expect(laneCount(laned)).toBe(3);
    expect(marginMm(laned)).toBe(BASE_GAP_MM + 3 * LANE_SPACING_MM);
  });
});

describe('scaleAwareMinGapMm', () => {
  it('never goes below the fixed MIN_GAP_MM floor', () => {
    expect(scaleAwareMinGapMm(100)).toBe(MIN_GAP_MM);
  });

  it('grows the gap at low scale, since a fixed mm gap shrinks to fewer screen px', () => {
    expect(scaleAwareMinGapMm(0.5)).toBe((2 * LABEL_GAP_PX) / 0.5);
  });

  it('falls back to the floor for a non-positive scale', () => {
    expect(scaleAwareMinGapMm(0)).toBe(MIN_GAP_MM);
    expect(scaleAwareMinGapMm(-1)).toBe(MIN_GAP_MM);
  });

  it('actually separates values onto more lanes at low scale than the fixed floor would', () => {
    // 0 and 100 are 100mm apart: enough for the fixed 60mm floor to share lane 0,
    // but not enough once a low scale demands more room for the labels.
    const atFloor = assignLanes([0, 100], MIN_GAP_MM);
    expect(atFloor.every((v) => v.lane === 0)).toBe(true);
    const atLowScale = assignLanes([0, 100], scaleAwareMinGapMm(0.3));
    expect(atLowScale.map((v) => v.lane)).toEqual([0, 1]);
  });
});

describe('laneChains', () => {
  it('drops the zero value on each axis (the origin corner needs no dimension line)', () => {
    const p = plan({ widthMm: 400, heightMm: 400, model: skadisInfinity, printer: a1 });
    const markers = hardwareMarkers(p, getMountSystem('wall-mounts'), skadisInfinity);
    const chains = laneChains(markers, 400);
    expect(chains.x.map((v) => v.mm)).toEqual([9, 200, 391, 400]);
    expect(chains.y.map((v) => v.mm)).toEqual([9, 200, 391, 400]);
  });
});
