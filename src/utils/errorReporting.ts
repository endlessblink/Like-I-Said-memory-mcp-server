// Enhanced Error Reporting and Recovery Utilities

export interface ErrorReport {
  id: string
  timestamp: string
  message: string
  stack?: string
  componentStack?: string
  userAgent: string
  url: string
  retryCount: number
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  networkStatus: 'online' | 'offline'
  additionalContext?: Record<string, any>
}

export interface RecoveryAction {
  type: 'retry' | 'reload' | 'redirect' | 'fallback'
  description: string
  action: () => void | Promise<void>
  condition?: () => boolean
}

class ErrorReportingService {
  private reports: ErrorReport[] = []
  private maxReports = 50
  private retryAttempts = new Map<string, number>()

  generateErrorReport(
    error: Error, 
    componentStack?: string, 
    additionalContext?: Record<string, any>
  ): ErrorReport {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const errorKey = `${error.message}-${error.stack?.split('\n')[0]}`
    const retryCount = this.retryAttempts.get(errorKey) || 0

    const report: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount,
      networkStatus: navigator.onLine ? 'online' : 'offline',
      additionalContext
    }

    // Add memory usage if available
    if ((performance as any).memory) {
      report.memoryUsage = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      }
    }

    this.addReport(report)
    this.retryAttempts.set(errorKey, retryCount + 1)

    return report
  }

  private addReport(report: ErrorReport) {
    this.reports.unshift(report)
    
    // Keep only the most recent reports
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(0, this.maxReports)
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('like-i-said-error-reports', JSON.stringify(this.reports))
    } catch (e) {
      console.warn('Could not save error reports to localStorage:', e)
    }
  }

  getReports(): ErrorReport[] {
    return [...this.reports]
  }

  getReportById(id: string): ErrorReport | undefined {
    return this.reports.find(report => report.id === id)
  }

  clearReports() {
    this.reports = []
    this.retryAttempts.clear()
    try {
      localStorage.removeItem('like-i-said-error-reports')
    } catch (e) {
      console.warn('Could not clear error reports from localStorage:', e)
    }
  }

  loadReportsFromStorage() {
    try {
      const stored = localStorage.getItem('like-i-said-error-reports')
      if (stored) {
        this.reports = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Could not load error reports from localStorage:', e)
    }
  }

  getErrorFrequency(): Record<string, number> {
    const frequency: Record<string, number> = {}
    
    this.reports.forEach(report => {
      const key = report.message.split(':')[0] // Get error type
      frequency[key] = (frequency[key] || 0) + 1
    })

    return frequency
  }

  getMostCommonErrors(limit = 5): Array<{ error: string; count: number; lastSeen: string }> {
    const frequency = this.getErrorFrequency()
    
    return Object.entries(frequency)
      .map(([error, count]) => ({
        error,
        count,
        lastSeen: this.reports.find(r => r.message.startsWith(error))?.timestamp || ''
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  shouldAutoRetry(error: Error): boolean {
    const retryablePatterns = [
      /network.*error/i,
      /fetch.*failed/i,
      /timeout/i,
      /chunk.*load.*error/i,
      /loading.*chunk.*failed/i,
      /failed.*to.*import/i
    ]

    return retryablePatterns.some(pattern => pattern.test(error.message))
  }

  getRecoveryActions(error: Error): RecoveryAction[] {
    const actions: RecoveryAction[] = []

    // Network-related errors
    if (this.isNetworkError(error)) {
      actions.push({
        type: 'retry',
        description: 'Check internet connection and retry',
        action: () => window.location.reload(),
        condition: () => navigator.onLine
      })
    }

    // Chunk loading errors (code splitting issues)
    if (this.isChunkLoadError(error)) {
      actions.push({
        type: 'reload',
        description: 'Reload to get latest code',
        action: () => {
          // Clear cache and reload
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name))
            }).finally(() => window.location.reload())
          } else {
            window.location.reload()
          }
        }
      })
    }

    // Memory-related errors
    if (this.isMemoryError(error)) {
      actions.push({
        type: 'fallback',
        description: 'Clear cache and reload with reduced features',
        action: () => {
          localStorage.clear()
          sessionStorage.clear()
          window.location.reload()
        }
      })
    }

    // Component-specific errors
    if (this.isComponentError(error)) {
      actions.push({
        type: 'fallback',
        description: 'Switch to safe mode',
        action: () => {
          localStorage.setItem('like-i-said-safe-mode', 'true')
          window.location.reload()
        }
      })
    }

    // Generic retry
    actions.push({
      type: 'retry',
      description: 'Try again',
      action: () => window.location.reload()
    })

    return actions
  }

  private isNetworkError(error: Error): boolean {
    return /network|fetch|timeout|offline/i.test(error.message)
  }

  private isChunkLoadError(error: Error): boolean {
    return /chunk|loading|import/i.test(error.message)
  }

  private isMemoryError(error: Error): boolean {
    return /memory|heap|allocation/i.test(error.message)
  }

  private isComponentError(error: Error): boolean {
    return /component|render|hook/i.test(error.message)
  }

  generateBugReportUrl(error: Error, componentStack?: string): string {
    const title = encodeURIComponent(`Error: ${error.message}`)
    const body = encodeURIComponent(`**Error Report**

**Message:** ${error.message}
**Timestamp:** ${new Date().toISOString()}
**URL:** ${window.location.href}
**User Agent:** ${navigator.userAgent}
**Network Status:** ${navigator.onLine ? 'Online' : 'Offline'}

**Stack Trace:**
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\`

${componentStack ? `**Component Stack:**
\`\`\`
${componentStack}
\`\`\`` : ''}

**Additional Context:**
- Memory Usage: ${(performance as any).memory ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)}MB` : 'Unknown'}
- Local Storage Usage: ${this.getLocalStorageUsage()}MB
- Recent Errors: ${this.reports.slice(0, 3).map(r => r.message).join(', ')}

Please provide any additional context about what you were doing when this error occurred.`)

    return `https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues/new?title=${title}&body=${body}&labels=bug,error-report`
  }

  private getLocalStorageUsage(): number {
    let total = 0
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length
        }
      }
    } catch (e) {
      return 0
    }
    return Math.round(total / 1024 / 1024 * 100) / 100 // MB with 2 decimal places
  }

  exportReports(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      reports: this.reports,
      summary: {
        totalReports: this.reports.length,
        errorFrequency: this.getErrorFrequency(),
        mostCommon: this.getMostCommonErrors()
      }
    }, null, 2)
  }
}

// Singleton instance
export const errorReporting = new ErrorReportingService()

// Initialize on load
if (typeof window !== 'undefined') {
  errorReporting.loadReportsFromStorage()
}

// Global error handlers
export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason)
    
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))
    
    errorReporting.generateErrorReport(error, undefined, {
      type: 'unhandledPromiseRejection',
      promise: event.promise
    })
  })

  // Global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('🚨 Global JavaScript Error:', event.error)
    
    if (event.error) {
      errorReporting.generateErrorReport(event.error, undefined, {
        type: 'globalJavaScriptError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }
  })
}

// Utility functions
export function createErrorBoundaryFallback(error: Error, errorInfo?: React.ErrorInfo) {
  const report = errorReporting.generateErrorReport(error, errorInfo?.componentStack)
  const recoveryActions = errorReporting.getRecoveryActions(error)
  
  return {
    report,
    recoveryActions,
    bugReportUrl: errorReporting.generateBugReportUrl(error, errorInfo?.componentStack)
  }
}

export function handleAsyncError(error: Error, context?: string) {
  console.error(`🚨 Async Error${context ? ` in ${context}` : ''}:`, error)
  errorReporting.generateErrorReport(error, undefined, { context })
}