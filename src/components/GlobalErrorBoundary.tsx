import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Wifi, 
  WifiOff,
  Copy,
  ExternalLink
} from 'lucide-react'

interface GlobalErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId?: string
  retryCount: number
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout

  constructor(props: GlobalErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false, 
      retryCount: 0 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return { 
      hasError: true, 
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Global Error Boundary caught an error:', error, errorInfo)
    
    // Generate detailed error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
      memoryUsage: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : 'unavailable'
    }

    console.error('📊 Error Report:', errorReport)
    
    // Store error report in localStorage for debugging
    try {
      const existingReports = JSON.parse(localStorage.getItem('error-reports') || '[]')
      existingReports.unshift(errorReport)
      // Keep only last 10 error reports
      localStorage.setItem('error-reports', JSON.stringify(existingReports.slice(0, 10)))
    } catch (e) {
      console.warn('Could not save error report to localStorage:', e)
    }
    
    this.setState({ error, errorInfo })
    
    // Call onError callback if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1
    
    if (newRetryCount > 3) {
      console.warn('⚠️ Maximum retry attempts reached')
      return
    }

    console.log(`🔄 Retrying error recovery (attempt ${newRetryCount})`)
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount
    })

    // Auto-retry with exponential backoff for certain errors
    if (this.shouldAutoRetry()) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry()
      }, Math.pow(2, newRetryCount) * 1000)
    }
  }

  shouldAutoRetry = (): boolean => {
    if (!this.state.error) return false
    
    const retryableErrors = [
      'Network Error',
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch'
    ]
    
    return retryableErrors.some(pattern => 
      this.state.error!.message.includes(pattern)
    )
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleRefreshPage = () => {
    window.location.reload()
  }

  handleCopyError = async () => {
    const errorText = `Error ID: ${this.state.errorId}
Timestamp: ${new Date().toISOString()}
Message: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}`

    try {
      await navigator.clipboard.writeText(errorText)
      console.log('✅ Error details copied to clipboard')
    } catch (e) {
      console.warn('Could not copy to clipboard:', e)
    }
  }

  handleReportBug = () => {
    const title = encodeURIComponent(`Error: ${this.state.error?.message || 'Unknown Error'}`)
    const body = encodeURIComponent(`**Error ID:** ${this.state.errorId}
**Timestamp:** ${new Date().toISOString()}
**Message:** ${this.state.error?.message}
**URL:** ${window.location.href}
**User Agent:** ${navigator.userAgent}

**Stack Trace:**
\`\`\`
${this.state.error?.stack}
\`\`\`

**Component Stack:**
\`\`\`
${this.state.errorInfo?.componentStack}
\`\`\``)

    const url = `https://github.com/endlessblink/like-i-said-mcp-server-v2/issues/new?title=${title}&body=${body}&labels=bug,error-boundary`
    window.open(url, '_blank')
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isNetworkError = this.state.error?.message.includes('Network') || 
                           this.state.error?.message.includes('fetch')

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-red-500/20 bg-red-950/10">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              </div>
              <CardTitle className="flex items-center justify-center gap-2 text-red-400 text-xl">
                Application Error
              </CardTitle>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Error ID: {this.state.errorId}
                </Badge>
                {isNetworkError && (
                  <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Network Issue
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-300 mb-2">
                  Something went wrong and the application couldn't recover automatically.
                </p>
                <p className="text-sm text-gray-400">
                  {isNetworkError 
                    ? "This appears to be a network connectivity issue. Please check your internet connection."
                    : "This might be due to a temporary issue or a bug in the application."
                  }
                </p>
              </div>

              {this.state.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="text-sm font-mono text-red-400">
                    <div className="font-semibold mb-1">Error Details:</div>
                    <div className="break-all">{this.state.error.message}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  onClick={this.handleRetry} 
                  variant="default"
                  disabled={this.state.retryCount >= 3}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {this.state.retryCount >= 3 ? 'Max Retries Reached' : `Try Again (${this.state.retryCount}/3)`}
                </Button>

                <Button 
                  onClick={this.handleRefreshPage} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>

                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                  className="flex items-center gap-2 text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-black"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>

                <Button 
                  onClick={this.handleCopyError} 
                  variant="outline"
                  className="flex items-center gap-2 text-gray-400"
                >
                  <Copy className="h-4 w-4" />
                  Copy Error Details
                </Button>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-3">
                    If this error persists, please report it to help us improve the application.
                  </p>
                  <Button 
                    onClick={this.handleReportBug} 
                    variant="outline"
                    size="sm"
                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-black"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Report Bug on GitHub
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <div>Retry Count: {this.state.retryCount} | Time: {new Date().toLocaleTimeString()}</div>
                <div>Like-I-Said MCP Server v2 | Error Boundary v1.0</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}