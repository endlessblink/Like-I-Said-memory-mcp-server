import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { 
  Bookmark, 
  BookmarkPlus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2,
  Star,
  Clock,
  Tag,
  FolderOpen
} from 'lucide-react'
import { AdvancedFilters } from '@/types'

interface SearchPreset {
  id: string
  name: string
  description?: string
  query: string
  filters: AdvancedFilters
  category: string
  project: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  created: string
  lastUsed: string
  useCount: number
  icon: string
}

interface SearchPresetsProps {
  currentQuery: string
  currentFilters: AdvancedFilters
  currentCategory: string
  currentProject: string
  currentSortBy: string
  currentSortOrder: 'asc' | 'desc'
  onApplyPreset: (preset: SearchPreset) => void
  className?: string
}

export function SearchPresets({
  currentQuery,
  currentFilters,
  currentCategory,
  currentProject,
  currentSortBy,
  currentSortOrder,
  onApplyPreset,
  className = ''
}: SearchPresetsProps) {
  const [presets, setPresets] = useState<SearchPreset[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [editingPreset, setEditingPreset] = useState<SearchPreset | null>(null)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [newPresetIcon, setNewPresetIcon] = useState('🔍')

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('search-presets')
    if (savedPresets) {
      try {
        const parsed = JSON.parse(savedPresets)
        setPresets(parsed)
      } catch (error) {
        console.error('Failed to load search presets:', error)
      }
    } else {
      // Create default presets
      const defaultPresets: SearchPreset[] = [
        {
          id: 'recent-code',
          name: 'Recent Code',
          description: 'Recent code-related memories',
          query: '',
          filters: { hasCode: true },
          category: 'code',
          project: 'all',
          sortBy: 'timestamp',
          sortOrder: 'desc',
          created: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 0,
          icon: '💻'
        },
        {
          id: 'work-meetings',
          name: 'Work Meetings',
          description: 'Work-related meetings and discussions',
          query: 'meeting',
          filters: {},
          category: 'work',
          project: 'all',
          sortBy: 'timestamp',
          sortOrder: 'desc',
          created: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 0,
          icon: '💼'
        },
        {
          id: 'high-priority',
          name: 'High Priority',
          description: 'High priority memories and tasks',
          query: '',
          filters: { priority: 'high' },
          category: 'all',
          project: 'all',
          sortBy: 'priority',
          sortOrder: 'desc',
          created: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 0,
          icon: '⚡'
        },
        {
          id: 'personal-notes',
          name: 'Personal Notes',
          description: 'Personal thoughts and notes',
          query: '',
          filters: {},
          category: 'personal',
          project: 'all',
          sortBy: 'timestamp',
          sortOrder: 'desc',
          created: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 0,
          icon: '📝'
        }
      ]
      setPresets(defaultPresets)
      localStorage.setItem('search-presets', JSON.stringify(defaultPresets))
    }
  }, [])

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem('search-presets', JSON.stringify(presets))
    }
  }, [presets])

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return

    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      query: currentQuery,
      filters: currentFilters,
      category: currentCategory,
      project: currentProject,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 0,
      icon: newPresetIcon
    }

    setPresets(prev => [...prev, newPreset])
    setNewPresetName('')
    setNewPresetDescription('')
    setNewPresetIcon('🔍')
    setShowSaveDialog(false)
  }

  const updatePreset = () => {
    if (!editingPreset || !newPresetName.trim()) return

    const updatedPreset = {
      ...editingPreset,
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      icon: newPresetIcon
    }

    setPresets(prev => prev.map(p => p.id === editingPreset.id ? updatedPreset : p))
    setEditingPreset(null)
    setNewPresetName('')
    setNewPresetDescription('')
    setNewPresetIcon('🔍')
    setShowSaveDialog(false)
  }

  const deletePreset = (presetId: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      setPresets(prev => prev.filter(p => p.id !== presetId))
    }
  }

  const applyPreset = (preset: SearchPreset) => {
    // Update usage stats
    const updatedPreset = {
      ...preset,
      lastUsed: new Date().toISOString(),
      useCount: preset.useCount + 1
    }
    
    setPresets(prev => prev.map(p => p.id === preset.id ? updatedPreset : p))
    onApplyPreset(updatedPreset)
  }

  const startEdit = (preset: SearchPreset) => {
    setEditingPreset(preset)
    setNewPresetName(preset.name)
    setNewPresetDescription(preset.description || '')
    setNewPresetIcon(preset.icon)
    setShowSaveDialog(true)
  }

  const getPresetSummary = (preset: SearchPreset): string => {
    const parts: string[] = []
    
    if (preset.query) parts.push(`"${preset.query}"`)
    if (preset.category !== 'all') parts.push(`${preset.category}`)
    if (preset.project !== 'all') parts.push(`📁 ${preset.project}`)
    if (Object.keys(preset.filters).length > 0) {
      parts.push(`${Object.keys(preset.filters).length} filter(s)`)
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No filters'
  }

  const getMostUsedPresets = () => {
    return [...presets]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 3)
  }

  const getRecentPresets = () => {
    return [...presets]
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, 3)
  }

  const commonIcons = ['🔍', '💻', '💼', '📝', '📊', '⚡', '🎯', '📚', '💬', '🏷️', '📁', '⭐']

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Quick Access to Most Used Presets */}
      {getMostUsedPresets().slice(0, 2).map((preset) => (
        <Button
          key={preset.id}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(preset)}
          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs px-2 py-1 h-auto"
          title={`${preset.name}: ${getPresetSummary(preset)}`}
        >
          <span className="text-sm mr-1">{preset.icon}</span>
          <span className="hidden sm:inline">{preset.name}</span>
        </Button>
      ))}

      {/* Main Presets Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Presets</span>
            <span className="sm:hidden">💾</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 bg-gray-800 border-gray-600">
          {/* Most Used Section */}
          <div className="p-2">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <Star className="w-3 h-3" />
              Most Used
            </div>
            {getMostUsedPresets().map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">{preset.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">{preset.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {getPresetSummary(preset)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs text-blue-400">
                    {preset.useCount}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(preset)
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-600"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePreset(preset.id)
                    }}
                    className="h-6 w-6 p-0 hover:bg-red-600 text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Recent Section */}
          <div className="p-2">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <Clock className="w-3 h-3" />
              Recently Used
            </div>
            {getRecentPresets().map((preset) => (
              <DropdownMenuItem
                key={`recent-${preset.id}`}
                onClick={() => applyPreset(preset)}
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">{preset.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">{preset.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {getPresetSummary(preset)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(preset.lastUsed).toLocaleDateString()}
                </div>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Save Current Search */}
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)} className="p-2 cursor-pointer hover:bg-gray-700">
            <BookmarkPlus className="w-4 h-4 mr-2 text-green-400" />
            <span className="text-green-400">Save Current Search</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save/Edit Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Edit Preset' : 'Save Search Preset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Preset Name</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="My Saved Search"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Description (optional)</label>
              <Input
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Brief description of this search..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Icon</label>
              <div className="flex flex-wrap gap-2">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewPresetIcon(icon)}
                    className={`p-2 rounded border-2 transition-colors ${
                      newPresetIcon === icon
                        ? 'border-violet-500 bg-violet-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {!editingPreset && (
              <div className="p-3 bg-gray-700/50 rounded border border-gray-600">
                <div className="text-sm font-medium text-gray-300 mb-2">Current Search Settings:</div>
                <div className="text-xs text-gray-400 space-y-1">
                  {currentQuery && <div>Query: "{currentQuery}"</div>}
                  {currentCategory !== 'all' && <div>Category: {currentCategory}</div>}
                  {currentProject !== 'all' && <div>Project: {currentProject}</div>}
                  {Object.keys(currentFilters).length > 0 && (
                    <div>Filters: {Object.keys(currentFilters).length} active</div>
                  )}
                  <div>Sort: {currentSortBy} ({currentSortOrder})</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false)
                  setEditingPreset(null)
                  setNewPresetName('')
                  setNewPresetDescription('')
                  setNewPresetIcon('🔍')
                }}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={editingPreset ? updatePreset : saveCurrentAsPreset}
                disabled={!newPresetName.trim()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {editingPreset ? 'Update' : 'Save'} Preset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}