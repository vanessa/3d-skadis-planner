import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FORM_STORAGE_KEY, readStoredForm, writeStoredForm, clearStoredForm } from './formStorage';
import { DEFAULT_FORM, type FormState } from './planState';
import { DEFAULT_MOUNT_ID } from '../mounting';

describe('formStorage', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('round-trips a written form', () => {
    const form: FormState = { ...DEFAULT_FORM, width: '820', height: '1000' };
    writeStoredForm(form);
    expect(readStoredForm()).toEqual(form);
  });

  it('returns null for invalid JSON', () => {
    window.localStorage.setItem(FORM_STORAGE_KEY, 'not json');
    expect(readStoredForm()).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredForm()).toBeNull();
  });

  it('falls back to the default mount id for a removed system', () => {
    window.localStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({ width: '500', mountId: 'threaded-connectors' }),
    );
    const form = readStoredForm();
    expect(form?.mountId).toBe(DEFAULT_MOUNT_ID);
    expect(form?.width).toBe('500');
  });

  it('keeps a stored wall distance the stored system offers', () => {
    window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({ mountId: 'spacers', wallDistance: '15' }));
    const form = readStoredForm();
    expect(form?.mountId).toBe('spacers');
    expect(form?.wallDistance).toBe('15');
  });

  it('falls back to the default wall distance when the stored system does not offer it', () => {
    window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({ mountId: 'wall-mounts', wallDistance: '15' }));
    expect(readStoredForm()?.wallDistance).toBe('10');
    window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({ width: '500', wallDistance: 'abc' }));
    expect(readStoredForm()?.wallDistance).toBe('10');
  });

  it('restores a stored screw hole padding override', () => {
    window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({ width: '500', nodePaddingMm: '15' }));
    expect(readStoredForm()?.nodePaddingMm).toBe('15');
  });

  it('ignores a non-string width', () => {
    window.localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({ width: 123, height: '700' }));
    const form = readStoredForm();
    expect(form?.width).toBe(DEFAULT_FORM.width);
    expect(form?.height).toBe('700');
  });

  it('returns null without throwing when storage access throws', () => {
    vi.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => readStoredForm()).not.toThrow();
    expect(readStoredForm()).toBeNull();
  });

  it('clearStoredForm removes the key', () => {
    writeStoredForm(DEFAULT_FORM);
    clearStoredForm();
    expect(window.localStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
  });
});
