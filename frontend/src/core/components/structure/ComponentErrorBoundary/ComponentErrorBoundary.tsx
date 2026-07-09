import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

type ComponentErrorBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
}

type ComponentErrorBoundaryState = {
  hasError: boolean
}

export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  state: ComponentErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ComponentErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}
