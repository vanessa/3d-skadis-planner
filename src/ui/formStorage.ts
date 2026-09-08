import { DEFAULT_FORM, type FormState } from './planState';
import { UNITS, type Unit } from '../units';
import { STRATEGIES } from '../solver';
import { MODELS } from '../models';
import { PRINTERS, CUSTOM_PRINTER_ID } from '../printers';
import { MOUNT_SYSTEMS, defaultWallDistance, wallDistances } from '../mounting';

export const FORM_STORAGE_KEY = 'planner.form.v1';

function isUnit(value: string): value is Unit {
  return (UNITS as string[]).includes(value);
}

/** Read and sanitise the stored form. Returns null when nothing valid was stored. */
export function readStoredForm(): FormState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(FORM_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const stored = parsed as Record<string, unknown>;

  const form: FormState = { ...DEFAULT_FORM };
  let any = false;

  const copyString = (key: 'width' | 'height' | 'customBedWidth' | 'customBedDepth' | 'maxGap') => {
    const value = stored[key];
    if (typeof value === 'string') {
      form[key] = value;
      any = true;
    }
  };
  copyString('width');
  copyString('height');
  copyString('customBedWidth');
  copyString('customBedDepth');
  copyString('maxGap');

  if (typeof stored.unit === 'string' && isUnit(stored.unit)) {
    form.unit = stored.unit;
    any = true;
  }
  if (typeof stored.strategyId === 'string' && STRATEGIES.some((s) => s.id === stored.strategyId)) {
    form.strategyId = stored.strategyId as FormState['strategyId'];
    any = true;
  }
  if (typeof stored.modelId === 'string' && MODELS.some((m) => m.id === stored.modelId)) {
    form.modelId = stored.modelId;
    any = true;
  }
  if (
    typeof stored.printerId === 'string' &&
    (stored.printerId === CUSTOM_PRINTER_ID || PRINTERS.some((p) => p.id === stored.printerId))
  ) {
    form.printerId = stored.printerId;
    any = true;
  }
  const system = MOUNT_SYSTEMS.find((s) => s.id === stored.mountId);
  if (system) {
    form.mountId = system.id;
    any = true;
  }
  const current = MOUNT_SYSTEMS.find((s) => s.id === form.mountId)!;
  if (typeof stored.wallDistance === 'string' && wallDistances(current).includes(Number(stored.wallDistance))) {
    form.wallDistance = stored.wallDistance;
    any = true;
  } else {
    form.wallDistance = String(defaultWallDistance(current));
  }

  return any ? form : null;
}

export function writeStoredForm(form: FormState): void {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

export function clearStoredForm(): void {
  try {
    localStorage.removeItem(FORM_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
