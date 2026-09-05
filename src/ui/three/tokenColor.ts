/** '--name' from 'var(--name)' or 'var(--name, fallback)'; null otherwise. */
export function varName(value: string): string | null {
  const match = /^\s*var\(\s*(--[^,\s)]+)/.exec(value);
  return match ? match[1] : null;
}

const toHex = (v: number) => v.toString(16).padStart(2, '0');

/**
 * Resolve any CSS colour (including oklch and color-mix) to '#rrggbb' by
 * painting it into a 1x1 canvas. Returns null where canvas 2D is unavailable.
 */
export function resolveCssColor(css: string): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css; // an unparseable value leaves the previous fillStyle in place
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolve a StyleX token value such as 'var(--x1abc)' inside `host`'s
 * cascade. A probe element is attached, read and removed synchronously.
 */
export function resolveTokenColor(varValue: string, host: Element): string | null {
  if (!varName(varValue)) return null;
  const probe = document.createElement('span');
  probe.style.color = varValue;
  host.appendChild(probe);
  let computed: string;
  try {
    computed = getComputedStyle(probe).color;
  } finally {
    probe.remove();
  }
  return computed ? resolveCssColor(computed) : null;
}
