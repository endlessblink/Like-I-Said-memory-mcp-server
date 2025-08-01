import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info, 
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Toast>) => void
  success: (title: string, description?: string, options?: Partial<Toast>) => string
  error: (title: string, description?: string, options?: Partial<Toast>) => string
  warning: (title: string, description?: string, options?: Partial<Toast>) => string
  info: (title: string, description?: string, options?: Partial<Toast>) => string
  loading: (title: string, description?: string, options?: Partial<Toast>) => string
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: Partial<Toast>
  ) => Promise<T>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
  maxToasts?: number
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? (toast.type === 'loading' ? 0 : 5000)
    }

    setToasts(prev => {
      const updated = [newToast, ...prev]
      return updated.slice(0, maxToasts)
    })

    // Auto-dismiss after duration (unless it's a loading toast)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [maxToasts, removeToast])

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))
  }, [])

  const success = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, description, ...options })
  }, [addToast])

  const error = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', title, description, duration: 7000, ...options })
  }, [addToast])

  const warning = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, description, duration: 6000, ...options })
  }, [addToast])

  const info = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, description, ...options })
  }, [addToast])

  const loading = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'loading', title, description, duration: 0, ...options })
  }, [addToast])

  const promise = useCallback(async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: Partial<Toast>
  ): Promise<T> => {
    const loadingId = loading(messages.loading, undefined, options)

    try {
      const result = await promise
      removeToast(loadingId)
      
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(result) 
        : messages.success
      
      success(successMessage, undefined, options)
      return result
    } catch (err) {
      removeToast(loadingId)
      
      const errorMessage = typeof messages.error === 'function' 
        ? messages.error(err) 
        : messages.error
      
      error(errorMessage, undefined, options)
      throw err
    }
  }, [loading, removeToast, success, error])

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    success,
    error,
    warning,
    info,
    loading,
    promise
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts } = useToast()

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  )
}

interface ToastItemProps {
  toast: Toast
}

function ToastItem({ toast }: ToastItemProps) {
  const { removeToast } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => {
      removeToast(toast.id)
      toast.onDismiss?.()
    }, 300)
  }, [removeToast, toast.id, toast.onDismiss])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />
      case 'loading':
        return <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
      default:
        return <Info className="w-5 h-5 text-gray-400" />
    }
  }

  const getBackgroundClass = () => {
    const base = "pointer-events-auto relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 transform"
    
    if (isLeaving) {
      return `${base} translate-x-full opacity-0 scale-95`
    }
    
    if (!isVisible) {
      return `${base} translate-x-full opacity-0 scale-95`
    }

    switch (toast.type) {
      case 'success':
        return `${base} bg-gray-800/95 border-green-500/30 translate-x-0 opacity-100 scale-100`
      case 'error':
        return `${base} bg-gray-800/95 border-red-500/30 translate-x-0 opacity-100 scale-100`
      case 'warning':
        return `${base} bg-gray-800/95 border-yellow-500/30 translate-x-0 opacity-100 scale-100`
      case 'info':
        return `${base} bg-gray-800/95 border-blue-500/30 translate-x-0 opacity-100 scale-100`
      case 'loading':
        return `${base} bg-gray-800/95 border-violet-500/30 translate-x-0 opacity-100 scale-100`
      default:
        return `${base} bg-gray-800/95 border-gray-600/30 translate-x-0 opacity-100 scale-100`
    }
  }

  return (
    <div className={getBackgroundClass()}>
      <div className="flex items-start gap-3 p-4 pr-8 w-80 max-w-sm">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm">
            {toast.title}
          </div>
          {toast.description && (
            <div className="mt-1 text-sm text-gray-300">
              {toast.description}
            </div>
          )}
          {toast.action && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.action?.onClick()
                  handleDismiss()
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-7"
              >
                {toast.action.label}
              </Button>
            </div>
          )}
        </div>

        {toast.type !== 'loading' && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Progress bar for timed toasts */}
      {toast.duration && toast.duration > 0 && toast.type !== 'loading' && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-600/30 w-full">
          <div 
            className={`h-full transition-all linear ${
              toast.type === 'success' ? 'bg-green-400' :
              toast.type === 'error' ? 'bg-red-400' :
              toast.type === 'warning' ? 'bg-yellow-400' :
              toast.type === 'info' ? 'bg-blue-400' : 'bg-gray-400'
            }`}
            style={{
              animation: `shrink ${toast.duration}ms linear`,
              transformOrigin: 'left'
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}

// Utility functions for common use cases
export const toastHelpers = {
  // Memory operations
  memoryCreated: (toast: ToastContextType) => () => 
    toast.success('Memory created successfully', 'Your memory has been saved and is ready to use'),
  
  memoryUpdated: (toast: ToastContextType) => () =>
    toast.success('Memory updated', 'Your changes have been saved'),
  
  memoryDeleted: (toast: ToastContextType) => () =>
    toast.success('Memory deleted', 'The memory has been permanently removed'),
  
  memoryError: (toast: ToastContextType) => (error: string) =>
    toast.error('Memory operation failed', error),

  // Task operations
  taskCreated: (toast: ToastContextType) => () =>
    toast.success('Task created successfully', 'Your task has been added to the project'),
  
  taskUpdated: (toast: ToastContextType) => () =>
    toast.success('Task updated', 'Your changes have been saved'),
  
  taskCompleted: (toast: ToastContextType) => () =>
    toast.success('Task completed! 🎉', 'Great work on finishing this task'),
  
  taskDeleted: (toast: ToastContextType) => () =>
    toast.success('Task deleted', 'The task has been removed from your project'),

  // Search operations
  searchSaved: (toast: ToastContextType) => (name: string) =>
    toast.success('Search preset saved', `"${name}" has been added to your presets`),
  
  presetApplied: (toast: ToastContextType) => (name: string) =>
    toast.info('Preset applied', `Applied search preset "${name}"`),

  // System operations
  dataExported: (toast: ToastContextType) => () =>
    toast.success('Data exported successfully', 'Your data has been downloaded'),
  
  dataImported: (toast: ToastContextType) => (count: number) =>
    toast.success('Data imported successfully', `${count} items have been imported`),

  // Connection status
  connected: (toast: ToastContextType) => () =>
    toast.success('Connected', 'Real-time updates are active'),
  
  disconnected: (toast: ToastContextType) => () =>
    toast.warning('Connection lost', 'Attempting to reconnect...'),
  
  reconnected: (toast: ToastContextType) => () =>
    toast.success('Reconnected', 'Real-time updates have been restored'),

  // Generic operations
  operationInProgress: (toast: ToastContextType) => (operation: string) =>
    toast.loading(`${operation}...`, 'Please wait while we process your request'),
  
  operationSuccess: (toast: ToastContextType) => (operation: string) =>
    toast.success(`${operation} completed`, 'Your operation finished successfully'),
  
  operationError: (toast: ToastContextType) => (operation: string, error?: string) =>
    toast.error(`${operation} failed`, error || 'Please try again or contact support'),

  // Validation errors
  validationError: (toast: ToastContextType) => (field: string, message: string) =>
    toast.warning(`${field} validation error`, message),
  
  // Network errors
  networkError: (toast: ToastContextType) => () =>
    toast.error('Network error', 'Please check your connection and try again'),
  
  serverError: (toast: ToastContextType) => () =>
    toast.error('Server error', 'Something went wrong on our end. Please try again later'),

  // Keyboard shortcuts
  shortcutUsed: (toast: ToastContextType) => (shortcut: string, action: string) =>
    toast.info(`${shortcut}`, `${action}`, { duration: 2000 })
}