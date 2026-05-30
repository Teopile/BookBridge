import { Component } from 'react';

// Top-level error boundary. Catches uncaught render/runtime errors (and failed
// lazy chunks) anywhere below it and shows a calm, branded fallback instead of a
// blank white page. Dependency-free on purpose: it must stay reliable even when
// the rest of the app (i18n, router, hooks) is the thing that broke, so it does
// NOT use useT() and renders plain copy with the existing site classes.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Best-effort reporting. The env-gated reporter (errorReporter.js) only
    // exposes initErrorReporter (a global listener installer), not a per-error
    // sink — so there's nothing safe to call here. Fall back to console.error.
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="section">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🏔️</div>
          <h1 style={{ fontSize: 36, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
            An unexpected error stopped the page from loading. Please try again.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>
              Reload
            </button>
            <a className="btn btn-secondary" href="/">
              Home
            </a>
          </div>
        </div>
      </section>
    );
  }
}
