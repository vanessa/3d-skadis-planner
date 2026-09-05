import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTokenColor } from './useTokenColor';

afterEach(() => vi.restoreAllMocks());

describe('useTokenColor', () => {
  it('falls back when the colour cannot be resolved', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
    const { result } = renderHook(() => useTokenColor('var(--missing)', '#123456'));
    expect(result.current).toBe('#123456');
  });

  it('uses the resolved colour and re-resolves when <html> attributes change', async () => {
    const pixels: [number, number, number][] = [[1, 2, 3], [4, 5, 6]];
    let calls = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([...pixels[Math.min(calls++, 1)], 255]) }),
    } as never);
    const { result } = renderHook(() => useTokenColor('var(--token)', '#000000'));
    await waitFor(() => expect(result.current).toBe('#010203'));
    document.documentElement.classList.add('theme-probe');
    await waitFor(() => expect(result.current).toBe('#040506'));
    document.documentElement.classList.remove('theme-probe');
  });
});
