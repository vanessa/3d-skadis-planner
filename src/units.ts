export type Unit = 'mm' | 'cm' | 'in';

export const UNITS: Unit[] = ['mm', 'cm', 'in'];

const MM_PER_UNIT: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };

export function toMm(value: number, unit: Unit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMm(mm: number, unit: Unit): number {
  return mm / MM_PER_UNIT[unit];
}

/**
 * `mm` converted to `unit` and rounded to 2 decimal places (trailing zeros
 * dropped by string conversion) — e.g. `formatMmValue(200, 'in')` -> "7.87".
 * Matches InputPanel.tsx's `convert()` rounding convention.
 */
export function formatMmValue(mm: number, unit: Unit): string {
  return String(Math.round(fromMm(mm, unit) * 100) / 100);
}

/** `formatMmValue` with the unit suffix appended — e.g. "200 mm", "20 cm", "7.87 in". */
export function formatMm(mm: number, unit: Unit): string {
  return `${formatMmValue(mm, unit)} ${unit}`;
}
