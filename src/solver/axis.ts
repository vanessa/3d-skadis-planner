import type { BoardModel } from '../models/types';
import { PlanError } from './errors';
import { balanced, type Strategy } from './strategies';

export interface AxisSplit {
  /** Hole counts per board along this axis, largest first. */
  holes: number[];
  /** Space left uncovered along this axis. Always below one board pitch unless a cover was impossible. */
  leftoverMm: number;
}

/**
 * Split one axis of the space into boards that fit the bed, using the given
 * strategy (balanced by default). Works in "units" of one pitch: a board
 * with h holes is h + 1 units long.
 */
export function splitAxis(
  lengthMm: number,
  bedMm: number,
  model: BoardModel,
  axis: 'x' | 'y',
  strategy: Strategy = balanced,
  maxGapMm = 0,
): AxisSplit {
  const pitch = model.pitchMm;
  const minU = model.minHoles + 1;
  const bedHoles = Math.floor(bedMm / pitch) - 1;
  const maxU = Math.min(model.maxHoles, bedHoles) + 1;
  const smallest = model.sizeMm(model.minHoles);
  const needsMirror = axis === 'x' ? (h: number) => model.needsMirrorX(h) : (h: number) => model.needsMirrorY(h);

  if (maxU < minU) {
    throw new PlanError(
      'bed-too-small',
      `The print bed (${bedMm} mm) cannot fit the smallest board (${smallest} mm).`,
    );
  }

  const avail = Math.floor(lengthMm / pitch);
  if (avail < minU) {
    throw new PlanError(
      'too-small',
      `The space (${lengthMm} mm) is smaller than the smallest board (${smallest} mm).`,
    );
  }

  const ctx = { avail, minU, maxU, needsMirror, gapUnits: Math.max(0, Math.floor(maxGapMm / pitch)) };
  const k = Math.ceil(avail / maxU);
  const units =
    k * minU > avail
      ? Array<number>(k - 1).fill(maxU)
      : (strategy.search(ctx) ?? balanced.search(ctx) ?? Array<number>(k - 1).fill(maxU));

  const used = units.reduce((sum, u) => sum + u, 0);
  return { holes: units.map((u) => u - 1), leftoverMm: lengthMm - used * pitch };
}
