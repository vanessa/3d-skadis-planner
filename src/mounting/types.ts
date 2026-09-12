export type NodeKind = 'board' | 'junction' | 'edgeNode' | 'outerCorner' | 'seam';

/** Whether a hardware item is 3D printed or bought. */
export type HardwareSource = 'print' | 'buy';

/** Print profile URL per board-to-wall distance in mm. */
export type WallProfiles = Record<number, string>;

export interface HardwareItem {
  name: string;
  per: Partial<Record<NodeKind, number>>;
  /** Whether the item is 3D printed or bought. */
  source: HardwareSource;
  note?: string;
  link?: string;
  /** Profile per wall distance, used in place of `link` once resolved. */
  profiles?: WallProfiles;
}

/** Kinds of hardware marker drawn on the 2D preview. */
export type MarkerKind = 'nodes' | 'outerNodes' | 'boardCorners' | 'seams';

export interface HardwareMarker {
  x: number;
  y: number;
  kind: MarkerKind;
  /** Set on `nodes` markers, by lattice position. */
  role?: 'junction' | 'edgeNode' | 'outerCorner';
  /** Set on `seams` markers: the direction of the seam line itself. */
  orientation?: 'vertical' | 'horizontal';
}

export interface MountSystem {
  id: string;
  name: string;
  url: string;
  description: string;
  items: HardwareItem[];
  /** Marker kinds drawn on the 2D preview for this system. */
  markers: MarkerKind[];
  /**
   * mm the outer-corner mount's screw sits in from the true board corner, for
   * a lone board with no neighbor to share the point with (junctions and edge
   * nodes need no inset — the mount there sits at the shared meeting point of
   * 2-4 boards, not any one board's own hole). Only meaningful when `markers`
   * includes `nodes`/`outerNodes`. Defaults to 0.
   */
  outerCornerInsetMm?: number;
  /** Profile per wall distance, used in place of `url` once resolved. Its keys are the distances offered. */
  profiles?: WallProfiles;
  /** Who designed the mount files, for the credit line. */
  author?: { name: string; url: string };
}
