import type { Plan } from '../solver';
import type { MountSystem, NodeKind } from './types';

export const NODE_KINDS: NodeKind[] = ['board', 'junction', 'edgeNode', 'outerCorner', 'seam'];

export function countNodes(columns: number, rows: number): Record<NodeKind, number> {
  const c = Math.max(0, columns);
  const r = Math.max(0, rows);
  if (c === 0 || r === 0) return { board: 0, junction: 0, edgeNode: 0, outerCorner: 0, seam: 0 };
  return {
    board: c * r,
    junction: (c - 1) * (r - 1),
    edgeNode: 2 * (c - 1) + 2 * (r - 1),
    outerCorner: 4,
    seam: r * (c - 1) + c * (r - 1),
  };
}

export interface HardwareRow {
  name: string;
  qty: number;
  note?: string;
  link?: string;
}

export function hardwareList(plan: Plan, system: MountSystem): HardwareRow[] {
  const nodes = countNodes(plan.columns.length, plan.rows.length);
  return system.items
    .map((item) => ({
      name: item.name,
      qty: NODE_KINDS.reduce((sum, kind) => sum + (item.per[kind] ?? 0) * nodes[kind], 0),
      ...(item.note ? { note: item.note } : {}),
      ...(item.link ? { link: item.link } : {}),
    }))
    .filter((row) => row.qty > 0);
}
