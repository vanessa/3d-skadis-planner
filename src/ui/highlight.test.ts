import { describe, it, expect } from 'vitest';
import { boardMatches, markerMatches, boardsFallback, type Highlight } from './highlight';
import type { PlacedBoard } from '../solver';
import type { HardwareMarker } from '../mounting';

const board = (patch: Partial<PlacedBoard> = {}): PlacedBoard => ({
  col: 0,
  row: 0,
  cols: 9,
  rows: 9,
  widthMm: 200,
  heightMm: 200,
  xMm: 0,
  yMm: 0,
  mirrorX: false,
  mirrorY: false,
  ...patch,
});

describe('boardMatches', () => {
  const h: Highlight = { kind: 'boards', cols: 9, rows: 9, mirrorX: false, mirrorY: true };

  it('matches when cols/rows/mirrorX/mirrorY are all equal', () => {
    expect(boardMatches(h, board({ cols: 9, rows: 9, mirrorX: false, mirrorY: true }))).toBe(true);
  });

  it('does not match when any field differs', () => {
    expect(boardMatches(h, board({ cols: 8, rows: 9, mirrorX: false, mirrorY: true }))).toBe(false);
    expect(boardMatches(h, board({ cols: 9, rows: 8, mirrorX: false, mirrorY: true }))).toBe(false);
    expect(boardMatches(h, board({ cols: 9, rows: 9, mirrorX: true, mirrorY: true }))).toBe(false);
    expect(boardMatches(h, board({ cols: 9, rows: 9, mirrorX: false, mirrorY: false }))).toBe(false);
  });

  it('a hardware highlight never matches a board', () => {
    const hw: Highlight = { kind: 'hardware', per: { board: 1 } };
    expect(boardMatches(hw, board())).toBe(false);
  });
});

describe('markerMatches', () => {
  const marker = (patch: Partial<HardwareMarker>): HardwareMarker => ({ x: 0, y: 0, kind: 'nodes', ...patch });

  it('junction maps to nodes/outerNodes with role junction', () => {
    const h: Highlight = { kind: 'hardware', per: { junction: 1 } };
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'junction' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'outerNodes', role: 'junction' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'edgeNode' }))).toBe(false);
  });

  it('edgeNode maps to nodes/outerNodes with role edgeNode', () => {
    const h: Highlight = { kind: 'hardware', per: { edgeNode: 1 } };
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'edgeNode' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'outerNodes', role: 'edgeNode' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'junction' }))).toBe(false);
  });

  it('outerCorner maps to nodes/outerNodes with role outerCorner', () => {
    const h: Highlight = { kind: 'hardware', per: { outerCorner: 1 } };
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'outerCorner' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'outerNodes', role: 'outerCorner' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'junction' }))).toBe(false);
  });

  it('board maps to boardCorners markers', () => {
    const h: Highlight = { kind: 'hardware', per: { board: 1 } };
    expect(markerMatches(h, marker({ kind: 'boardCorners' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'outerCorner' }))).toBe(false);
  });

  it('seam maps to seams markers', () => {
    const h: Highlight = { kind: 'hardware', per: { seam: 1 } };
    expect(markerMatches(h, marker({ kind: 'seams', orientation: 'vertical' }))).toBe(true);
    expect(markerMatches(h, marker({ kind: 'boardCorners' }))).toBe(false);
  });

  it('ignores per entries that are zero or absent', () => {
    const h: Highlight = { kind: 'hardware', per: { junction: 0, edgeNode: 1 } };
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'junction' }))).toBe(false);
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'edgeNode' }))).toBe(true);
  });

  it('a boards highlight never matches a marker', () => {
    const h: Highlight = { kind: 'boards', cols: 9, rows: 9, mirrorX: false, mirrorY: false };
    expect(markerMatches(h, marker({ kind: 'nodes', role: 'junction' }))).toBe(false);
  });
});

describe('boardsFallback', () => {
  it('is true for a per-board hardware highlight when no marker matched', () => {
    const h: Highlight = { kind: 'hardware', per: { board: 4 } };
    expect(boardsFallback(h, false)).toBe(true);
  });

  it('is false for a per-board hardware highlight when a marker matched', () => {
    const h: Highlight = { kind: 'hardware', per: { board: 4 } };
    expect(boardsFallback(h, true)).toBe(false);
  });

  it('is false when per.board is absent or zero', () => {
    expect(boardsFallback({ kind: 'hardware', per: { junction: 1 } }, false)).toBe(false);
    expect(boardsFallback({ kind: 'hardware', per: { board: 0 } }, false)).toBe(false);
  });

  it('is false for a boards highlight', () => {
    const h: Highlight = { kind: 'boards', cols: 9, rows: 9, mirrorX: false, mirrorY: false };
    expect(boardsFallback(h, false)).toBe(false);
  });
});
