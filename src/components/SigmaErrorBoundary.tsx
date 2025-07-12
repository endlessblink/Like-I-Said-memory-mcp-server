import React, { ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class SigmaErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Sigma.js Error Boundary caught an error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    this.setState({
      error,
      errorInfo
    });
    
    // Report to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Analytics or error reporting service
      this.reportError(error, errorInfo);
    }
  }
  
  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Implement your error reporting logic here
    console.log('Reporting error to monitoring service:', { error, errorInfo });
  }
  
  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 m-4 bg-gray-800 border-red-600">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔧</span>
            </div>
            <h2 className="text-xl font-semibold text-red-400 mb-2">Knowledge Graph Error</h2>
            <p className="text-gray-300 mb-6">The graph visualization encountered an error and cannot be displayed.</p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-900 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-red-400 mb-2">
                  Error Details (Development Mode)
                </h3>
                <pre className="text-xs text-gray-400 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                className="text-white border-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </Card>
      );
    }
    
    return this.props.children;
  }
}

export default SigmaErrorBoundary;