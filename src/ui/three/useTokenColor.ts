import { useEffect, useState } from 'react';
import { resolveTokenColor } from './tokenColor';

/**
 * Hex colour for a StyleX token var string, re-resolved whenever the
 * <html> element's attributes change (that is where the theme class lives).
 */
export function useTokenColor(varValue: string, fallback: string): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    const update = () => setColor(resolveTokenColor(varValue, document.documentElement) ?? fallback);
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [varValue, fallback]);

  return color;
}
