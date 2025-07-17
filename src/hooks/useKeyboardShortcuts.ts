import { useEffect, useCallback } from 'react'

interface KeyboardShortcuts {
  // Memory operations
  'Ctrl+N': () => void      // New memory
  'Ctrl+K': () => void      // Global search
  'Ctrl+Shift+K': () => void // Local search focus
  'Ctrl+R': () => void      // Refresh
  'Ctrl+Shift+N': () => void // New task
  'Escape': () => void      // Close dialogs/clear selection
  // Tab navigation
  'Ctrl+1': () => void      // Memories tab
  'Ctrl+2': () => void      // Tasks tab
  'Ctrl+3': () => void      // Relationships tab
  'Ctrl+4': () => void      // AI tab
  'Ctrl+5': () => void      // Dashboard tab
  // View modes
  'Ctrl+Shift+C': () => void // Cards view
  'Ctrl+Shift+T': () => void // Table view
  'Ctrl+Shift+R': () => void // Tree view
  // Bulk operations
  'Ctrl+A': () => void      // Select all
  'Ctrl+D': () => void      // Deselect all
  'Delete': () => void      // Delete selected
  'Ctrl+/': () => void      // Show keyboard shortcuts help
}

export function useKeyboardShortcuts(shortcuts: Partial<KeyboardShortcuts>) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Only allow Escape to work in inputs
      if (event.key === 'Escape' && shortcuts['Escape']) {
        event.preventDefault()
        shortcuts['Escape']()
      }
      return
    }

    const key = getShortcutKey(event)
    const handler = shortcuts[key as keyof KeyboardShortcuts]
    
    if (handler) {
      event.preventDefault()
      handler()
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

function getShortcutKey(event: KeyboardEvent): string {
  const parts = []
  
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  
  // Handle special keys
  if (event.key === 'Escape') return 'Escape'
  if (event.key === 'Delete') return 'Delete'
  
  // Handle regular keys
  parts.push(event.key.toUpperCase())
  
  return parts.join('+')
}

// Hook for displaying keyboard shortcuts help
export function useShortcutsHelp() {
  const shortcuts = [
    { key: 'Ctrl+N', description: 'Create new memory' },
    { key: 'Ctrl+Shift+N', description: 'Create new task' },
    { key: 'Ctrl+K', description: 'Global search' },
    { key: 'Ctrl+Shift+K', description: 'Focus local search' },
    { key: 'Ctrl+R', description: 'Refresh data' },
    { key: 'Escape', description: 'Close dialog / Clear selection' },
    { key: 'Ctrl+1', description: 'Switch to Memories' },
    { key: 'Ctrl+2', description: 'Switch to Tasks' },
    { key: 'Ctrl+3', description: 'Switch to Relationships' },
    { key: 'Ctrl+4', description: 'Switch to AI Enhancement' },
    { key: 'Ctrl+5', description: 'Switch to Dashboard' },
    { key: 'Ctrl+Shift+C', description: 'Cards view' },
    { key: 'Ctrl+Shift+T', description: 'Table view' },
    { key: 'Ctrl+Shift+R', description: 'Tree view' },
    { key: 'Ctrl+A', description: 'Select all' },
    { key: 'Ctrl+D', description: 'Deselect all' },
    { key: 'Delete', description: 'Delete selected items' },
    { key: 'Ctrl+/', description: 'Show keyboard shortcuts help' },
  ]

  return shortcuts
}