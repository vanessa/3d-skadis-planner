export type NodeKind = 'board' | 'junction' | 'edgeNode' | 'outerCorner' | 'seam';

export interface HardwareItem {
  name: string;
  per: Partial<Record<NodeKind, number>>;
  note?: string;
}

export interface MountSystem {
  id: string;
  name: string;
  url: string;
  description: string;
  /** True when the counts are assumed rather than read from the model page. */
  assumed?: boolean;
  items: HardwareItem[];
}
