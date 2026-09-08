import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Dashboard section error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="section" style={{ padding: 24 }}>
          <h2 className="section-title">Something went wrong</h2>
          <p style={{ color: '#64748b', marginTop: 8 }}>
            {this.state.error?.message || 'Please try refreshing the page.'}
          </p>
        </section>
      );
    }
    return this.props.children;
  }
}
