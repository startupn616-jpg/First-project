import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full border border-red-200">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Page Error</h2>
            <p className="text-gray-600 text-sm mb-4">
              Something crashed on this page. Check the browser console (F12) for details.
            </p>
            <pre className="bg-red-50 rounded p-3 text-xs text-red-800 overflow-auto max-h-40 mb-4">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
