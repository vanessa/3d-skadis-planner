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

  let bedWidthMm = 0;
  let bedDepthMm = 0;
  if (form.printerId === CUSTOM_PRINTER_ID) {
    const w = parsePositive(form.customBedWidth);
    const d = parsePositive(form.customBedDepth);
    if (w === null || d === null) return { plan: null, error: 'Enter a bed width and depth greater than zero.' };
    bedWidthMm = w;
    bedDepthMm = d;
  }

  try {
    const result = plan({
      widthMm: toMm(width, form.unit),
      heightMm: toMm(height, form.unit),
      model: getModel(form.modelId),
      printer: getPrinter(form.printerId, { bedWidthMm, bedDepthMm }),
    });
    return { plan: result, error: null };
  } catch (e) {
    if (e instanceof PlanError) return { plan: null, error: e.message };
    throw e;
  }
}
