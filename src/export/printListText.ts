import type { Plan, BoardGroup, PlacedBoard } from '../solver';
import { getStrategy } from '../solver';
import type { BoardModel } from '../models';
import type { Printer } from '../printers';

export interface PrintListInput {
  plan: Plan; model: BoardModel; printer: Printer; widthMm: number; heightMm: number; date: Date;
}

const WRAP = 78;
const mm = (n: number) => String(Math.round(n));
const pad2 = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function printListFileName(widthMm: number, heightMm: number): string {
  return `board-plan-${mm(widthMm)}x${mm(heightMm)}.txt`;
}

function printAs(g: { mirrorX: boolean; mirrorY: boolean }): string {
  if (g.mirrorX && g.mirrorY) return 'mirrored X + Y';
  if (g.mirrorX) return 'mirrored X';
  if (g.mirrorY) return 'mirrored Y';
  return 'as is';
}

function mark(b: PlacedBoard): string {
  if (b.mirrorX && b.mirrorY) return '#';
  if (b.mirrorX) return '*';
  if (b.mirrorY) return '+';
  return '';
}

export function wrapText(text: string, width = WRAP): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line !== '' && (line + ' ' + word).trim().length > width) {
      out.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) out.push(line);
  return out;
}

function table(groups: BoardGroup[], model: BoardModel): string[] {
  const rows = groups.map((g) => [
    String(g.count), model.fileName(g.cols, g.rows), `${g.widthMm} x ${g.heightMm} mm`, printAs(g),
  ]);
  const header = ['Qty', 'File', 'Size', 'Print as'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[], alignRightFirst: boolean) =>
    cells
      .map((c, i) => (i === 0 && alignRightFirst ? c.padStart(widths[0]) : c.padEnd(widths[i])))
      .join('  ')
      .trimEnd();
  return [line(header, false), ...rows.map((r) => line(r, true))];
}

function layout(plan: Plan): string[] {
  const cells = plan.boards.map((b) => `${b.cols}x${b.rows}${mark(b)}`);
  const width = Math.max(...cells.map((c) => c.length));
  const cols = plan.columns.length;
  const lines: string[] = [];
  for (let r = 0; r < plan.rows.length; r++) {
    lines.push(cells.slice(r * cols, (r + 1) * cols).map((c) => c.padEnd(width)).join('  ').trimEnd());
  }
  return lines;
}

export function formatPrintList({ plan, model, printer, widthMm, heightMm, date }: PrintListInput): string {
  const result = [`${plan.boards.length} ${plan.boards.length === 1 ? 'board' : 'boards'}`,
    `covers ${mm(plan.coveredWidthMm)} x ${mm(plan.coveredHeightMm)} mm`];
  if (Math.round(plan.leftoverWidthMm) > 0) result.push(`${mm(plan.leftoverWidthMm)} mm left on the right`);
  if (Math.round(plan.leftoverHeightMm) > 0) result.push(`${mm(plan.leftoverHeightMm)} mm left at the bottom`);
  const title = 'Board planner - print list';
  const lines = [
    title,
    '='.repeat(title.length),
    `Space:    ${mm(widthMm)} x ${mm(heightMm)} mm`,
    `Model:    ${model.name}`,
    `          ${model.url}`,
    `Printer:  ${printer.name} (bed ${printer.bedWidthMm} x ${printer.bedDepthMm} mm)`,
    `Strategy: ${getStrategy(plan.strategyId).name}`,
    `Result:   ${result.join(', ')}`,
    '',
    ...table(plan.groups, model),
    '',
    'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
    ...layout(plan),
    '',
    ...wrapText(model.mirrorNote),
    '',
    `Boards designed by ${model.author.name} - ${model.author.url}`,
    model.author.thanks,
    `Generated ${localDate(date)} with Board planner`,
    '',
  ];
  return lines.join('\n');
}
