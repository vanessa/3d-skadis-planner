import type { Plan, BoardGroup, PlacedBoard } from '../solver';
import { getStrategy } from '../solver';
import type { BoardModel } from '../models';
import type { Printer } from '../printers';
import type { MountSystem } from '../mounting';
import { hardwareList, hardwareMarkers, dimensionAxes } from '../mounting';

export interface PrintListInput {
  plan: Plan;
  model: BoardModel;
  printer: Printer;
  widthMm: number;
  heightMm: number;
  date: Date;
  system: MountSystem;
  /** Board-to-wall distance in mm; omitted when the system offers none. */
  wallDistanceMm?: number;
}

const WRAP = 78;
const mm = (n: number) => String(Math.round(n));
const pad2 = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export interface CreditLine {
  /** What is being credited: `Boards`, `Mounts`, or `Boards and mounts` when one author made both. */
  label: string;
  name: string;
  url: string;
}

/** Who to thank for the boards and the mount files, merged into one line when they share an author. */
export function creditLines(model: BoardModel, system: MountSystem): CreditLine[] {
  const boards = { label: 'Boards', name: model.author.name, url: model.author.url };
  if (!system.author) return [boards];
  if (system.author.name === model.author.name) return [{ ...boards, label: 'Boards and mounts' }];
  return [boards, { label: 'Mounts', name: system.author.name, url: system.author.url }];
}

export function printListFileName(widthMm: number, heightMm: number): string {
  return `skadis-plan-${mm(widthMm)}x${mm(heightMm)}.txt`;
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

function hardwareBlock(plan: Plan, system: MountSystem, wallDistanceMm?: number): string[] {
  const rows = hardwareList(plan, system);
  const distance = wallDistanceMm === undefined ? '' : `, ${wallDistanceMm} mm from the wall`;
  const qtyWidth = Math.max(3, ...rows.map((r) => String(r.qty).length));
  const rowLine = (r: (typeof rows)[number]) =>
    `${String(r.qty).padStart(qtyWidth)}  ${r.name}${r.link ? ` (model: ${r.link})` : ''}${r.note ? ` (${r.note})` : ''}`;
  const printed = rows.filter((r) => r.source === 'print');
  const bought = rows.filter((r) => r.source === 'buy');
  return [
    `Hardware (${system.name}${distance})`,
    ...(printed.length ? ['3D print:', ...printed.map(rowLine)] : []),
    ...(bought.length ? ['Buy:', ...bought.map(rowLine)] : []),
    `Mount files: ${system.url}`,
  ];
}

function measurementsBlock(plan: Plan, system: MountSystem, model: BoardModel, totalHeightMm: number): string[] {
  const markers = hardwareMarkers(plan, system, model);
  const { x, y } = dimensionAxes(markers, totalHeightMm);
  const nonZero = (values: number[]) => values.filter((v) => v > 0);
  const xVals = nonZero(x);
  const yVals = nonZero(y);
  if (xVals.length === 0 && yVals.length === 0) return [];
  return [
    'Drill point measurements (mm, from the bottom-left corner)',
    `X: ${xVals.map(mm).join(', ')}`,
    `Y: ${yVals.map(mm).join(', ')}`,
  ];
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

export function formatPrintList({
  plan, model, printer, widthMm, heightMm, date, system, wallDistanceMm,
}: PrintListInput): string {
  const result = [`${plan.boards.length} ${plan.boards.length === 1 ? 'board' : 'boards'}`,
    `covers ${mm(plan.coveredWidthMm)} x ${mm(plan.coveredHeightMm)} mm`];
  if (Math.round(plan.leftoverWidthMm) > 0) result.push(`${mm(plan.leftoverWidthMm)} mm left on the right`);
  if (Math.round(plan.leftoverHeightMm) > 0) result.push(`${mm(plan.leftoverHeightMm)} mm left at the bottom`);
  const hasMirror = plan.groups.some((g) => g.mirrorX || g.mirrorY);
  const title = 'Skadis Planner - print list';
  const measurements = measurementsBlock(plan, system, model, heightMm);
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
    ...hardwareBlock(plan, system, wallDistanceMm),
    '',
    ...measurements,
    ...(measurements.length ? [''] : []),
    'Layout (columns left to right, rows top to bottom; * mirrored X, + mirrored Y, # mirrored X + Y)',
    ...layout(plan),
    ...(hasMirror ? ['', ...wrapText(model.mirrorNote)] : []),
    '',
    ...creditLines(model, system).map((c) => `${c.label} by ${c.name} - ${c.url}`),
    model.author.thanks,
    `Generated ${localDate(date)} with Skadis Planner`,
    '',
  ];
  return lines.join('\n');
}
