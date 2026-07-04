'use client';

import React from 'react';

/**
 * React Error Boundary — catches rendering errors in child component trees
 * and shows a graceful fallback UI instead of a white crash screen.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={styles.heading}>Something went wrong</h2>
            <p style={styles.sub}>
              An unexpected error occurred in this section. The rest of the application is unaffected.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre style={styles.errorMsg}>
                {this.state.error.message}
              </pre>
            )}
            <div style={styles.actions}>
              <button
                style={styles.retryBtn}
                onClick={() => this.handleReset()}
              >
                Try Again
              </button>
              <a href="/" style={styles.homeLink}>Go to Home</a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '24px',
    background: 'transparent',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  iconWrap: {
    marginBottom: '20px',
  },
  heading: {
    color: '#f1f5f9',
    fontSize: '1.4rem',
    fontWeight: 700,
    margin: '0 0 12px',
  },
  sub: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  errorMsg: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '0.78rem',
    padding: '12px',
    textAlign: 'left',
    overflowX: 'auto',
    marginBottom: '24px',
    maxHeight: '120px',
    overflow: 'auto',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  retryBtn: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  homeLink: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 24px',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'inline-block',
  },
};
