export type NodeKind = 'board' | 'junction' | 'edgeNode' | 'outerCorner' | 'seam';

export interface HardwareItem {
  name: string;
  per: Partial<Record<NodeKind, number>>;
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
  /** True when the counts are assumed rather than read from the model page. */
  assumed?: boolean;
  items: HardwareItem[];
  /** Marker kinds drawn on the 2D preview for this system. */
  markers: MarkerKind[];
}
