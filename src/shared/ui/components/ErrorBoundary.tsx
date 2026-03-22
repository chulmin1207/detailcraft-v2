import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 p-8">
          <h2 className="text-xl font-semibold text-text-primary">오류가 발생했습니다</h2>
          <p className="text-sm text-text-secondary max-w-md text-center">
            {this.state.error?.message || '알 수 없는 오류'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="py-2 px-6 rounded-lg bg-accent-primary text-white text-sm font-medium cursor-pointer border-none hover:bg-accent-primary-hover transition-colors"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
