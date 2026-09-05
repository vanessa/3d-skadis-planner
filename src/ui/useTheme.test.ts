import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, THEME_STORAGE_KEY } from './useTheme';

function mockMatchMedia(dark: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches: dark,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
  };
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mql) });
  return { fire: (matches: boolean) => listeners.forEach((fn) => fn({ matches })) };
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  it('defaults to dark with nothing stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('reads a stored preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
  });

  it('follows the system preference and its changes', () => {
    const mq = mockMatchMedia(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('dark');
    act(() => mq.fire(false));
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('writes the preference to storage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setPreference('light'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('keeps working when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setPreference('light'));
    expect(result.current.preference).toBe('light');
    spy.mockRestore();
  });
});
