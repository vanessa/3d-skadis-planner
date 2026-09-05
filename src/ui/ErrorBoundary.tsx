import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.sm,
    margin: space.lg,
    padding: space.lg,
    backgroundColor: mixes.inputBg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.destructive,
    borderRadius: radius.md,
    color: colors.destructive,
  },
  message: {
    fontSize: font.sm,
    margin: 0,
  },
  button: {
    fontSize: font.xs,
    color: colors.destructive,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.destructive,
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    cursor: 'pointer',
  },
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * A class component is required here: componentDidCatch and
 * getDerivedStateFromError have no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error in the board planner UI:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div {...stylex.props(styles.panel)}>
          <p {...stylex.props(styles.message)}>Something went wrong.</p>
          <button type="button" {...stylex.props(styles.button)} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
