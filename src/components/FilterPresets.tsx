import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { 
  Bookmark, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw,
  Loader2,
  ChevronDown,
  Clock,
  Star,
  Settings,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { AdvancedFilters } from '@/types';

interface FilterPresetsProps {
  currentFilters: AdvancedFilters;
  onApplyPreset: (filters: AdvancedFilters) => void;
  onFiltersChange?: (filters: AdvancedFilters) => void;
  className?: string;
}

export function FilterPresets({ 
  currentFilters, 
  onApplyPreset, 
  onFiltersChange,
  className = '' 
}: FilterPresetsProps) {
  const {
    presets,
    builtInPresets,
    customPresets,
    loading,
    error,
    savePreset,
    applyPreset,
    updatePreset,
    deletePreset,
    exportPresets,
    importPresets,
    resetToDefaults,
    clearError
  } = useFilterPresets();
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<any>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('📁');
  const [importData, setImportData] = useState('');
  const [importResults, setImportResults] = useState<any>(null);

  const handleApplyPreset = async (presetId: string) => {
    try {
      const preset = await applyPreset(presetId);
      onApplyPreset(preset.filters);
    } catch (err) {
      console.error('Failed to apply preset:', err);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      return;
    }

    try {
      const presetData = {
        name: newPresetName.trim(),
        description: newPresetDescription.trim(),
        icon: newPresetIcon,
        filters: { ...currentFilters }
      };

      if (editingPreset) {
        await updatePreset(editingPreset.id, presetData);
      } else {
        await savePreset(presetData);
      }

      setShowSaveDialog(false);
      setEditingPreset(null);
      setNewPresetName('');
      setNewPresetDescription('');
      setNewPresetIcon('📁');
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      await deletePreset(presetId);
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  const handleEditPreset = (preset: any) => {
    setEditingPreset(preset);
    setNewPresetName(preset.name);
    setNewPresetDescription(preset.description);
    setNewPresetIcon(preset.icon);
    setShowSaveDialog(true);
  };

  const handleExportPresets = () => {
    try {
      const exportData = exportPresets(false); // Exclude built-ins
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filter-presets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export presets:', err);
    }
  };

  const handleImportPresets = async () => {
    if (!importData.trim()) {
      return;
    }

    try {
      const results = await importPresets(importData, {
        overwrite: false,
        skipDuplicates: true
      });
      
      setImportResults(results);
      setImportData('');
    } catch (err) {
      console.error('Failed to import presets:', err);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm('This will delete all custom presets and reset to built-in presets only. Are you sure?')) return;

    try {
      await resetToDefaults();
    } catch (err) {
      console.error('Failed to reset presets:', err);
    }
  };

  const getPresetPreview = (filters: AdvancedFilters): string => {
    const parts = [];
    
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      parts.push(`Category: ${categories.join(', ')}`);
    }
    if (filters.priority?.length) {
      parts.push(`Priority: ${filters.priority.join(', ')}`);
    }
    if (filters.tags?.length) {
      parts.push(`Tags: ${filters.tags.slice(0, 3).join(', ')}${filters.tags.length > 3 ? '...' : ''}`);
    }
    if (filters.hasNoTags) {
      parts.push('No tags');
    }
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start).toLocaleDateString();
      const end = new Date(filters.dateRange.end).toLocaleDateString();
      parts.push(`Date: ${start} - ${end}`);
    }
    if (filters.project) {
      parts.push(`Project: ${filters.project}`);
    }
    if (filters.contentType) {
      parts.push(`Type: ${filters.contentType}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  const hasActiveFilters = () => {
    return Object.keys(currentFilters).some(key => {
      const value = currentFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return Boolean(value);
    });
  };

  // builtInPresets and customPresets are already provided by the hook

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Quick Apply Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
            Presets
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Built-in Presets
          </DropdownMenuLabel>
          {builtInPresets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <span className="text-lg">{preset.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{preset.name}</span>
                  {preset.usageCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {preset.usageCount}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {preset.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {getPresetPreview(preset.filters)}
                </div>
              </div>
            </DropdownMenuItem>
          ))}

          {customPresets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Custom Presets
              </DropdownMenuLabel>
              {customPresets.slice(0, 8).map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                >
                  <span className="text-lg">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{preset.name}</span>
                      {preset.usageCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {preset.usageCount}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {preset.description || 'Custom filter preset'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {getPresetPreview(preset.filters)}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              {customPresets.length > 8 && (
                <DropdownMenuItem
                  onClick={() => setShowManageDialog(true)}
                  className="text-center text-muted-foreground"
                >
                  +{customPresets.length - 8} more presets...
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setShowSaveDialog(true)}
              disabled={!hasActiveFilters()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Save Current Filters
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowManageDialog(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage Presets
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Current Filters Button */}
      {hasActiveFilters() && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Save
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-1 rounded">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={clearError} className="ml-2 text-red-300 hover:text-red-100">
            ×
          </button>
        </div>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? 'Edit Preset' : 'Save Filter Preset'}
            </DialogTitle>
            <DialogDescription>
              Save your current filter settings as a preset for quick access later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g., Recent Work Items"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Brief description of this preset..."
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Icon</label>
              <Input
                value={newPresetIcon}
                onChange={(e) => setNewPresetIcon(e.target.value)}
                placeholder="📁"
                className="mt-1"
                maxLength={2}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Current Filters Preview:</div>
              <div className="text-xs text-muted-foreground">
                {getPresetPreview(currentFilters)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>
              {editingPreset ? 'Update' : 'Save'} Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Presets Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Filter Presets</DialogTitle>
            <DialogDescription>
              Edit, delete, import, or export your filter presets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Management Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPresets}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Custom Presets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportDialog(true)}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Presets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                className="flex items-center gap-2 text-red-600"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </div>

            {/* Custom Presets */}
            {customPresets.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Custom Presets ({customPresets.length})</h3>
                <div className="space-y-2">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{preset.name}</span>
                          {preset.usageCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Used {preset.usageCount} times
                            </Badge>
                          )}
                          {preset.lastUsed && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(preset.lastUsed).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {preset.description || 'No description'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {getPresetPreview(preset.filters)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPreset(preset)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePreset(preset.id)}
                          className="flex items-center gap-1 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Built-in Presets */}
            <div>
              <h3 className="font-medium mb-3">Built-in Presets ({builtInPresets.length})</h3>
              <div className="space-y-2">
                {builtInPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{preset.name}</span>
                        <Badge variant="outline" className="text-xs">Built-in</Badge>
                        {preset.usageCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Used {preset.usageCount} times
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {preset.description}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getPresetPreview(preset.filters)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowManageDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Filter Presets</DialogTitle>
            <DialogDescription>
              Paste exported preset data to import filter presets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Import Data</label>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste exported JSON data here..."
                className="mt-1"
                rows={8}
              />
            </div>

            {importResults && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-sm font-medium text-green-400">Import Results</div>
                <div className="text-sm text-green-300 mt-1">
                  • Imported: {importResults.imported} presets
                  • Skipped: {importResults.skipped} presets
                  {importResults.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="text-red-400">Errors:</div>
                      {importResults.errors.map((error: string, index: number) => (
                        <div key={index} className="text-xs text-red-300">• {error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportPresets} disabled={!importData.trim()}>
              Import Presets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}