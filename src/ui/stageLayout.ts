import * as stylex from '@stylexjs/stylex';

const MOBILE = '@media (max-width: 800px)';

/** The stage box on the canvas: the area the preview may occupy. */
export const stageLayout = stylex.create({
  stage: {
    position: 'absolute',
    top: '56px',
    left: '24px',
    right: { default: '334px', [MOBILE]: '24px' },
    bottom: { default: '24px', [MOBILE]: 'calc(50dvh + 16px)' },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
