"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  /**
   * Custom fallback rendered when an error is caught.
   * Receives the error and a reset callback so callers can wire up retry UI.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React error boundary for the task-manager extension.
 *
 * Wrap any subtree that may throw during render to prevent a single component
 * failure from blanking the entire iframe. Provide a `fallback` prop for
 * custom recovery UI; otherwise a minimal inline error card is shown.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <TaskManagerLayout />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={(err, reset) => <MyFallback error={err} onRetry={reset} />}>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return <DefaultFallback error={error} onReset={this.reset} />;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm font-medium">Something went wrong</p>
        <p className="text-muted-foreground max-w-xs text-xs">{error.message}</p>
        <Button variant="outline" size="sm" onClick={onReset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
