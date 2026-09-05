import {
  Component,
  lazy,
  Suspense,
  useRef,
  useState,
  type ErrorInfo,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import type { BoardModel } from '../models';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { stageLayout } from './stageLayout';

const BoardScene = lazy(() => import('./three/BoardScene'));

type View = '2d' | '3d';

const styles = stylex.create({
  scene: {
    width: '100%',
    height: '100%',
  },
  toggle: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    zIndex: 2,
    display: 'inline-flex',
    padding: '2px',
    backgroundColor: colors.mutedBg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.lg,
  },
  option: {
    fontSize: font.xs,
    fontWeight: 500,
    color: colors.muted,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: radius.md,
    paddingBlock: space.xs,
    paddingInline: space.md,
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
  },
  optionActive: {
    color: colors.text,
    backgroundColor: colors.surface,
    boxShadow: `0 0 0 1px ${mixes.border}`,
  },
  notice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.lg,
    fontSize: font.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.lg,
    margin: 0,
  },
  noticeText: {
    margin: 0,
  },
  noticeButton: {
    height: '28px',
    fontSize: font.sm,
    fontWeight: 500,
    color: colors.text,
    backgroundColor: { default: mixes.inputBg, ':hover': colors.mutedBg },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: mixes.border, ':hover': mixes.borderHover },
    borderRadius: radius.lg,
    paddingInline: space.md,
    cursor: 'default',
  },
  loading: {
    fontSize: font.sm,
    color: colors.muted,
    margin: 0,
  },
});

interface SceneBoundaryProps {
  onBack: () => void;
  children: ReactNode;
}

/** Catches WebGL/canvas failures from the lazy scene so the whole app does not blank. */
class SceneBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('3D view failed to render:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div {...stylex.props(styles.notice)}>
          <p {...stylex.props(styles.noticeText)}>3D view is not available in this browser.</p>
          <button type="button" {...stylex.props(styles.noticeButton)} onClick={this.props.onBack}>
            Back to 2D
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PreviewCard({
  plan,
  model,
  children,
}: {
  plan: Plan | null;
  model: BoardModel;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>('2d');
  const optionRefs = useRef<Record<View, HTMLButtonElement | null>>({ '2d': null, '3d': null });
  if (!plan) return null;

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const next: View = view === '2d' ? '3d' : '2d';
    setView(next);
    optionRefs.current[next]?.focus();
  };

  const option = (value: View, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={view === value}
      tabIndex={view === value ? 0 : -1}
      ref={(el) => {
        optionRefs.current[value] = el;
      }}
      {...stylex.props(styles.option, view === value && styles.optionActive)}
      onClick={() => setView(value)}
    >
      {label}
    </button>
  );

  return (
    <div {...stylex.props(stageLayout.stage)}>
      <div
        role="radiogroup"
        aria-label="Preview mode"
        onKeyDown={moveFocus}
        {...stylex.props(styles.toggle)}
      >
        {option('2d', '2D')}
        {option('3d', '3D')}
      </div>
      {view === '2d' ? (
        children
      ) : (
        <div {...stylex.props(styles.scene)}>
          <SceneBoundary onBack={() => setView('2d')}>
            <Suspense fallback={<p {...stylex.props(styles.loading)}>Loading 3D…</p>}>
              <BoardScene plan={plan} model={model} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
    </div>
  );
}
