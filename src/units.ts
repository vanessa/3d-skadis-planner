export type Unit = 'mm' | 'cm' | 'in';

export const UNITS: Unit[] = ['mm', 'cm', 'in'];

const MM_PER_UNIT: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };

export function toMm(value: number, unit: Unit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMm(mm: number, unit: Unit): number {
  return mm / MM_PER_UNIT[unit];
}
