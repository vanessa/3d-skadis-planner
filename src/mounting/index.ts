import type { MountSystem } from './types';
import { MOUNT_SYSTEMS } from './systems';

export type { NodeKind, HardwareItem, MountSystem, MarkerKind, HardwareMarker } from './types';
export { MOUNT_SYSTEMS } from './systems';
export { hardwareList, countNodes } from './hardware';
export type { HardwareRow } from './hardware';
export { hardwareMarkers } from './markers';

export const DEFAULT_MOUNT_ID = 'wall-mounts';

export function getMountSystem(id: string): MountSystem {
  const system = MOUNT_SYSTEMS.find((s) => s.id === id);
  if (!system) throw new Error(`Unknown mount system: ${id}`);
  return system;
}
