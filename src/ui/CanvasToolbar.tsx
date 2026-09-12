import { useEffect, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  bar: {
    position: 'absolute',
    left: '10px',
    bottom: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: '28px',
    paddingInline: space.xs,
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.sm,
    userSelect: 'none',
    cursor: 'default',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '20px',
    paddingInline: space.sm,
    borderRadius: radius.sm,
    borderWidth: 0,
    backgroundColor: { default: 'transparent', ':hover': colors.mutedBg },
    color: colors.text,
    fontSize: font.sm,
    fontWeight: 500,
    cursor: 'default',
    outlineWidth: { default: '0px', ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '1px',
  },
  readout: {
    minWidth: '40px',
    textAlign: 'end',
    paddingInlineEnd: space.xs,
    color: colors.muted,
    fontVariantNumeric: 'tabular-nums',
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});

export function CanvasToolbar({
  ratio, onFit, children,
}: {
  ratio: number;
  onFit: () => void;
  children?: ReactNode;
}) {
  const percent = Math.round(ratio * 100);
  const [announced, setAnnounced] = useState(percent);
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(percent), 300);
    return () => clearTimeout(timer);
  }, [percent]);
  return (
    <div
      {...stylex.props(styles.bar)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <button type="button" aria-label="Fit to view" onClick={onFit} {...stylex.props(styles.button)}>
        Fit
      </button>
      <span aria-hidden="true" {...stylex.props(styles.readout)}>
        {percent}%
      </span>
      <span aria-live="polite" {...stylex.props(styles.srOnly)}>
        Zoom {announced}%
      </span>
      {children}
    </div>
  );
}
