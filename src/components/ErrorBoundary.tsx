import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Reusable runtime error boundary for React render/lifecycle crashes.
 * - Shows a friendly fallback screen
 * - "Try again" resets the boundary and remounts children
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  // Used to force a remount after "Try again"
  private resetCount = 0;

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught error:', error);
  }

  private handleTryAgain = () => {
    this.resetCount += 1;
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#12122A' }}>
          <div className="w-full max-w-md text-center">
            <div className="font-display font-extrabold text-2xl text-white">Something went wrong</div>
            <p className="font-body text-white/60 text-ui-body mt-3">
              An unexpected error happened. You can try again and we’ll attempt to recover.
            </p>
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="mt-6 px-5 py-3 rounded-xl font-display font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
                color: '#0f172a',
                boxShadow: '0 8px 30px rgba(0,217,255,0.18)',
                border: '2px solid rgba(255,255,255,0.15)',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    // Keyed wrapper remounts children after resetting the boundary.
    return (
      <React.Fragment key={this.resetCount}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

