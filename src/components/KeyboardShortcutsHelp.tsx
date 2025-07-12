import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useShortcutsHelp } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const shortcuts = useShortcutsHelp()

  const categories = [
    {
      title: 'General Actions',
      shortcuts: shortcuts.filter(s => 
        s.key.includes('Ctrl+N') || 
        s.key.includes('Ctrl+K') || 
        s.key.includes('Ctrl+R') || 
        s.key === 'Escape'
      )
    },
    {
      title: 'Navigation',
      shortcuts: shortcuts.filter(s => 
        s.key.includes('Ctrl+1') || 
        s.key.includes('Ctrl+2') || 
        s.key.includes('Ctrl+3') || 
        s.key.includes('Ctrl+4') || 
        s.key.includes('Ctrl+5')
      )
    },
    {
      title: 'View Modes',
      shortcuts: shortcuts.filter(s => 
        s.key.includes('Ctrl+Shift+C') || 
        s.key.includes('Ctrl+Shift+T') || 
        s.key.includes('Ctrl+Shift+R')
      )
    },
    {
      title: 'Selection & Bulk Operations',
      shortcuts: shortcuts.filter(s => 
        s.key.includes('Ctrl+A') || 
        s.key.includes('Ctrl+D') || 
        s.key === 'Delete'
      )
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>⌨️</span>
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h3 className="text-lg font-semibold text-white mb-3">{category.title}</h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-300">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.key.split('+').map((part, partIndex) => (
                        <React.Fragment key={partIndex}>
                          {partIndex > 0 && <span className="text-gray-500 mx-1">+</span>}
                          <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 border border-gray-600 rounded">
                            {part === 'Ctrl' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : part}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="border-t border-gray-700 pt-4">
            <div className="text-sm text-gray-400 space-y-2">
              <p>💡 <strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Shortcuts work when not focused on input fields</li>
                <li>Press <kbd className="px-1 py-0.5 text-xs bg-gray-700 rounded">Escape</kbd> to dismiss dialogs and clear selections</li>
                <li>Use <kbd className="px-1 py-0.5 text-xs bg-gray-700 rounded">Ctrl+K</kbd> for quick search access</li>
                <li>Bulk operations work on selected items in the current view</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}