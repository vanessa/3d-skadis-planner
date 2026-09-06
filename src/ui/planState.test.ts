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
  it('rejects a width or height above the 10 m cap', () => {
    expect(computePlan({ ...DEFAULT_FORM, width: '20000' }).error).toMatch(/10000/);
  });
  it('applies the cap after converting units to mm', () => {
    expect(computePlan({ ...DEFAULT_FORM, width: '1001', unit: 'cm' }).error).toMatch(/10000/);
  });
  it('rejects a custom bed size above the 2 m cap', () => {
    const out = computePlan({ ...DEFAULT_FORM, printerId: 'custom', customBedWidth: '5000' });
    expect(out.error).toMatch(/2000/);
  });
  it('defaults to the balanced strategy', () => {
    expect(DEFAULT_FORM.strategyId).toBe('balanced');
    expect(computePlan(DEFAULT_FORM).plan?.strategyId).toBe('balanced');
  });
  it('defaults to wall mounts', () => {
    expect(DEFAULT_FORM.mountId).toBe('wall-mounts');
  });
  it('passes the strategy and gap to the solver', () => {
    const out = computePlan({ ...DEFAULT_FORM, width: '820', height: '1000', strategyId: 'allow-gap', maxGap: '40' });
    expect(out.plan?.boards).toHaveLength(16);
  });
  it('validates the gap only for allow-gap', () => {
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'allow-gap', maxGap: '' }).error).toMatch(/max gap/i);
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'allow-gap', maxGap: '5000' }).error).toMatch(/1000/);
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'balanced', maxGap: '' }).error).toBeNull();
    expect(computePlan({ ...DEFAULT_FORM, strategyId: 'allow-gap', maxGap: '0' }).error).toBeNull();
  });
});
