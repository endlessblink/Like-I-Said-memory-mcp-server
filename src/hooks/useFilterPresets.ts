import { useState, useEffect, useCallback } from 'react';
import { PresetStorage } from '../../lib/preset-storage.js';
import { AdvancedFilters } from '@/types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: AdvancedFilters;
  isBuiltIn: boolean;
  created: string;
  updated: string;
  usageCount: number;
  lastUsed: string | null;
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [storage] = useState(() => new PresetStorage());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load presets from storage
  const loadPresets = useCallback(() => {
    try {
      setLoading(true);
      const loadedPresets = storage.getAllPresets();
      setPresets(loadedPresets);
      setError(null);
    } catch (err) {
      console.error('Failed to load presets:', err);
      setError('Failed to load filter presets');
    } finally {
      setLoading(false);
    }
  }, [storage]);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Save a new preset
  const savePreset = useCallback(async (preset: {
    name: string;
    description?: string;
    icon?: string;
    filters: AdvancedFilters;
  }) => {
    try {
      setLoading(true);
      const savedPreset = storage.savePreset({
        name: preset.name.trim(),
        description: preset.description?.trim() || '',
        icon: preset.icon || '📁',
        filters: preset.filters
      });
      
      loadPresets(); // Reload to get updated list
      setError(null);
      return savedPreset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storage, loadPresets]);

  // Apply a preset (increments usage count)
  const applyPreset = useCallback(async (presetId: string) => {
    try {
      setLoading(true);
      const appliedPreset = storage.applyPreset(presetId);
      loadPresets(); // Reload to update usage counts
      setError(null);
      return appliedPreset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply preset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storage, loadPresets]);

  // Update an existing preset
  const updatePreset = useCallback(async (presetId: string, updates: Partial<Preset>) => {
    try {
      setLoading(true);
      const updatedPreset = storage.updatePreset(presetId, updates);
      loadPresets(); // Reload to get updated list
      setError(null);
      return updatedPreset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storage, loadPresets]);

  // Delete a preset
  const deletePreset = useCallback(async (presetId: string) => {
    try {
      setLoading(true);
      storage.deletePreset(presetId);
      loadPresets(); // Reload to get updated list
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete preset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storage, loadPresets]);

  // Export presets
  const exportPresets = useCallback((includeBuiltIns: boolean = false) => {
    try {
      return storage.exportPresets(includeBuiltIns);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export presets';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [storage]);

  // Import presets
  const importPresets = useCallback(async (jsonData: string, options?: {
    overwrite?: boolean;
    skipDuplicates?: boolean;
  }) => {
    try {
      setLoading(true);
      const results = storage.importPresets(jsonData, options);
      loadPresets(); // Reload to get updated list
      setError(null);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import presets';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storage, loadPresets]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      setLoading(true);
      storage.resetToDefaults();
      loadPresets(); // Reload to get updated list
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset presets';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storage, loadPresets]);

  // Get usage statistics
  const getUsageStats = useCallback(() => {
    try {
      return storage.getUsageStats();
    } catch (err) {
      console.error('Failed to get usage stats:', err);
      return {
        total: 0,
        builtIn: 0,
        custom: 0,
        totalUsage: 0,
        mostUsed: []
      };
    }
  }, [storage]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get presets by type
  const builtInPresets = presets.filter(p => p.isBuiltIn);
  const customPresets = presets.filter(p => !p.isBuiltIn);

  return {
    // State
    presets,
    builtInPresets,
    customPresets,
    loading,
    error,
    
    // Actions
    savePreset,
    applyPreset,
    updatePreset,
    deletePreset,
    exportPresets,
    importPresets,
    resetToDefaults,
    loadPresets,
    clearError,
    getUsageStats
  };
}