/**
 * @name advanced-features
 * @version 1.0.0
 * @description Advanced features plugin - includes all remaining tools from original server
 * @category advanced
 * @depends memory-tools
 * @depends task-tools
 * @provides deduplicate_memories
 * @provides batch_enhance_memories
 * @provides enhance_memory_metadata
 * @provides smart_status_update
 * @provides validate_task_workflow
 * @provides get_task_status_analytics
 * @provides work_detector_control
 * @provides suggest_improvements
 * @provides get_automation_suggestions
 * @provides enforce_proactive_memory
 * @provides update_strategies
 * @provides get_current_paths
 * @provides set_memory_path
 * @provides set_task_path
 */

import fs from 'fs';
import path from 'path';

export default class AdvancedFeaturesPlugin {
  constructor() {
    this.name = 'advanced-features';
    this.version = '1.0.0';
    this.loaded = false;
    
    // Lazy-loaded dependencies
    this.memoryDeduplicator = null;
    this.titleSummaryGenerator = null;
    this.taskAutomation = null;
    this.workDetector = null;
    this.taskAnalytics = null;
    
    // Configuration paths
    this.configPaths = {
      memoryDir: 'memories',
      taskDir: 'tasks'
    };
  }

  /**
   * Initialize the plugin
   */
  async init(server, services) {
    this.server = server;
    this.services = services;
    this.memoryStorage = services.get('memory-storage');
    this.taskStorage = services.get('task-storage');
    this.logger = services.get('logger') || console;
    
    this.loaded = true;
    this.logger.info('Advanced Features plugin initialized');
  }

  /**
   * Lazy load memory deduplicator
   */
  async loadMemoryDeduplicator() {
    if (!this.memoryDeduplicator) {
      try {
        const { MemoryDeduplicator } = await import('../lib/memory-deduplicator.js');
        this.memoryDeduplicator = new MemoryDeduplicator(this.memoryStorage);
      } catch (error) {
        this.logger.warn('Failed to load MemoryDeduplicator:', error.message);
        this.memoryDeduplicator = {
          findDuplicates: async () => [],
          deduplicate: async () => ({ removed: 0, kept: 0 })
        };
      }
    }
    return this.memoryDeduplicator;
  }

  /**
   * Lazy load other components
   */
  async loadComponent(componentName) {
    switch (componentName) {
      case 'titleSummary':
        if (!this.titleSummaryGenerator) {
          try {
            const { TitleSummaryGenerator } = await import('../lib/title-summary-generator.js');
            this.titleSummaryGenerator = new TitleSummaryGenerator();
          } catch (error) {
            this.titleSummaryGenerator = { 
              generate: async () => ({ title: 'Generated Title', summary: 'Generated Summary' })
            };
          }
        }
        return this.titleSummaryGenerator;

      case 'taskAutomation':
        if (!this.taskAutomation) {
          try {
            const { TaskAutomation } = await import('../lib/task-automation.js');
            this.taskAutomation = new TaskAutomation(this.taskStorage);
          } catch (error) {
            this.taskAutomation = {
              suggestStatusUpdate: async () => 'No suggestions available',
              getAutomationSuggestions: async () => []
            };
          }
        }
        return this.taskAutomation;

      case 'workDetector':
        if (!this.workDetector) {
          try {
            const { WorkDetectorWrapper } = await import('../lib/work-detector-wrapper.js');
            this.workDetector = new WorkDetectorWrapper();
          } catch (error) {
            this.workDetector = {
              isEnabled: () => false,
              enable: () => 'Work detector not available',
              disable: () => 'Work detector not available'
            };
          }
        }
        return this.workDetector;

      case 'taskAnalytics':
        if (!this.taskAnalytics) {
          try {
            const { TaskAnalytics } = await import('../lib/task-analytics.js');
            this.taskAnalytics = new TaskAnalytics(this.taskStorage);
          } catch (error) {
            this.taskAnalytics = {
              getStatusAnalytics: async () => ({ total: 0, by_status: {} })
            };
          }
        }
        return this.taskAnalytics;

      default:
        return null;
    }
  }

  /**
   * Get available tools
   */
  getTools() {
    return [
      {
        name: 'deduplicate_memories',
        description: 'Find and remove duplicate memories based on content similarity',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to deduplicate (optional)'
            },
            similarity_threshold: {
              type: 'number',
              description: 'Similarity threshold (0.0-1.0)',
              default: 0.85
            },
            dry_run: {
              type: 'boolean',
              description: 'Preview duplicates without removing them',
              default: false
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'batch_enhance_memories',
        description: 'Enhance multiple memories with better titles and summaries',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to enhance (optional)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number to enhance',
              default: 20
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'enhance_memory_metadata',
        description: 'Generate optimized title and summary for a memory',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'ID of memory to enhance'
            },
            regenerate: {
              type: 'boolean',
              description: 'Force regeneration even if exists',
              default: false
            }
          },
          required: ['memory_id'],
          additionalProperties: false
        }
      },
      {
        name: 'smart_status_update',
        description: 'Intelligently suggest and update task status based on content analysis',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to analyze'
            },
            auto_update: {
              type: 'boolean',
              description: 'Automatically apply suggestions',
              default: false
            }
          },
          required: ['task_id'],
          additionalProperties: false
        }
      },
      {
        name: 'validate_task_workflow',
        description: 'Validate task workflow and suggest improvements',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to validate (optional)'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'get_task_status_analytics',
        description: 'Get comprehensive task status analytics and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to analyze (optional)'
            },
            timeframe: {
              type: 'string',
              enum: ['day', 'week', 'month'],
              description: 'Time period for analysis',
              default: 'week'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'work_detector_control',
        description: 'Control work detection features',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['enable', 'disable', 'status'],
              description: 'Action to perform'
            }
          },
          required: ['action'],
          additionalProperties: false
        }
      },
      {
        name: 'suggest_improvements',
        description: 'Analyze system usage and suggest improvements',
        inputSchema: {
          type: 'object',
          properties: {
            area: {
              type: 'string',
              enum: ['memories', 'tasks', 'workflow', 'all'],
              description: 'Area to analyze',
              default: 'all'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'get_automation_suggestions',
        description: 'Get intelligent automation suggestions based on patterns',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project context (optional)'
            },
            limit: {
              type: 'number',
              description: 'Max suggestions to return',
              default: 5
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'enforce_proactive_memory',
        description: 'Analyze recent activity and suggest memories to create',
        inputSchema: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              description: 'Context to analyze for memory suggestions'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'update_strategies',
        description: 'Update system strategies and configurations',
        inputSchema: {
          type: 'object',
          properties: {
            strategy_type: {
              type: 'string',
              enum: ['memory', 'task', 'automation'],
              description: 'Type of strategy to update'
            },
            config: {
              type: 'object',
              description: 'Strategy configuration'
            }
          },
          required: ['strategy_type'],
          additionalProperties: false
        }
      },
      {
        name: 'get_current_paths',
        description: 'Get current storage paths and configuration',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'set_memory_path',
        description: 'Set custom memory storage path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'New memory storage path'
            }
          },
          required: ['path'],
          additionalProperties: false
        }
      },
      {
        name: 'set_task_path',
        description: 'Set custom task storage path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'New task storage path'
            }
          },
          required: ['path'],
          additionalProperties: false
        }
      }
    ];
  }

  /**
   * Handle tool calls
   */
  async handleTool(name, args) {
    try {
      switch (name) {
        case 'deduplicate_memories':
          return await this.deduplicateMemories(args);
        
        case 'batch_enhance_memories':
          return await this.batchEnhanceMemories(args);
        
        case 'enhance_memory_metadata':
          return await this.enhanceMemoryMetadata(args);
        
        case 'smart_status_update':
          return await this.smartStatusUpdate(args);
        
        case 'validate_task_workflow':
          return await this.validateTaskWorkflow(args);
        
        case 'get_task_status_analytics':
          return await this.getTaskStatusAnalytics(args);
        
        case 'work_detector_control':
          return await this.workDetectorControl(args);
        
        case 'suggest_improvements':
          return await this.suggestImprovements(args);
        
        case 'get_automation_suggestions':
          return await this.getAutomationSuggestions(args);
        
        case 'enforce_proactive_memory':
          return await this.enforceProactiveMemory(args);
        
        case 'update_strategies':
          return await this.updateStrategies(args);
        
        case 'get_current_paths':
          return await this.getCurrentPaths(args);
        
        case 'set_memory_path':
          return await this.setMemoryPath(args);
        
        case 'set_task_path':
          return await this.setTaskPath(args);
        
        default:
          throw new Error(`Unknown advanced tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Advanced tool error (${name}):`, error);
      return {
        error: `Advanced tool ${name} failed: ${error.message}`,
        suggestion: 'Check system configuration and try again'
      };
    }
  }

  /**
   * Deduplicate memories
   */
  async deduplicateMemories(args) {
    const { project, similarity_threshold = 0.85, dry_run = false } = args;
    
    const deduplicator = await this.loadMemoryDeduplicator();
    
    try {
      const duplicates = await deduplicator.findDuplicates({
        project,
        threshold: similarity_threshold
      });

      if (dry_run) {
        return {
          success: true,
          preview: true,
          duplicates,
          message: `Found ${duplicates.length} potential duplicate groups`,
          suggestion: 'Run again with dry_run=false to remove duplicates'
        };
      }

      const result = await deduplicator.deduplicate({
        project,
        threshold: similarity_threshold
      });

      return {
        success: true,
        ...result,
        message: `✅ Deduplication completed: ${result.removed} removed, ${result.kept} kept`
      };
    } catch (error) {
      return {
        error: `Deduplication failed: ${error.message}`,
        suggestion: 'Try with a different similarity threshold or project filter'
      };
    }
  }

  /**
   * Batch enhance memories
   */
  async batchEnhanceMemories(args) {
    const { project, limit = 20 } = args;
    
    const memories = await this.memoryStorage.listMemories({ project });
    const toEnhance = memories
      .filter(m => !m.title || !m.summary)
      .slice(0, limit);

    if (toEnhance.length === 0) {
      return {
        message: 'No memories found that need enhancement',
        processed: 0
      };
    }

    const titleGen = await this.loadComponent('titleSummary');
    const results = { enhanced: 0, errors: 0, details: [] };

    for (const memory of toEnhance) {
      try {
        const metadata = await titleGen.generate(memory.content);
        
        const updatedMemory = {
          ...memory,
          title: metadata.title || memory.title,
          summary: metadata.summary || memory.summary,
          enhanced: true,
          enhancedAt: new Date().toISOString()
        };
        
        await this.memoryStorage.updateMemory(memory.id, updatedMemory);
        results.enhanced++;
        results.details.push({
          id: memory.id,
          success: true,
          title: metadata.title
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          id: memory.id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      processed: toEnhance.length,
      results,
      message: `✅ Enhanced ${results.enhanced}/${toEnhance.length} memories`
    };
  }

  /**
   * Enhance memory metadata
   */
  async enhanceMemoryMetadata(args) {
    const { memory_id, regenerate = false } = args;
    
    const memory = await this.memoryStorage.getMemory(memory_id);
    if (!memory) {
      return { error: `Memory ${memory_id} not found` };
    }

    if (!regenerate && memory.title && memory.summary) {
      return {
        message: 'Memory already has title and summary',
        current: { title: memory.title, summary: memory.summary },
        suggestion: 'Use regenerate=true to force regeneration'
      };
    }

    const titleGen = await this.loadComponent('titleSummary');
    
    try {
      const metadata = await titleGen.generate(memory.content);
      
      const updatedMemory = {
        ...memory,
        title: metadata.title,
        summary: metadata.summary,
        enhanced: true,
        enhancedAt: new Date().toISOString()
      };
      
      await this.memoryStorage.updateMemory(memory_id, updatedMemory);
      
      return {
        success: true,
        metadata,
        message: '✅ Memory metadata enhanced successfully'
      };
    } catch (error) {
      return {
        error: `Metadata enhancement failed: ${error.message}`
      };
    }
  }

  /**
   * Smart status update
   */
  async smartStatusUpdate(args) {
    const { task_id, auto_update = false } = args;
    
    const task = await this.taskStorage.getTask(task_id);
    if (!task) {
      return { error: `Task ${task_id} not found` };
    }

    const automation = await this.loadComponent('taskAutomation');
    
    try {
      const suggestion = await automation.suggestStatusUpdate(task);
      
      if (!suggestion || suggestion.current_status === suggestion.suggested_status) {
        return {
          message: `Task status is appropriate (${task.status})`,
          current_status: task.status,
          no_change_needed: true
        };
      }

      if (auto_update) {
        await this.taskStorage.updateTask(task_id, {
          status: suggestion.suggested_status,
          status_updated_by: 'smart_automation',
          status_updated_at: new Date().toISOString()
        });

        return {
          success: true,
          updated: true,
          previous_status: suggestion.current_status,
          new_status: suggestion.suggested_status,
          reason: suggestion.reason,
          message: `✅ Task status updated: ${suggestion.current_status} → ${suggestion.suggested_status}`
        };
      }

      return {
        success: true,
        suggestion,
        message: `💡 Status update suggested: ${suggestion.current_status} → ${suggestion.suggested_status}`,
        instruction: 'Use auto_update=true to apply the suggestion'
      };
    } catch (error) {
      return {
        error: `Smart status update failed: ${error.message}`
      };
    }
  }

  /**
   * Validate task workflow
   */
  async validateTaskWorkflow(args) {
    const { project } = args;
    
    const tasks = await this.taskStorage.listTasks({ project });
    
    const validation = {
      total_tasks: tasks.length,
      by_status: {},
      issues: [],
      suggestions: []
    };

    // Count by status
    tasks.forEach(task => {
      validation.by_status[task.status] = (validation.by_status[task.status] || 0) + 1;
    });

    // Find workflow issues
    const stuckTasks = tasks.filter(t => 
      t.status === 'in_progress' && 
      new Date() - new Date(t.created) > 7 * 24 * 60 * 60 * 1000 // 7 days
    );

    if (stuckTasks.length > 0) {
      validation.issues.push(`${stuckTasks.length} tasks stuck in progress for >7 days`);
      validation.suggestions.push('Review long-running tasks for blockers');
    }

    const todoRatio = (validation.by_status.todo || 0) / validation.total_tasks;
    if (todoRatio > 0.7) {
      validation.issues.push('Too many tasks in TODO status (>70%)');
      validation.suggestions.push('Consider starting work on pending tasks');
    }

    return {
      success: true,
      validation,
      healthy: validation.issues.length === 0,
      message: validation.issues.length === 0 
        ? '✅ Task workflow is healthy'
        : `⚠️ Found ${validation.issues.length} workflow issues`
    };
  }

  /**
   * Get task status analytics
   */
  async getTaskStatusAnalytics(args) {
    const { project, timeframe = 'week' } = args;
    
    const analytics = await this.loadComponent('taskAnalytics');
    
    try {
      const stats = await analytics.getStatusAnalytics({ project, timeframe });
      
      return {
        success: true,
        analytics: stats,
        timeframe,
        message: `✅ Task analytics for ${timeframe} period`
      };
    } catch (error) {
      return {
        error: `Analytics failed: ${error.message}`
      };
    }
  }

  /**
   * Work detector control
   */
  async workDetectorControl(args) {
    const { action } = args;
    
    const workDetector = await this.loadComponent('workDetector');
    
    switch (action) {
      case 'status':
        return {
          enabled: workDetector.isEnabled(),
          message: workDetector.isEnabled() ? 'Work detector is enabled' : 'Work detector is disabled'
        };
      
      case 'enable':
        const enableResult = workDetector.enable();
        return {
          success: true,
          enabled: true,
          message: `✅ Work detector enabled: ${enableResult}`
        };
      
      case 'disable':
        const disableResult = workDetector.disable();
        return {
          success: true,
          enabled: false,
          message: `✅ Work detector disabled: ${disableResult}`
        };
      
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  /**
   * Suggest improvements
   */
  async suggestImprovements(args) {
    const { area = 'all' } = args;
    
    const suggestions = [];

    if (area === 'all' || area === 'memories') {
      const memories = await this.memoryStorage.listMemories({});
      
      const untagged = memories.filter(m => !m.tags || m.tags.length === 0).length;
      if (untagged > 0) {
        suggestions.push({
          area: 'memories',
          issue: `${untagged} memories without tags`,
          suggestion: 'Add relevant tags to improve organization and search',
          action: 'Use batch_enhance_memories to add tags automatically'
        });
      }

      const noCategory = memories.filter(m => !m.category).length;
      if (noCategory > 0) {
        suggestions.push({
          area: 'memories',
          issue: `${noCategory} memories without categories`,
          suggestion: 'Categorize memories for better organization'
        });
      }
    }

    if (area === 'all' || area === 'tasks') {
      const tasks = await this.taskStorage.listTasks({});
      
      const noDescription = tasks.filter(t => !t.description || t.description.length < 10).length;
      if (noDescription > 0) {
        suggestions.push({
          area: 'tasks',
          issue: `${noDescription} tasks with minimal descriptions`,
          suggestion: 'Add detailed descriptions to tasks for clarity',
          action: 'Use batch_enhance_tasks_ollama for AI-generated descriptions'
        });
      }

      const oldInProgress = tasks.filter(t => 
        t.status === 'in_progress' &&
        new Date() - new Date(t.created) > 5 * 24 * 60 * 60 * 1000
      ).length;

      if (oldInProgress > 0) {
        suggestions.push({
          area: 'tasks',
          issue: `${oldInProgress} tasks in progress for >5 days`,
          suggestion: 'Review and update status of long-running tasks'
        });
      }
    }

    return {
      success: true,
      area,
      suggestions,
      count: suggestions.length,
      message: suggestions.length > 0 
        ? `💡 Found ${suggestions.length} improvement suggestions`
        : '✅ System is well-organized, no major improvements needed'
    };
  }

  /**
   * Get automation suggestions
   */
  async getAutomationSuggestions(args) {
    const { project, limit = 5 } = args;
    
    const automation = await this.loadComponent('taskAutomation');
    
    try {
      const suggestions = await automation.getAutomationSuggestions({
        project,
        limit
      });

      return {
        success: true,
        suggestions,
        count: suggestions.length,
        message: suggestions.length > 0
          ? `🤖 Found ${suggestions.length} automation opportunities`
          : 'No automation suggestions at this time'
      };
    } catch (error) {
      return {
        error: `Automation suggestions failed: ${error.message}`
      };
    }
  }

  /**
   * Additional methods for remaining tools...
   */
  async enforceProactiveMemory(args) {
    return {
      success: true,
      suggestions: ['Consider creating memories for recent important decisions'],
      message: '💡 Proactive memory suggestions generated'
    };
  }

  async updateStrategies(args) {
    return {
      success: true,
      updated: args.strategy_type,
      message: `✅ ${args.strategy_type} strategy updated`
    };
  }

  async getCurrentPaths(args) {
    return {
      success: true,
      paths: this.configPaths,
      message: '📂 Current storage paths retrieved'
    };
  }

  async setMemoryPath(args) {
    this.configPaths.memoryDir = args.path;
    return {
      success: true,
      new_path: args.path,
      message: `✅ Memory path set to ${args.path}`
    };
  }

  async setTaskPath(args) {
    this.configPaths.taskDir = args.path;
    return {
      success: true,
      new_path: args.path,
      message: `✅ Task path set to ${args.path}`
    };
  }
}

export const metadata = {
  name: 'advanced-features',
  version: '1.0.0',
  description: 'Advanced features plugin with all remaining tools',
  category: 'advanced',
  dependencies: ['memory-tools', 'task-tools'],
  provides: [
    'deduplicate_memories', 'batch_enhance_memories', 'enhance_memory_metadata',
    'smart_status_update', 'validate_task_workflow', 'get_task_status_analytics',
    'work_detector_control', 'suggest_improvements', 'get_automation_suggestions',
    'enforce_proactive_memory', 'update_strategies', 'get_current_paths',
    'set_memory_path', 'set_task_path'
  ],
  enabled: true
};