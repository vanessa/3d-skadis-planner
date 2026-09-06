import type { PlacedBoard } from '../solver';
import type { HardwareMarker, NodeKind } from '../mounting';

export type Highlight =
  | { kind: 'boards'; cols: number; rows: number; mirrorX: boolean; mirrorY: boolean }
  | { kind: 'hardware'; per: Partial<Record<NodeKind, number>> };

export function boardMatches(h: Highlight, b: PlacedBoard): boolean {
  if (h.kind !== 'boards') return false;
  return h.cols === b.cols && h.rows === b.rows && h.mirrorX === b.mirrorX && h.mirrorY === b.mirrorY;
}

/**
 * True when a per-board hardware highlight matched no marker at all (e.g. a
 * system that only draws `nodes` markers has nothing for a `board`-keyed
 * row like a board screw to match) — in that case every board should light
 * up instead, so the highlight doesn't just dim everything on the preview.
 */
export function boardsFallback(h: Highlight, anyMarkerLit: boolean): boolean {
  return h.kind === 'hardware' && !!h.per.board && h.per.board > 0 && !anyMarkerLit;
}

export function markerMatches(h: Highlight, m: HardwareMarker): boolean {
  if (h.kind !== 'hardware') return false;
  const isNode = m.kind === 'nodes' || m.kind === 'outerNodes';
  for (const [kind, value] of Object.entries(h.per) as [NodeKind, number | undefined][]) {
    if (!value || value <= 0) continue;
    if (kind === 'junction' && isNode && m.role === 'junction') return true;
    if (kind === 'edgeNode' && isNode && m.role === 'edgeNode') return true;
    if (kind === 'outerCorner' && isNode && m.role === 'outerCorner') return true;
    if (kind === 'board' && m.kind === 'boardCorners') return true;
    if (kind === 'seam' && m.kind === 'seams') return true;
  }
  return false;
}
