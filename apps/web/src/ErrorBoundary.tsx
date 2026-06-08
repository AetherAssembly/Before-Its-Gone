import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <section className="panel" style={{ textAlign: 'center', padding: '2rem' }}>
      <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
        Something went wrong rendering this section.
      </p>
      <button type="button" className="btn-primary" onClick={onReset}>
        Reload App
      </button>
    </section>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
