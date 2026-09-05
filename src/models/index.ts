import type { BoardModel } from './types';
import { skadisInfinity } from './skadisInfinity';

export type { BoardModel } from './types';

/** Add new models here. Order is the order shown in the UI. */
export const MODELS: BoardModel[] = [skadisInfinity];

export const DEFAULT_MODEL_ID = skadisInfinity.id;

export function getModel(id: string): BoardModel {
  const model = MODELS.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
}
