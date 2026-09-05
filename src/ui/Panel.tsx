import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const MOBILE = '@media (max-width: 800px)';

const styles = stylex.create({
  panel: {
    position: 'fixed',
    top: { default: '10px', [MOBILE]: 'auto' },
    right: { default: '10px', [MOBILE]: '0px' },
    bottom: { default: 'auto', [MOBILE]: '0px' },
    left: { default: 'auto', [MOBILE]: '0px' },
    width: { default: '300px', [MOBILE]: 'auto' },
    maxHeight: { default: 'calc(100dvh - 20px)', [MOBILE]: '50dvh' },
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: { default: radius.lg, [MOBILE]: `${radius.lg} ${radius.lg} 0px 0px` },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    backgroundColor: mixes.panelBg,
    backdropFilter: 'blur(40px) saturate(150%)',
    color: colors.text,
    fontFamily: font.family,
    isolation: 'isolate',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '36px',
    flexShrink: 0,
    paddingInlineStart: space.md,
    paddingInlineEnd: space.xs,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
  },
  title: {
    margin: 0,
    fontSize: font.md,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  body: {
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
  },
  footer: {
    flexShrink: 0,
    padding: space.md,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: mixes.divider,
  },
});

export function Panel({
  title,
  headerEnd,
  footer,
  children,
}: {
  title: string;
  headerEnd?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside {...stylex.props(styles.panel)} aria-label={title}>
      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>{title}</h1>
        {headerEnd}
      </header>
      <div {...stylex.props(styles.body)}>{children}</div>
      {footer && <footer {...stylex.props(styles.footer)}>{footer}</footer>}
    </aside>
  );
}
