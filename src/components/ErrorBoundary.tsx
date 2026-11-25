import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ld-bg-sky flex min-h-[100dvh] items-center justify-center p-6 text-white">
          <div className="ld-glass max-w-sm rounded-[28px] p-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-[#F43F5E]" aria-hidden="true" />
            <h1 className="mt-3 text-[20px] font-medium">Something went wrong</h1>
            <p className="mt-2 text-[14px] text-white/78">
              LifeDrop hit an unexpected snag. Your offline emergency first-aid data remains safe.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#5B3FE0] px-5 py-2.5 text-[14px] font-medium text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reload LifeDrop
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
