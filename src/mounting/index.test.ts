import { describe, it, expect } from 'vitest';
import {
  MOUNT_SYSTEMS, DEFAULT_MOUNT_ID, DEFAULT_WALL_DISTANCE_MM, getMountSystem,
  wallDistances, defaultWallDistance, resolveMountSystem,
} from './index';
import { NODE_KINDS } from './hardware';
import { seamSystem } from './testFixtures';

describe('mounting registry', () => {
  it('lists systems in order', () => {
    expect(MOUNT_SYSTEMS.map((s) => s.id)).toEqual(['wall-mounts', 'spacers']);
  });

  it('defaults to wall mounts', () => {
    expect(DEFAULT_MOUNT_ID).toBe('wall-mounts');
  });

  it('throws for an unknown id', () => {
    expect(() => getMountSystem('nope')).toThrow(/unknown mount/i);
  });

  it('gives every system at least one item', () => {
    for (const system of MOUNT_SYSTEMS) {
      expect(system.items.length).toBeGreaterThan(0);
    }
  });

  it('gives every system at least one marker kind', () => {
    for (const system of MOUNT_SYSTEMS) {
      expect(system.markers.length).toBeGreaterThan(0);
    }
  });

  it('offers 10 mm on every shipped system and defaults to it', () => {
    expect(DEFAULT_WALL_DISTANCE_MM).toBe(10);
    expect(wallDistances(getMountSystem('wall-mounts'))).toEqual([10, 20]);
    expect(wallDistances(getMountSystem('spacers'))).toEqual([10, 15, 20]);
    for (const system of MOUNT_SYSTEMS) expect(defaultWallDistance(system)).toBe(10);
  });

  it('offers no distance for a system without profiles', () => {
    expect(wallDistances(seamSystem)).toEqual([]);
    expect(defaultWallDistance(seamSystem)).toBe(DEFAULT_WALL_DISTANCE_MM);
    expect(resolveMountSystem(seamSystem, 10)).toEqual(seamSystem);
  });

  it('falls back to the smallest distance when 10 mm is not offered', () => {
    const system = { ...seamSystem, profiles: { 20: 'https://example.com/20', 15: 'https://example.com/15' } };
    expect(wallDistances(system)).toEqual([15, 20]);
    expect(defaultWallDistance(system)).toBe(15);
  });

  it('resolves the system url and item links to the profile for the distance', () => {
    const resolved = resolveMountSystem(getMountSystem('wall-mounts'), 20);
    expect(resolved.url).toBe('https://makerworld.com/en/models/861073#profileId-811358');
    const single = resolved.items.find((i) => i.name === 'Single wall mount');
    expect(single?.link).toBe('https://makerworld.com/en/models/420877#profileId-323616');
    expect(resolved.items.find((i) => i.name === 'Quad wall mount')?.link).toBeUndefined();
    // the registry itself is untouched
    expect(getMountSystem('wall-mounts').url).toBe('https://makerworld.com/en/models/861073');
  });

  it('keeps the system default nodeInsetMm when no override is given', () => {
    expect(resolveMountSystem(getMountSystem('wall-mounts'), 10).nodeInsetMm).toBe(9);
    expect(resolveMountSystem(getMountSystem('wall-mounts'), 10, undefined).nodeInsetMm).toBe(9);
  });

  it('overrides nodeInsetMm when given, without touching anything else', () => {
    const resolved = resolveMountSystem(getMountSystem('wall-mounts'), 20, 15);
    expect(resolved.nodeInsetMm).toBe(15);
    expect(resolved.url).toBe('https://makerworld.com/en/models/861073#profileId-811358');
  });

  it('lets an override set nodeInsetMm to 0', () => {
    expect(resolveMountSystem(getMountSystem('wall-mounts'), 10, 0).nodeInsetMm).toBe(0);
  });

  it('keeps the plain links for a distance the system does not offer', () => {
    const resolved = resolveMountSystem(getMountSystem('wall-mounts'), 15);
    expect(resolved.url).toBe('https://makerworld.com/en/models/861073');
    expect(resolved.items.find((i) => i.name === 'Single wall mount')?.link).toBe(
      'https://makerworld.com/en/models/420877',
    );
  });

  it('gives every item at least one positive integer per-kind multiplier', () => {
    for (const system of MOUNT_SYSTEMS) {
      for (const item of system.items) {
        const entries = Object.entries(item.per);
        expect(entries.length).toBeGreaterThan(0);
        for (const [kind, value] of entries) {
          expect(NODE_KINDS).toContain(kind);
          expect(Number.isInteger(value)).toBe(true);
          expect(value as number).toBeGreaterThan(0);
        }
      }
    }
  });
});
