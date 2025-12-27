'use client';

import React from 'react';

type VisualModeErrorBoundaryProps = {
  children: React.ReactNode;
  /** Change this value to reset the boundary after an error (e.g. when toggling Visual Mode off/on). */
  resetKey?: string | number | boolean;
  onError?: (error: unknown) => void;
};

type VisualModeErrorBoundaryState = {
  hasError: boolean;
};

export default class VisualModeErrorBoundary extends React.Component<
  VisualModeErrorBoundaryProps,
  VisualModeErrorBoundaryState
> {
  state: VisualModeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Never let visual mode crashes take down the rest of the UI.
    // Production must be clean (no console errors). Log only in dev.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[VisualMode] crashed:', error);
    }
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: VisualModeErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      // Reset when the caller indicates a state transition (typically toggle off/on).
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}


