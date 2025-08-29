/**
 * Task Tools Plugin
 * Provides task management tools for MCP
 */

export default {
  name: 'task-tools',
  version: '1.0.0',
  description: 'Task management tools for Like-I-Said MCP',

  /**
   * Initialize plugin with service registry
   */
  async initialize(serviceRegistry) {
    // Get or create task storage service (lazy loaded)
    this.taskStorage = await serviceRegistry.get('taskStorage');
    if (!this.taskStorage) {
      // Fallback: create directly if service not registered
      const { MinimalTaskStorage } = await import('../services/minimal-task-storage.js');
      this.taskStorage = new MinimalTaskStorage();
      serviceRegistry.registerSingleton('taskStorage', this.taskStorage);
    }
  },

  /**
   * Plugin tools definitions
   */
  tools: {
    create_task: {
      schema: {
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { 
              type: 'string',
              description: 'Task title'
            },
            description: { 
              type: 'string',
              description: 'Detailed task description'
            },
            status: { 
              type: 'string', 
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'Task status'
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Task priority'
            },
            project: { 
              type: 'string',
              description: 'Project context'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Task tags'
            },
            parent_id: {
              type: 'string',
              description: 'Parent task ID for subtasks'
            }
          },
          required: ['title']
        }
      },
      async handler(args) {
        return await this.taskStorage.createTask(args);
      }
    },

    update_task: {
      schema: {
        description: 'Update an existing task',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'Task ID to update'
            },
            title: {
              type: 'string',
              description: 'New title'
            },
            description: {
              type: 'string',
              description: 'New description'
            },
            status: { 
              type: 'string',
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'New status'
            },
            priority: { 
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'New priority'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated tags'
            }
          },
          required: ['id']
        }
      },
      async handler(args) {
        const { id, ...updates } = args;
        const task = await this.taskStorage.updateTask(id, updates);
        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }
        return task;
      }
    },

    list_tasks: {
      schema: {
        description: 'List all tasks with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { 
              type: 'string',
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'Filter by status'
            },
            project: { 
              type: 'string',
              description: 'Filter by project'
            },
            priority: { 
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Filter by priority'
            },
            parent_id: {
              type: 'string',
              description: 'Filter by parent task (use null for root tasks)'
            }
          }
        }
      },
      async handler(args) {
        const tasks = await this.taskStorage.listTasks(args);
        
        // Group by status for better organization
        const grouped = {
          todo: [],
          in_progress: [],
          done: [],
          blocked: []
        };
        
        tasks.forEach(task => {
          const status = task.status || 'todo';
          if (grouped[status]) {
            grouped[status].push(task);
          }
        });
        
        return {
          count: tasks.length,
          by_status: {
            todo: grouped.todo.length,
            in_progress: grouped.in_progress.length,
            done: grouped.done.length,
            blocked: grouped.blocked.length
          },
          tasks: tasks.slice(0, 50) // Limit for performance
        };
      }
    },

    get_task_context: {
      schema: {
        description: 'Get task with full context (parent, subtasks, siblings)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Task ID'
            }
          },
          required: ['id']
        }
      },
      async handler(args) {
        const context = await this.taskStorage.getTaskContext(args.id);
        if (!context) {
          throw new Error(`Task not found: ${args.id}`);
        }
        return context;
      }
    },

    delete_task: {
      schema: {
        description: 'Delete a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string',
              description: 'Task ID to delete'
            }
          },
          required: ['id']
        }
      },
      async handler(args) {
        const success = await this.taskStorage.deleteTask(args.id);
        if (!success) {
          throw new Error(`Failed to delete task: ${args.id}`);
        }
        return {
          success: true,
          message: `Task ${args.id} deleted successfully`
        };
      }
    },

    generate_dropoff: {
      schema: {
        description: 'Generate a session dropoff summary of all tasks',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['summary', 'detailed'],
              description: 'Output format'
            }
          }
        }
      },
      async handler(args) {
        const dropoff = await this.taskStorage.generateDropoff();
        
        if (args.format === 'detailed') {
          return dropoff;
        }
        
        // Summary format
        return {
          timestamp: dropoff.timestamp,
          total_tasks: dropoff.total_tasks,
          by_status: dropoff.by_status,
          active_tasks: dropoff.tasks.in_progress.map(t => ({
            id: t.id,
            title: t.title,
            project: t.project
          })),
          blocked_tasks: dropoff.tasks.blocked.map(t => ({
            id: t.id,
            title: t.title,
            reason: t.description
          }))
        };
      }
    }
  },

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    console.error('Task tools plugin shutting down');
  }
};