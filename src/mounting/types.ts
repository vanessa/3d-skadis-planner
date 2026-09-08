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
  /** Profile per wall distance, used in place of `url` once resolved. Its keys are the distances offered. */
  profiles?: WallProfiles;
  /** Who designed the mount files, for the credit line. */
  author?: { name: string; url: string };
}
