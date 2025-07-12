import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface GraphErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface GraphErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class GraphErrorBoundary extends React.Component<GraphErrorBoundaryProps, GraphErrorBoundaryState> {
  constructor(props: GraphErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): GraphErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 Graph Error Boundary caught an error:', error, errorInfo)
    
    // Log specific Cytoscape.js errors for debugging
    if (error.message.includes('cytoscape') || error.message.includes('container')) {
      console.error('🎯 Cytoscape.js specific error detected:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
    
    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <span>⚠️</span> Graph Visualization Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300">
              <p className="mb-2">The graph visualization encountered an error and couldn't render properly.</p>
              <p className="text-sm text-gray-400">
                This might be due to invalid data or a rendering issue. Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
            
            {this.state.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="text-sm font-mono text-red-400">
                  Error: {this.state.error.message}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm"
                className="text-gray-400"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}