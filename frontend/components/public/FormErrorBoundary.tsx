'use client';
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { crashed: boolean; message: string }

export default class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { crashed: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { crashed: true, message: error?.message || 'Unknown error' };
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
            <p className="text-5xl mb-4">⚠️</p>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 text-sm mb-6">
              We&apos;re sorry — this form encountered an error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
