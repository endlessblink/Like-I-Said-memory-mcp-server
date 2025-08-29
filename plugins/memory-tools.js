/**
 * Memory Tools Plugin
 * Provides memory management tools for MCP
 */

export default {
  name: 'memory-tools',
  version: '1.0.0',
  description: 'Memory management tools for Like-I-Said MCP',

  /**
   * Initialize plugin with service registry
   */
  async initialize(serviceRegistry) {
    // Get or create storage service (lazy loaded)
    this.storage = await serviceRegistry.get('storage');
    if (!this.storage) {
      // Fallback: create directly if service not registered
      const { MinimalStorage } = await import('../services/minimal-storage.js');
      this.storage = new MinimalStorage();
      serviceRegistry.registerSingleton('storage', this.storage);
    }
  },

  /**
   * Plugin tools definitions
   */
  tools: {
    add_memory: {
      schema: {
        description: 'Add a new memory to the system',
        inputSchema: {
          type: 'object',
          properties: {
            content: { 
              type: 'string', 
              description: 'The content to remember' 
            },
            title: {
              type: 'string',
              description: 'Optional title for the memory'
            },
            project: { 
              type: 'string', 
              description: 'Project context' 
            },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Tags for categorization'
            },
            category: { 
              type: 'string',
              description: 'Category of the memory'
            }
          },
          required: ['content']
        }
      },
      async handler(args) {
        return await this.storage.saveMemory(args.content, args);
      }
    },

    list_memories: {
      schema: {
        description: 'List all memories with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            project: { 
              type: 'string',
              description: 'Filter by project'
            },
            category: { 
              type: 'string',
              description: 'Filter by category'
            },
            minComplexity: { 
              type: 'number',
              description: 'Minimum complexity level'
            }
          }
        }
      },
      async handler(args) {
        const memories = await this.storage.listMemories(args);
        return {
          count: memories.length,
          memories: memories.slice(0, 50) // Limit for performance
        };
      }
    },

    search_memories: {
      schema: {
        description: 'Search memories by query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { 
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query']
        }
      },
      async handler(args) {
        const memories = await this.storage.searchMemories(args.query);
        return {
          count: memories.length,
          memories: memories.slice(0, 20) // Limit results
        };
      }
    },

    get_memory: {
      schema: {
        description: 'Get a specific memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'Memory ID'
            }
          },
          required: ['id']
        }
      },
      async handler(args) {
        const memory = await this.storage.getMemory(args.id);
        if (!memory) {
          throw new Error(`Memory not found: ${args.id}`);
        }
        return memory;
      }
    },

    delete_memory: {
      schema: {
        description: 'Delete a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'Memory ID to delete'
            }
          },
          required: ['id']
        }
      },
      async handler(args) {
        const success = await this.storage.deleteMemory(args.id);
        if (!success) {
          throw new Error(`Failed to delete memory: ${args.id}`);
        }
        return {
          success: true,
          message: `Memory ${args.id} deleted successfully`
        };
      }
    },

    test_tool: {
      schema: {
        description: 'Test that MCP server is working',
        inputSchema: {
          type: 'object',
          properties: {
            message: { 
              type: 'string',
              description: 'Test message'
            }
          }
        }
      },
      async handler(args) {
        return {
          success: true,
          message: `✅ MCP Server Core is working! Message: ${args.message || 'No message'}`,
          timestamp: new Date().toISOString(),
          plugin: this.name,
          version: this.version
        };
      }
    }
  },

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    // Any cleanup needed
    console.error('Memory tools plugin shutting down');
  }
};