/**
 * @name relationship-tools
 * @version 1.0.0
 * @description Relationship management tools for connecting memories and tasks
 * @category core
 * @provides link_items
 * @provides show_connections
 * @provides get_related  
 * @provides auto_suggest_links
 */

import RelationshipManager from '../lib/relationship-manager.js';

class RelationshipToolsPlugin {
  constructor() {
    this.name = 'relationship-tools';
    this.version = '1.0.0';
    this.relationshipManager = null;
  }

  async init(server, services) {
    this.server = server;
    this.services = services;
    this.memoryStorage = services.get('memory-storage');
    this.taskStorage = services.get('task-storage');
    
    // Initialize relationship manager with unified storage
    this.relationshipManager = new RelationshipManager({
      memoryStorage: this.memoryStorage,
      taskStorage: this.taskStorage,
      exists: async (filename) => {
        try {
          return await this.memoryStorage.unifiedStorage.exists(filename);
        } catch {
          return false;
        }
      },
      readFile: async (filename) => {
        return await this.memoryStorage.unifiedStorage.readFile(filename);
      },
      writeFile: async (filename, data) => {
        return await this.memoryStorage.unifiedStorage.writeFile(filename, data);
      }
    });
    
    console.log('🔗 Relationship tools plugin initialized');
  }

  async getTools() {
    return [
      {
        name: 'link_items',
        description: 'Link a memory to a task or memory to memory',
        inputSchema: {
          type: 'object',
          properties: {
            from_id: { type: 'string', description: 'ID of source item (memory or task)' },
            to_id: { type: 'string', description: 'ID of target item (memory or task)' },
            type: { 
              type: 'string', 
              enum: ['related', 'blocks', 'implements', 'references', 'caused_by'],
              description: 'Type of relationship'
            },
            reason: { type: 'string', description: 'Optional reason for the link' }
          },
          required: ['from_id', 'to_id']
        }
      },
      {
        name: 'show_connections',
        description: 'Get visual graph of memory-task relationships for visualization',
        inputSchema: {
          type: 'object', 
          properties: {
            project: { type: 'string', description: 'Filter to specific project' },
            item_id: { type: 'string', description: 'Focus on connections for specific item' }
          }
        }
      },
      {
        name: 'get_related',
        description: 'Find items related to a specific memory or task',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'ID of memory or task to find relations for' }
          },
          required: ['item_id']
        }
      },
      {
        name: 'auto_suggest_links', 
        description: 'Get AI-suggested connections for an item based on content similarity',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'ID of memory or task to suggest links for' },
            max_suggestions: { type: 'number', description: 'Maximum number of suggestions (default 5)' }
          },
          required: ['item_id']
        }
      }
    ];
  }

  async handleToolCall(name, args) {
    await this.relationshipManager.initialize();

    switch (name) {
      case 'link_items':
        return await this.linkItems(args);
      
      case 'show_connections':
        return await this.showConnections(args);
        
      case 'get_related':
        return await this.getRelated(args);
        
      case 'auto_suggest_links':
        return await this.autoSuggestLinks(args);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async linkItems(args) {
    const { from_id, to_id, type = 'related', reason } = args;
    
    // Validate that both items exist
    const fromItem = await this.findItem(from_id);
    const toItem = await this.findItem(to_id);
    
    if (!fromItem) {
      throw new Error(`Source item ${from_id} not found`);
    }
    if (!toItem) {
      throw new Error(`Target item ${to_id} not found`);
    }
    
    const metadata = reason ? { reason } : {};
    return await this.relationshipManager.linkItems(from_id, to_id, type, metadata);
  }

  async showConnections(args) {
    const { project, item_id } = args;
    
    if (item_id) {
      // Show connections for specific item
      const connections = await this.relationshipManager.getConnections(item_id);
      const item = await this.findItem(item_id);
      
      return {
        item: item,
        connections: connections,
        total_connections: connections.length
      };
    } else {
      // Show full graph
      const graph = await this.relationshipManager.getConnectionGraph(project);
      return graph;
    }
  }

  async getRelated(args) {
    const { item_id } = args;
    
    const item = await this.findItem(item_id);
    if (!item) {
      throw new Error(`Item ${item_id} not found`);
    }
    
    const itemContent = item.content || item.title || '';
    const itemType = item.title ? 'task' : 'memory'; // Simple heuristic
    
    return await this.relationshipManager.getRelatedItems(item_id, itemType, itemContent);
  }

  async autoSuggestLinks(args) {
    const { item_id, max_suggestions = 5 } = args;
    
    const item = await this.findItem(item_id);
    if (!item) {
      throw new Error(`Item ${item_id} not found`);
    }
    
    const itemContent = item.content || item.title || '';
    const itemType = item.title ? 'task' : 'memory';
    
    return await this.relationshipManager.autoSuggestLinks(item_id, itemType, itemContent, max_suggestions);
  }

  async findItem(itemId) {
    try {
      // Try to find as memory first
      const memory = await this.memoryStorage.getMemory(itemId);
      if (memory) return memory;
      
      // Try to find as task
      const tasks = await this.taskStorage.listTasks();
      const task = tasks.find(t => t.id === itemId);
      if (task) return task;
      
      return null;
    } catch (error) {
      console.error(`❌ Error finding item ${itemId}:`, error.message);
      return null;
    }
  }
}

export default RelationshipToolsPlugin;