export interface Printer {
  id: string;
  name: string;
  bedWidthMm: number;
  bedDepthMm: number;
}

/** Bed sizes in mm. Add presets here. */
export const PRINTERS: Printer[] = [
  { id: 'a1', name: 'Bambu Lab A1', bedWidthMm: 256, bedDepthMm: 256 },
  { id: 'a1-mini', name: 'Bambu Lab A1 mini', bedWidthMm: 180, bedDepthMm: 180 },
  { id: 'p1s', name: 'Bambu Lab P1S', bedWidthMm: 256, bedDepthMm: 256 },
  { id: 'x1c', name: 'Bambu Lab X1 Carbon', bedWidthMm: 256, bedDepthMm: 256 },
  { id: 'h2d', name: 'Bambu Lab H2D', bedWidthMm: 350, bedDepthMm: 320 },
];

export const CUSTOM_PRINTER_ID = 'custom';
export const DEFAULT_PRINTER_ID = 'a1';

export function getPrinter(
  id: string,
  custom: { bedWidthMm: number; bedDepthMm: number },
): Printer {
  if (id === CUSTOM_PRINTER_ID) {
    return { id, name: 'Custom', bedWidthMm: custom.bedWidthMm, bedDepthMm: custom.bedDepthMm };
  }
  const printer = PRINTERS.find((p) => p.id === id);
  if (!printer) throw new Error(`Unknown printer: ${id}`);
  return printer;
}
