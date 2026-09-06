export type NodeKind = 'board' | 'junction' | 'edgeNode' | 'outerCorner' | 'seam';

/** Whether a hardware item is 3D printed or bought. */
export type HardwareSource = 'print' | 'buy';

export interface HardwareItem {
  name: string;
  per: Partial<Record<NodeKind, number>>;
  /** Whether the item is 3D printed or bought. */
  source: HardwareSource;
  note?: string;
  link?: string;
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
}
