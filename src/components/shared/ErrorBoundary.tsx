import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  label?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const label = this.props.label ?? 'Panel'
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <AlertTriangle size={24} className="text-ctp-red" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-ctp-text">
              Something went wrong in {label}
            </p>
            <p className="text-xs text-ctp-overlay1">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded hover:bg-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text transition-colors"
          >
            <RotateCcw size={12} />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
