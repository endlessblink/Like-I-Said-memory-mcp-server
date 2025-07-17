/**
 * Preset Storage System
 * Handles saving, loading, and managing filter presets for quick access
 */

class PresetStorage {
  constructor() {
    this.storageKey = 'like-i-said-filter-presets';
    this.version = '1.0';
    this.maxPresets = 50; // Prevent unlimited growth
    
    // Initialize with built-in presets if none exist
    this.initializeBuiltInPresets();
  }

  /**
   * Initialize built-in presets if no presets exist
   */
  initializeBuiltInPresets() {
    const existingPresets = this.getAllPresets();
    if (existingPresets.length === 0) {
      const builtInPresets = this.getBuiltInPresets();
      builtInPresets.forEach(preset => {
        this.savePreset(preset, { isBuiltIn: true, skipValidation: true });
      });
    }
  }

  /**
   * Get all built-in preset definitions
   */
  getBuiltInPresets() {
    return [
      {
        id: 'recent-activity',
        name: 'Recent Activity',
        description: 'Items from the last 7 days',
        icon: '🕒',
        isBuiltIn: true,
        filters: {
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          sortBy: 'updated',
          sortOrder: 'desc'
        }
      },
      {
        id: 'high-priority',
        name: 'High Priority',
        description: 'High priority and urgent items',
        icon: '🔥',
        isBuiltIn: true,
        filters: {
          priority: ['high', 'urgent'],
          sortBy: 'priority',
          sortOrder: 'desc'
        }
      },
      {
        id: 'code-technical',
        name: 'Code & Technical',
        description: 'Programming and technical content',
        icon: '💻',
        isBuiltIn: true,
        filters: {
          category: ['code'],
          tags: ['programming', 'dev', 'tech', 'api', 'bug', 'feature'],
          sortBy: 'updated',
          sortOrder: 'desc'
        }
      },
      {
        id: 'untagged-items',
        name: 'Untagged Items',
        description: 'Items without any tags',
        icon: '🏷️',
        isBuiltIn: true,
        filters: {
          hasNoTags: true,
          sortBy: 'created',
          sortOrder: 'desc'
        }
      },
      {
        id: 'work-focus',
        name: 'Work Focus',
        description: 'Recent work-related items',
        icon: '💼',
        isBuiltIn: true,
        filters: {
          category: ['work'],
          dateRange: {
            start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          sortBy: 'updated',
          sortOrder: 'desc'
        }
      },
      {
        id: 'personal-notes',
        name: 'Personal Notes',
        description: 'Personal thoughts and notes',
        icon: '👤',
        isBuiltIn: true,
        filters: {
          category: ['personal'],
          sortBy: 'created',
          sortOrder: 'desc'
        }
      },
      {
        id: 'research-insights',
        name: 'Research & Analysis',
        description: 'Research findings and analytical content',
        icon: '📊',
        isBuiltIn: true,
        filters: {
          category: ['research'],
          sortBy: 'updated',
          sortOrder: 'desc'
        }
      },
      {
        id: 'conversation-notes',
        name: 'Conversation Notes',
        description: 'Meeting notes and discussions',
        icon: '💬',
        isBuiltIn: true,
        filters: {
          category: ['conversations'],
          sortBy: 'created',
          sortOrder: 'desc'
        }
      }
    ];
  }

  /**
   * Save a filter preset
   */
  savePreset(preset, options = {}) {
    const { isBuiltIn = false, skipValidation = false } = options;
    
    if (!skipValidation && !this.validatePreset(preset)) {
      throw new Error('Invalid preset data');
    }

    const presets = this.getAllPresets();
    
    // Check for duplicate names (excluding built-ins)
    if (!isBuiltIn && !preset.isBuiltIn) {
      const duplicate = presets.find(p => 
        p.name.toLowerCase() === preset.name.toLowerCase() && 
        p.id !== preset.id
      );
      if (duplicate) {
        throw new Error(`Preset name "${preset.name}" already exists`);
      }
    }

    // Prevent too many presets
    if (!isBuiltIn && presets.length >= this.maxPresets) {
      throw new Error(`Maximum ${this.maxPresets} presets allowed`);
    }

    const presetData = {
      id: preset.id || this.generateId(),
      name: preset.name.trim(),
      description: preset.description?.trim() || '',
      icon: preset.icon || '📁',
      filters: { ...preset.filters },
      isBuiltIn: isBuiltIn || preset.isBuiltIn || false,
      created: preset.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      usageCount: preset.usageCount || 0,
      lastUsed: preset.lastUsed || null
    };

    // Update existing or add new
    const existingIndex = presets.findIndex(p => p.id === presetData.id);
    if (existingIndex >= 0) {
      presets[existingIndex] = presetData;
    } else {
      presets.push(presetData);
    }

    this.saveToStorage(presets);
    return presetData;
  }

  /**
   * Get all presets sorted by usage and creation date
   */
  getAllPresets() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed.presets)) return [];
      
      // Sort: built-ins first, then by usage count, then by creation date
      return parsed.presets.sort((a, b) => {
        if (a.isBuiltIn && !b.isBuiltIn) return -1;
        if (!a.isBuiltIn && b.isBuiltIn) return 1;
        if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
        return new Date(b.created) - new Date(a.created);
      });
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  }

  /**
   * Get a specific preset by ID
   */
  getPreset(id) {
    const presets = this.getAllPresets();
    return presets.find(p => p.id === id) || null;
  }

  /**
   * Apply a preset (increment usage count and update last used)
   */
  applyPreset(id) {
    const preset = this.getPreset(id);
    if (!preset) {
      throw new Error(`Preset with ID "${id}" not found`);
    }

    // Update usage statistics
    preset.usageCount = (preset.usageCount || 0) + 1;
    preset.lastUsed = new Date().toISOString();

    // Save updated preset
    const presets = this.getAllPresets();
    const index = presets.findIndex(p => p.id === id);
    if (index >= 0) {
      presets[index] = preset;
      this.saveToStorage(presets);
    }

    return preset;
  }

  /**
   * Delete a preset (cannot delete built-ins)
   */
  deletePreset(id) {
    const preset = this.getPreset(id);
    if (!preset) {
      throw new Error(`Preset with ID "${id}" not found`);
    }

    if (preset.isBuiltIn) {
      throw new Error('Cannot delete built-in presets');
    }

    const presets = this.getAllPresets().filter(p => p.id !== id);
    this.saveToStorage(presets);
    return true;
  }

  /**
   * Update an existing preset
   */
  updatePreset(id, updates) {
    const preset = this.getPreset(id);
    if (!preset) {
      throw new Error(`Preset with ID "${id}" not found`);
    }

    if (preset.isBuiltIn && !updates.allowBuiltInUpdate) {
      throw new Error('Cannot modify built-in presets');
    }

    const updatedPreset = {
      ...preset,
      ...updates,
      id, // Ensure ID doesn't change
      updated: new Date().toISOString()
    };

    return this.savePreset(updatedPreset);
  }

  /**
   * Export presets for sharing
   */
  exportPresets(includeBuiltIns = false) {
    const presets = this.getAllPresets();
    const exportData = {
      version: this.version,
      exported: new Date().toISOString(),
      presets: includeBuiltIns ? presets : presets.filter(p => !p.isBuiltIn)
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import presets from exported data
   */
  importPresets(jsonData, options = {}) {
    const { overwrite = false, skipDuplicates = true } = options;
    
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.presets || !Array.isArray(importData.presets)) {
        throw new Error('Invalid import data format');
      }

      const existingPresets = this.getAllPresets();
      const results = {
        imported: 0,
        skipped: 0,
        errors: []
      };

      for (const preset of importData.presets) {
        try {
          // Skip built-ins unless specifically requested
          if (preset.isBuiltIn && !options.includeBuiltIns) {
            results.skipped++;
            continue;
          }

          const existing = existingPresets.find(p => 
            p.name.toLowerCase() === preset.name.toLowerCase()
          );

          if (existing && !overwrite) {
            if (skipDuplicates) {
              results.skipped++;
              continue;
            } else {
              throw new Error(`Preset "${preset.name}" already exists`);
            }
          }

          // Generate new ID to avoid conflicts
          const importedPreset = {
            ...preset,
            id: this.generateId(),
            isBuiltIn: false, // Imported presets are never built-in
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            usageCount: 0,
            lastUsed: null
          };

          this.savePreset(importedPreset);
          results.imported++;
        } catch (error) {
          results.errors.push(`${preset.name}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Reset to built-in presets only
   */
  resetToDefaults() {
    const builtInPresets = this.getBuiltInPresets();
    this.saveToStorage(builtInPresets);
    return builtInPresets.length;
  }

  /**
   * Get preset usage statistics
   */
  getUsageStats() {
    const presets = this.getAllPresets();
    
    return {
      total: presets.length,
      builtIn: presets.filter(p => p.isBuiltIn).length,
      custom: presets.filter(p => !p.isBuiltIn).length,
      totalUsage: presets.reduce((sum, p) => sum + (p.usageCount || 0), 0),
      mostUsed: presets
        .filter(p => p.usageCount > 0)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(p => ({ name: p.name, count: p.usageCount }))
    };
  }

  /**
   * Validate preset data structure
   */
  validatePreset(preset) {
    if (!preset || typeof preset !== 'object') return false;
    if (!preset.name || typeof preset.name !== 'string' || !preset.name.trim()) return false;
    if (!preset.filters || typeof preset.filters !== 'object') return false;
    
    // Basic filter validation
    const { filters } = preset;
    
    // Validate date ranges if present
    if (filters.dateRange) {
      if (!filters.dateRange.start || !filters.dateRange.end) return false;
      try {
        new Date(filters.dateRange.start);
        new Date(filters.dateRange.end);
      } catch {
        return false;
      }
    }

    // Validate arrays if present
    if (filters.category && !Array.isArray(filters.category)) return false;
    if (filters.tags && !Array.isArray(filters.tags)) return false;
    if (filters.priority && !Array.isArray(filters.priority)) return false;

    return true;
  }

  /**
   * Generate unique preset ID
   */
  generateId() {
    return 'preset-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save presets to localStorage
   */
  saveToStorage(presets) {
    const data = {
      version: this.version,
      updated: new Date().toISOString(),
      presets
    };
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save presets:', error);
      throw new Error('Failed to save presets to storage');
    }
  }

  /**
   * Clear all presets (for testing/reset)
   */
  clearAll() {
    localStorage.removeItem(this.storageKey);
    this.initializeBuiltInPresets();
  }
}

export { PresetStorage };