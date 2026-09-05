import { describe, it, expect, vi, afterEach } from 'vitest';
import { varName, resolveCssColor, resolveTokenColor } from './tokenColor';

afterEach(() => vi.restoreAllMocks());

function mockCanvasPixel(rgb: [number, number, number] | null) {
  const ctx = rgb
    ? ({
        fillStyle: '',
        fillRect: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray([...rgb, 255]) }),
      } as unknown as CanvasRenderingContext2D)
    : null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  return ctx;
}

describe('varName', () => {
  it('extracts the custom property name from a var() reference', () => {
    expect(varName('var(--x1abc)')).toBe('--x1abc');
    expect(varName('var(--x1abc, #fff)')).toBe('--x1abc');
  });
  it('returns null for anything else', () => {
    expect(varName('#ffffff')).toBeNull();
    expect(varName('')).toBeNull();
  });
});

describe('resolveCssColor', () => {
  it('reads the painted pixel back as hex', () => {
    mockCanvasPixel([12, 140, 233]);
    expect(resolveCssColor('oklch(0.6 0.2 250)')).toBe('#0c8ce9');
  });
  it('returns null without a 2D context', () => {
    mockCanvasPixel(null);
    expect(resolveCssColor('#0c8ce9')).toBeNull();
  });
});

describe('resolveTokenColor', () => {
  it('resolves through a probe element and leaves no probe behind', () => {
    const ctx = mockCanvasPixel([255, 0, 0]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    // jsdom does not substitute custom properties into computed `color`
    // (it reports the literal `var(...)` string back), so make the
    // computed colour deterministic instead of relying on jsdom's cascade.
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ color: 'rgb(1, 2, 3)' } as CSSStyleDeclaration);
    expect(resolveTokenColor('var(--anything)', host)).toBe('#ff0000');
    expect(host.childElementCount).toBe(0);
    expect(ctx!.fillStyle).toBe('rgb(1, 2, 3)');
    host.remove();
  });
  it('returns null for a value that is not a var()', () => {
    expect(resolveTokenColor('#ff0000', document.body)).toBeNull();
  });
  it('removes the probe even when getComputedStyle throws', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => resolveTokenColor('var(--anything)', host)).toThrow();
    expect(host.childElementCount).toBe(0);
    host.remove();
  });
});
