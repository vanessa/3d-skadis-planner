import { describe, it, expect } from 'vitest';
import { measurementsMargin } from './Canvas';
import type { Plan, PlacedBoard } from '../solver';
import type { HardwareMarker } from '../mounting';
import { marginMm, laneChains, overlayLegible } from '../mounting';
import { fitViewport } from './viewport';

function board(widthMm: number, heightMm: number): PlacedBoard {
  return {
    col: 0, row: 0, cols: 1, rows: 1, xMm: 0, yMm: 0, widthMm, heightMm, mirrorX: false, mirrorY: false,
  };
}

function fakePlan(boards: PlacedBoard[]): Plan {
  return {
    columns: [], rows: [], boards, coveredWidthMm: 0, coveredHeightMm: 0, leftoverWidthMm: 0, leftoverHeightMm: 0,
    groups: [], strategyId: 'balanced',
  };
}

// A single marker at x=50 and floor-height 100 (totalHeightMm - y=0=100) gives
// each axis exactly one lane, so marginMm() is BASE_GAP_MM + 1 * LANE_SPACING_MM
// (24 + 40 = 64mm) on both axes — known and independently recomputed below via
// the real laneChains/marginMm, not hardcoded.
const totalW = 100;
const totalH = 100;
const markers: HardwareMarker[] = [{ x: 50, y: 0, kind: 'boardCorners' }];
const chains = laneChains(markers, totalH);
const expectedLeft = marginMm(chains.y);
const expectedBottom = marginMm(chains.x);

describe('measurementsMargin', () => {
  it('reserves the lane margin marginMm computes when doing so keeps the boards legible', () => {
    const plan = fakePlan([board(totalW, totalH)]);
    // A generous stage keeps the margined fit scale well above the legibility floor.
    const margin = measurementsMargin({ width: 1600, height: 1600 }, plan, markers, totalW, totalH);
    expect(margin).toEqual({ left: expectedLeft, bottom: expectedBottom });
  });

  it('falls back to no margin when reserving it would push the boards below the legibility floor', () => {
    const plan = fakePlan([board(totalW, totalH)]);
    // A small, square stage: fitting the *unmargined* 100x100 world leaves the
    // 100mm board comfortably legible (52px, above MIN_MARKER_PX=32), but fitting
    // the *margined* 164x164 world (100 + the 64mm margin on each axis) drops it
    // to ~31.7px — just under the floor. This is exactly the bug from finding #1:
    // reserving margin unconditionally would make measurements mode go blank even
    // though hardware mode, at the same stage size, would still show markers fine.
    const stage = { width: 100, height: 100 };
    const unmarginedFit = fitViewport(stage, { width: totalW, height: totalH });
    expect(overlayLegible(plan.boards, unmarginedFit.scale)).toBe(true);
    const margined = { width: totalW + expectedLeft, height: totalH + expectedBottom };
    const marginedFit = fitViewport(stage, margined);
    expect(overlayLegible(plan.boards, marginedFit.scale)).toBe(false);

    const margin = measurementsMargin(stage, plan, markers, totalW, totalH);
    expect(margin).toBeNull();
  });
});
