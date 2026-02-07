'use client';

import { Component, ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary component to catch and handle React component errors
 * Prevents full app crashes by showing a fallback UI when errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // TODO: Send error to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });

    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center theme-bg p-6">
          <div className="max-w-2xl w-full theme-card border-2 border-red-500/40 p-8 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-500">Something went wrong</h2>
                <p className="text-sm theme-text-muted mt-1">
                  The application encountered an unexpected error
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="theme-muted border theme-border rounded-lg p-4">
                <p className="text-sm font-medium theme-text mb-2">Error Details:</p>
                <code className="text-xs theme-text-muted block overflow-x-auto">
                  {this.state.error?.message || 'Unknown error'}
                </code>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <details className="theme-muted border theme-border rounded-lg p-4">
                  <summary className="text-sm font-medium theme-text cursor-pointer">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="text-xs theme-text-muted mt-2 overflow-x-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 rounded-lg border theme-border theme-card text-sm font-medium theme-text hover:theme-muted transition-colors"
                >
                  Go to Home
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg border theme-border theme-card text-sm font-medium theme-text hover:theme-muted transition-colors"
                >
                  Refresh Page
                </button>
              </div>

              <div className="pt-4 border-t theme-border">
                <p className="text-xs theme-text-muted">
                  If this problem persists, please{' '}
                  <a
                    href="https://github.com/bashiraziz/acctreconagents/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    report this issue on GitHub
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
