import { Component, type ReactNode } from "react";

interface State { hasError: boolean; error?: string; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-card max-w-md p-6 text-center">
            <h2 className="text-lg font-semibold text-rose-300 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-400 mb-4">{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-sky-500/20 border border-sky-500/30 px-4 py-2 text-sm text-sky-300 hover:bg-sky-500/30 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
