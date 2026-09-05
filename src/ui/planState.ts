import { plan, PlanError, type Plan } from '../solver';
import { getModel, DEFAULT_MODEL_ID } from '../models';
import { getPrinter, DEFAULT_PRINTER_ID, CUSTOM_PRINTER_ID } from '../printers';
import { toMm, type Unit } from '../units';

export interface FormState {
  width: string;
  height: string;
  unit: Unit;
  modelId: string;
  printerId: string;
  customBedWidth: string;
  customBedDepth: string;
}

export const DEFAULT_FORM: FormState = {
  width: '1000',
  height: '600',
  unit: 'mm',
  modelId: DEFAULT_MODEL_ID,
  printerId: DEFAULT_PRINTER_ID,
  customBedWidth: '256',
  customBedDepth: '256',
};

export interface PlanOutcome {
  plan: Plan | null;
  error: string | null;
}

/** Widths and heights above this (in mm, after unit conversion) are rejected. */
export const MAX_AXIS_MM = 10_000;
/** Custom bed widths and depths above this (in mm) are rejected. */
export const MAX_BED_MM = 2_000;

function parsePositive(raw: string): number | null {
  const n = Number(raw.trim());
  if (raw.trim() === '' || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function computePlan(form: FormState): PlanOutcome {
  const width = parsePositive(form.width);
  if (width === null) return { plan: null, error: 'Enter a width greater than zero.' };
  const height = parsePositive(form.height);
  if (height === null) return { plan: null, error: 'Enter a height greater than zero.' };

  const widthMm = toMm(width, form.unit);
  const heightMm = toMm(height, form.unit);
  if (widthMm > MAX_AXIS_MM) return { plan: null, error: `Width must be ${MAX_AXIS_MM} mm (10 m) or less.` };
  if (heightMm > MAX_AXIS_MM) return { plan: null, error: `Height must be ${MAX_AXIS_MM} mm (10 m) or less.` };

  let bedWidthMm = 0;
  let bedDepthMm = 0;
  if (form.printerId === CUSTOM_PRINTER_ID) {
    const w = parsePositive(form.customBedWidth);
    const d = parsePositive(form.customBedDepth);
    if (w === null || d === null) return { plan: null, error: 'Enter a bed width and depth greater than zero.' };
    if (w > MAX_BED_MM || d > MAX_BED_MM) {
      return { plan: null, error: `Bed width and depth must be ${MAX_BED_MM} mm or less.` };
    }
    bedWidthMm = w;
    bedDepthMm = d;
  }

  try {
    const result = plan({
      widthMm,
      heightMm,
      model: getModel(form.modelId),
      printer: getPrinter(form.printerId, { bedWidthMm, bedDepthMm }),
    });
    return { plan: result, error: null };
  } catch (e) {
    if (e instanceof PlanError) return { plan: null, error: e.message };
    throw e;
  }
}
