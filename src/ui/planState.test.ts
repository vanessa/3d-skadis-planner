import { describe, it, expect } from 'vitest';
import { computePlan, DEFAULT_FORM } from './planState';

describe('computePlan', () => {
  it('plans the defaults: 1000 x 600 mm on an A1', () => {
    const out = computePlan(DEFAULT_FORM);
    expect(out.error).toBeNull();
    expect(out.plan?.boards).toHaveLength(15);
  });
  it('converts cm input to mm', () => {
    const out = computePlan({ ...DEFAULT_FORM, width: '100', height: '60', unit: 'cm' });
    expect(out.plan?.boards).toHaveLength(15);
  });
  it('rejects empty, non-numeric and non-positive sizes', () => {
    expect(computePlan({ ...DEFAULT_FORM, width: '' }).error).toMatch(/width/i);
    expect(computePlan({ ...DEFAULT_FORM, height: 'abc' }).error).toMatch(/height/i);
    expect(computePlan({ ...DEFAULT_FORM, width: '0' }).error).toMatch(/width/i);
    expect(computePlan({ ...DEFAULT_FORM, height: '-5' }).error).toMatch(/height/i);
  });
  it('uses the custom bed when the custom printer is selected', () => {
    const out = computePlan({
      ...DEFAULT_FORM,
      printerId: 'custom',
      customBedWidth: '180',
      customBedDepth: '180',
    });
    // 1000 / 180-cap(8 holes = 180 mm) -> 6 columns, 600 -> 4 rows.
    expect(out.plan?.boards).toHaveLength(24);
  });
  it('rejects an invalid custom bed', () => {
    const out = computePlan({ ...DEFAULT_FORM, printerId: 'custom', customBedWidth: '' });
    expect(out.error).toMatch(/bed/i);
  });
  it('surfaces solver errors as messages', () => {
    const out = computePlan({ ...DEFAULT_FORM, width: '50' });
    expect(out.plan).toBeNull();
    expect(out.error).toMatch(/smaller than the smallest board/);
  });
});
