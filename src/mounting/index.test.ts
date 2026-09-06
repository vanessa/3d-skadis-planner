import { describe, it, expect } from 'vitest';
import { MOUNT_SYSTEMS, DEFAULT_MOUNT_ID, getMountSystem } from './index';
import { NODE_KINDS } from './hardware';

describe('mounting registry', () => {
  it('lists systems in order', () => {
    expect(MOUNT_SYSTEMS.map((s) => s.id)).toEqual(['wall-mounts', 'spacers', 'threaded-connectors']);
  });

  it('defaults to wall mounts', () => {
    expect(DEFAULT_MOUNT_ID).toBe('wall-mounts');
  });

  it('throws for an unknown id', () => {
    expect(() => getMountSystem('nope')).toThrow(/unknown mount/i);
  });

  it('marks the threaded connector system as assumed', () => {
    expect(getMountSystem('threaded-connectors').assumed).toBe(true);
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
