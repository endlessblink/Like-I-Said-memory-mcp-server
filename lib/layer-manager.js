/**
 * Layer Management System for MCP Server
 * Provides dynamic tool layering with context awareness and smart suggestions
 */

export class LayerManager {
  constructor() {
    // Default layer configuration
    this.layers = {
      core: {
        id: 'core',
        name: 'Core Operations',
        description: 'Essential memory and task management tools',
        tools: [
          'add_memory',
          'search_memories', 
          'get_memory',
          'create_task',
          'list_tasks',
          'get_task_context',
          'test_tool',
          'generate_dropoff'
        ],
        alwaysActive: true,
        priority: 1
      },
      
      project: {
        id: 'project',
        name: 'Project Management',
        description: 'Hierarchical project and task organization tools',
        tools: [
          'create_project',
          'create_stage', 
          'create_hierarchical_task',
          'create_subtask',
          'move_task',
          'view_project',
          'find_project',
          'setup_project_structure',
          'validate_hierarchy',
          'find_or_create_project',
          'update_hierarchical_task'
        ],
        alwaysActive: false,
        priority: 2,
        keywords: ['project', 'stage', 'hierarchy', 'organize', 'plan', 'milestone'],
        autoActivatePatterns: [
          /create.*(project|stage)/i,
          /manage.*project/i,
          /project.*planning/i
        ]
      },
      
      memory: {
        id: 'memory',
        name: 'Advanced Memory',
        description: 'Enhanced memory management and analytics tools',
        tools: [
          'enhance_memory_metadata',
          'batch_enhance_memories',
          'smart_status_update', 
          'get_task_status_analytics',
          'validate_task_workflow',
          'get_automation_suggestions',
          'list_memories',
          'delete_memory'
        ],
        alwaysActive: false,
        priority: 3,
        keywords: ['enhance', 'analyze', 'metadata', 'batch', 'analytics'],
        autoActivatePatterns: [
          /enhance.*memor/i,
          /batch.*process/i,
          /analyz.*memor/i
        ]
      },
      
      admin: {
        id: 'admin',
        name: 'System Administration', 
        description: 'Configuration, performance, and system management tools',
        tools: [
          'set_memory_path',
          'set_task_path',
          'get_current_paths',
          'analyze_performance',
          'suggest_improvements',
          'update_strategies',
          'work_detector_control',
          'deduplicate_memories'
        ],
        alwaysActive: false,
        priority: 4,
        keywords: ['configure', 'performance', 'optimize', 'settings', 'paths'],
        autoActivatePatterns: [
          /performance/i,
          /configure/i,
          /settings/i,
          /optimize/i
        ]
      },
      
      ai: {
        id: 'ai',
        name: 'AI Enhancement',
        description: 'AI-powered content enhancement and processing tools', 
        tools: [
          'batch_enhance_memories_ollama',
          'batch_enhance_tasks_ollama',
          'check_ollama_status',
          'enhance_memory_ollama',
          'update_task',
          'delete_task',
          'enforce_proactive_memory'
        ],
        alwaysActive: false,
        priority: 5,
        keywords: ['ai', 'ollama', 'enhance', 'intelligent', 'smart'],
        autoActivatePatterns: [
          /ai.*enhanc/i,
          /ollama/i,
          /intelligent/i
        ]
      }
    };
    
    // Active layers tracking
    this.activeLayers = new Set(['core']); // Core is always active
    this.sessionContext = {
      queries: [],
      usagePatterns: {},
      suggestions: []
    };
    
    // Configuration from environment
    this.config = {
      defaultLayers: this.parseLayerConfig(process.env.MCP_DEFAULT_LAYERS || 'core'),
      smartSuggestions: process.env.MCP_SMART_SUGGESTIONS !== 'false',
      maxTools: parseInt(process.env.MCP_MAX_TOOLS) || 20,
      suggestionThreshold: 2 // Number of matching patterns before suggesting
    };
    
    // Initialize default layers
    this.initializeDefaultLayers();
  }
  
  /**
   * Parse layer configuration string
   */
  parseLayerConfig(layerString) {
    return layerString.split(',').map(layer => layer.trim()).filter(Boolean);
  }
  
  /**
   * Initialize default layers from configuration
   */
  initializeDefaultLayers() {
    this.config.defaultLayers.forEach(layerId => {
      if (this.layers[layerId]) {
        this.activeLayers.add(layerId);
      }
    });
  }
  
  /**
   * Get all available layers
   */
  getAvailableLayers() {
    return Object.values(this.layers).map(layer => ({
      id: layer.id,
      name: layer.name,
      description: layer.description,
      toolCount: layer.tools.length,
      active: this.activeLayers.has(layer.id),
      alwaysActive: layer.alwaysActive,
      priority: layer.priority
    })).sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Get currently active layers
   */
  getActiveLayers() {
    return this.getAvailableLayers().filter(layer => layer.active);
  }
  
  /**
   * Activate a layer
   */
  activateLayer(layerId) {
    if (!this.layers[layerId]) {
      throw new Error(`Unknown layer: ${layerId}`);
    }
    
    const wasActive = this.activeLayers.has(layerId);
    this.activeLayers.add(layerId);
    
    // Update usage patterns
    this.updateUsagePattern(layerId, 'activated');
    
    return {
      success: true,
      layer: layerId,
      wasActive,
      toolsAdded: this.layers[layerId].tools.length
    };
  }
  
  /**
   * Deactivate a layer (cannot deactivate core)
   */
  deactivateLayer(layerId) {
    if (layerId === 'core') {
      throw new Error('Cannot deactivate core layer');
    }
    
    if (!this.layers[layerId]) {
      throw new Error(`Unknown layer: ${layerId}`);
    }
    
    const wasActive = this.activeLayers.has(layerId);
    this.activeLayers.delete(layerId);
    
    // Update usage patterns
    this.updateUsagePattern(layerId, 'deactivated');
    
    return {
      success: true,
      layer: layerId,
      wasActive,
      toolsRemoved: this.layers[layerId].tools.length
    };
  }
  
  /**
   * Get all tools from active layers
   */
  getActiveTools() {
    const tools = new Set();
    
    for (const layerId of this.activeLayers) {
      const layer = this.layers[layerId];
      if (layer) {
        layer.tools.forEach(tool => tools.add(tool));
      }
    }
    
    // Add meta-tools for layer management
    tools.add('list_available_layers');
    tools.add('activate_layer');
    tools.add('deactivate_layer');
    tools.add('get_layer_suggestions');
    
    return Array.from(tools);
  }
  
  /**
   * Analyze query for layer suggestions
   */
  analyzeQuery(query) {
    if (!this.config.smartSuggestions) {
      return [];
    }
    
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Store query for pattern analysis
    this.sessionContext.queries.push({
      text: query,
      timestamp: Date.now()
    });
    
    // Check each inactive layer for matches
    for (const [layerId, layer] of Object.entries(this.layers)) {
      if (this.activeLayers.has(layerId) || layer.alwaysActive) {
        continue;
      }
      
      let matchScore = 0;
      
      // Check keywords
      if (layer.keywords) {
        for (const keyword of layer.keywords) {
          if (queryLower.includes(keyword)) {
            matchScore += 1;
          }
        }
      }
      
      // Check patterns
      if (layer.autoActivatePatterns) {
        for (const pattern of layer.autoActivatePatterns) {
          if (pattern.test(query)) {
            matchScore += 2; // Patterns have higher weight
          }
        }
      }
      
      // Add suggestion if score meets threshold
      if (matchScore >= this.config.suggestionThreshold) {
        suggestions.push({
          layerId,
          layerName: layer.name,
          confidence: Math.min(matchScore / 3, 1), // Normalize to 0-1
          reason: `Query matches ${layer.name.toLowerCase()} patterns`,
          tools: layer.tools.length
        });
      }
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return suggestions;
  }
  
  /**
   * Get smart suggestions based on session context
   */
  getSmartSuggestions() {
    const suggestions = [];
    
    // Analyze recent queries
    const recentQueries = this.sessionContext.queries.slice(-10);
    for (const query of recentQueries) {
      const querySuggestions = this.analyzeQuery(query.text);
      suggestions.push(...querySuggestions);
    }
    
    // Deduplicate and sort
    const uniqueSuggestions = new Map();
    for (const suggestion of suggestions) {
      const existing = uniqueSuggestions.get(suggestion.layerId);
      if (!existing || suggestion.confidence > existing.confidence) {
        uniqueSuggestions.set(suggestion.layerId, suggestion);
      }
    }
    
    return Array.from(uniqueSuggestions.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 suggestions
  }
  
  /**
   * Update usage patterns
   */
  updateUsagePattern(layerId, action) {
    if (!this.sessionContext.usagePatterns[layerId]) {
      this.sessionContext.usagePatterns[layerId] = {
        activations: 0,
        deactivations: 0,
        lastUsed: null
      };
    }
    
    const pattern = this.sessionContext.usagePatterns[layerId];
    pattern[action === 'activated' ? 'activations' : 'deactivations']++;
    pattern.lastUsed = Date.now();
  }
  
  /**
   * Get layer statistics
   */
  getLayerStats() {
    return {
      totalLayers: Object.keys(this.layers).length,
      activeLayers: this.activeLayers.size,
      totalTools: Object.values(this.layers).reduce((sum, layer) => sum + layer.tools.length, 0),
      activeTools: this.getActiveTools().length,
      usagePatterns: this.sessionContext.usagePatterns,
      configuration: {
        defaultLayers: this.config.defaultLayers,
        smartSuggestions: this.config.smartSuggestions,
        maxTools: this.config.maxTools
      }
    };
  }
  
  /**
   * Reset session context
   */
  resetSession() {
    this.sessionContext = {
      queries: [],
      usagePatterns: {},
      suggestions: []
    };
    
    // Reset to default layers
    this.activeLayers = new Set(['core']);
    this.initializeDefaultLayers();
  }
}

// Export singleton instance
export const layerManager = new LayerManager();