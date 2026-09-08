import type { MountSystem } from './types';
import { MOUNT_SYSTEMS } from './systems';

export type {
  NodeKind, HardwareItem, HardwareSource, MountSystem, MarkerKind, HardwareMarker, WallProfiles,
} from './types';
export { MOUNT_SYSTEMS } from './systems';
export { hardwareList, countNodes } from './hardware';
export type { HardwareRow } from './hardware';
export { hardwareMarkers } from './markers';

export const DEFAULT_MOUNT_ID = 'wall-mounts';
/** Board-to-wall distance picked until the user changes it, in mm. */
export const DEFAULT_WALL_DISTANCE_MM = 10;

export function getMountSystem(id: string): MountSystem {
  const system = MOUNT_SYSTEMS.find((s) => s.id === id);
  if (!system) throw new Error(`Unknown mount system: ${id}`);
  return system;
}

/** Wall distances (mm) the system's files come in, ascending. Empty when the system has no profiles. */
export function wallDistances(system: MountSystem): number[] {
  return Object.keys(system.profiles ?? {})
    .map(Number)
    .sort((a, b) => a - b);
}

/** The default distance if the system offers it (or offers none), else its smallest one. */
export function defaultWallDistance(system: MountSystem): number {
  const offered = wallDistances(system);
  if (offered.length === 0 || offered.includes(DEFAULT_WALL_DISTANCE_MM)) return DEFAULT_WALL_DISTANCE_MM;
  return offered[0];
}

/** A copy of the system whose url and item links point at the profiles for `mm`, where they exist. */
export function resolveMountSystem(system: MountSystem, mm: number): MountSystem {
  return {
    ...system,
    url: system.profiles?.[mm] ?? system.url,
    items: system.items.map((item) => {
      const link = item.profiles?.[mm] ?? item.link;
      return link ? { ...item, link } : item;
    }),
  };
}
