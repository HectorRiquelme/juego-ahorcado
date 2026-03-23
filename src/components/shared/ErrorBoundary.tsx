import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center gap-4">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold text-text">Algo salió mal</h1>
          <p className="text-text-muted text-sm max-w-md">
            Ocurrió un error inesperado. Puedes intentar recargar la página.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.assign('/home')}
              className="px-6 py-3 bg-bg-surface border border-border text-text-muted rounded-xl font-medium hover:bg-bg-surface2 transition-colors"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
