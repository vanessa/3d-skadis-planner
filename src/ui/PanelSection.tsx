import { useId, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  section: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '36px',
    paddingInlineStart: space.md,
    paddingInlineEnd: space.sm,
    backgroundColor: 'transparent',
    borderWidth: '0px',
    color: colors.text,
    fontSize: font.md,
    fontWeight: 500,
    textAlign: 'start',
    cursor: 'default',
    outlineWidth: { default: '0px', ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '-2px',
  },
  chevron: {
    width: '14px',
    height: '14px',
    color: colors.muted,
    transitionProperty: 'transform',
    transitionDuration: '150ms',
  },
  chevronClosed: {
    transform: 'rotate(-90deg)',
  },
  sectionEmphasis: {
    backgroundColor: mixes.inputBg,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: mixes.borderHover,
  },
  headerEmphasis: {
    fontWeight: 600,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xl,
    paddingInline: space.md,
  },
});

export function PanelSection({
  title,
  defaultOpen = true,
  tone = 'default',
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  tone?: 'default' | 'emphasis';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section data-tone={tone} {...stylex.props(styles.section, tone === 'emphasis' && styles.sectionEmphasis)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        {...stylex.props(styles.header, tone === 'emphasis' && styles.headerEmphasis)}
      >
        <span>{title}</span>
        <svg
          {...stylex.props(styles.chevron, !open && styles.chevronClosed)}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      </button>
      {open && (
        <div id={bodyId} {...stylex.props(styles.body)}>
          {children}
        </div>
      )}
    </section>
  );
}
