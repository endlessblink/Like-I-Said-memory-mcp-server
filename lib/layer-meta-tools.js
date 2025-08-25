/**
 * Meta-tools for Layer Management
 * Provides tools for users to control and interact with the layered MCP system
 */

import { layerManager } from './layer-manager.js';

/**
 * Define meta-tools for layer management
 */
export const layerMetaTools = [
  {
    name: 'list_available_layers',
    description: 'View all available tool layers, their status, and what tools they contain. Use this to understand what functionality is available.',
    inputSchema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      type: 'object',
      properties: {
        show_tools: {
          type: 'boolean',
          description: 'Include list of tools in each layer (default: false)',
          default: false
        },
        only_inactive: {
          type: 'boolean',
          description: 'Show only inactive layers that can be activated (default: false)',
          default: false
        }
      },
      additionalProperties: false
    }
  },
  
  {
    name: 'activate_layer',
    description: 'Activate one or more tool layers to make their tools available. Use this when you need specific functionality.',
    inputSchema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      type: 'object',
      properties: {
        layer_id: {
          type: 'string',
          description: 'ID of the layer to activate (core, project, memory, admin, ai)',
          enum: ['core', 'project', 'memory', 'admin', 'ai']
        },
        multiple_layers: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['core', 'project', 'memory', 'admin', 'ai']
          },
          description: 'Activate multiple layers at once'
        }
      },
      additionalProperties: false
    }
  },
  
  {
    name: 'deactivate_layer',
    description: 'Deactivate tool layers to reduce clutter and focus on essential tools. Cannot deactivate the core layer.',
    inputSchema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      type: 'object',
      properties: {
        layer_id: {
          type: 'string',
          description: 'ID of the layer to deactivate (project, memory, admin, ai). Cannot deactivate core.',
          enum: ['project', 'memory', 'admin', 'ai']
        },
        multiple_layers: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['project', 'memory', 'admin', 'ai']
          },
          description: 'Deactivate multiple layers at once'
        }
      },
      additionalProperties: false
    }
  },
  
  {
    name: 'get_layer_suggestions',
    description: 'Get intelligent suggestions for which layers to activate based on your recent queries and usage patterns.',
    inputSchema: {
      "$schema": "https://json-schema.org/draft/2020-12/schema", 
      type: 'object',
      properties: {
        query_context: {
          type: 'string',
          description: 'Optional: Describe what you want to do to get targeted suggestions'
        },
        include_stats: {
          type: 'boolean',
          description: 'Include layer usage statistics (default: false)',
          default: false
        }
      },
      additionalProperties: false
    }
  }
];

/**
 * Handle meta-tool execution
 */
export async function handleLayerMetaTool(toolName, args) {
  try {
    switch (toolName) {
      case 'list_available_layers':
        return await handleListAvailableLayers(args);
        
      case 'activate_layer':
        return await handleActivateLayer(args);
        
      case 'deactivate_layer':
        return await handleDeactivateLayer(args);
        
      case 'get_layer_suggestions':
        return await handleGetLayerSuggestions(args);
        
      default:
        throw new Error(`Unknown layer meta-tool: ${toolName}`);
    }
  } catch (error) {
    return {
      isError: true,
      error: error.message
    };
  }
}

/**
 * Handle list_available_layers tool
 */
async function handleListAvailableLayers(args = {}) {
  const { show_tools = false, only_inactive = false } = args;
  
  let layers = layerManager.getAvailableLayers();
  
  if (only_inactive) {
    layers = layers.filter(layer => !layer.active);
  }
  
  // Add tool details if requested
  if (show_tools) {
    layers = layers.map(layer => ({
      ...layer,
      tools: layerManager.layers[layer.id]?.tools || []
    }));
  }
  
  const stats = layerManager.getLayerStats();
  
  return {
    layers,
    summary: {
      totalLayers: stats.totalLayers,
      activeLayers: stats.activeLayers,
      totalToolsAvailable: stats.totalTools,
      currentActiveTools: stats.activeTools
    },
    configuration: stats.configuration,
    note: only_inactive 
      ? "Showing only inactive layers. Use activate_layer to enable them."
      : "Use activate_layer/deactivate_layer to control which tools are available."
  };
}

/**
 * Handle activate_layer tool
 */
async function handleActivateLayer(args = {}) {
  const { layer_id, multiple_layers } = args;
  
  if (!layer_id && !multiple_layers) {
    throw new Error('Must specify either layer_id or multiple_layers');
  }
  
  const layersToActivate = multiple_layers || [layer_id];
  const results = [];
  let totalToolsAdded = 0;
  
  for (const layerId of layersToActivate) {
    try {
      const result = layerManager.activateLayer(layerId);
      results.push({
        layerId,
        success: true,
        wasActive: result.wasActive,
        toolsAdded: result.toolsAdded
      });
      
      if (!result.wasActive) {
        totalToolsAdded += result.toolsAdded;
      }
    } catch (error) {
      results.push({
        layerId,
        success: false,
        error: error.message
      });
    }
  }
  
  const newToolList = layerManager.getActiveTools();
  
  return {
    results,
    summary: {
      totalToolsAdded,
      currentActiveTools: newToolList.length,
      activeLayers: layerManager.getActiveLayers().map(l => l.name)
    },
    suggestion: totalToolsAdded > 0 
      ? "New tools are now available! You can see them in your tool list."
      : "No new tools were added (layers were already active)."
  };
}

/**
 * Handle deactivate_layer tool
 */
async function handleDeactivateLayer(args = {}) {
  const { layer_id, multiple_layers } = args;
  
  if (!layer_id && !multiple_layers) {
    throw new Error('Must specify either layer_id or multiple_layers');
  }
  
  const layersToDeactivate = multiple_layers || [layer_id];
  const results = [];
  let totalToolsRemoved = 0;
  
  for (const layerId of layersToDeactivate) {
    try {
      const result = layerManager.deactivateLayer(layerId);
      results.push({
        layerId,
        success: true,
        wasActive: result.wasActive,
        toolsRemoved: result.toolsRemoved
      });
      
      if (result.wasActive) {
        totalToolsRemoved += result.toolsRemoved;
      }
    } catch (error) {
      results.push({
        layerId,
        success: false,
        error: error.message
      });
    }
  }
  
  const newToolList = layerManager.getActiveTools();
  
  return {
    results,
    summary: {
      totalToolsRemoved,
      currentActiveTools: newToolList.length,
      activeLayers: layerManager.getActiveLayers().map(l => l.name)
    },
    note: totalToolsRemoved > 0
      ? "Tools have been removed from your available list to reduce clutter."
      : "No tools were removed (layers were already inactive)."
  };
}

/**
 * Handle get_layer_suggestions tool
 */
async function handleGetLayerSuggestions(args = {}) {
  const { query_context, include_stats = false } = args;
  
  // Analyze query context if provided
  let contextSuggestions = [];
  if (query_context) {
    contextSuggestions = layerManager.analyzeQuery(query_context);
  }
  
  // Get smart suggestions based on session
  const smartSuggestions = layerManager.getSmartSuggestions();
  
  // Combine and deduplicate
  const allSuggestions = new Map();
  
  // Add context suggestions (higher priority)
  for (const suggestion of contextSuggestions) {
    allSuggestions.set(suggestion.layerId, {
      ...suggestion,
      source: 'query_analysis'
    });
  }
  
  // Add smart suggestions (lower priority, don't override)
  for (const suggestion of smartSuggestions) {
    if (!allSuggestions.has(suggestion.layerId)) {
      allSuggestions.set(suggestion.layerId, {
        ...suggestion,
        source: 'usage_patterns'
      });
    }
  }
  
  const suggestions = Array.from(allSuggestions.values())
    .sort((a, b) => b.confidence - a.confidence);
  
  const response = {
    suggestions,
    hasContext: !!query_context,
    message: suggestions.length > 0 
      ? "Based on your context and usage patterns, these layers might be helpful:"
      : "No specific layer suggestions at the moment. All layers are available if needed.",
    activationTip: "Use activate_layer with the layer_id to enable suggested functionality."
  };
  
  if (include_stats) {
    response.stats = layerManager.getLayerStats();
  }
  
  return response;
}