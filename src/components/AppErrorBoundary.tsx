import React from "react";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Application error boundary caught an error:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.props.onReset();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#050505] px-6 text-zinc-200">
          <div className="max-w-md rounded-2xl border border-[#222] bg-[#0a0a0a] p-6 text-center shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              glyft editor
            </p>
            <h1 className="mt-3 text-lg font-semibold text-white">
              The editor encountered an error.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Reload the app or return to the project picker to recover.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-md border border-[#333] bg-[#141414] px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-[#1a1a1a]"
              >
                Back to projects
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
