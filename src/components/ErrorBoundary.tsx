import React from 'react'
import { logEvent } from '@/lib/logger'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    try { logEvent('render_error', { error: String(error || ''), info }) } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)] p-6">
          <div className="max-w-xl w-full border rounded-lg p-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">An error occurred</h2>
            <p className="text-sm mb-3">The UI failed to render. Try hard refresh (Ctrl+F5) or reopen this page.</p>
            <pre className="text-xs overflow-auto bg-gray-50 border p-2 rounded">{String(this.state.error || '')}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
