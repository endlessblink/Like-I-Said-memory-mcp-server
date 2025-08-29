/**
 * @name ai-tools-complete
 * @version 1.0.0
 * @description Complete AI tools plugin with lazy loading - includes all AI features from original server
 * @category ai
 * @depends memory-tools
 * @depends task-tools
 * @provides generate_dropoff
 * @provides enhance_memory_ollama
 * @provides batch_enhance_memories_ollama
 * @provides batch_enhance_tasks_ollama
 * @provides check_ollama_status
 * @provides analyze_performance
 */

import fs from 'fs';
import path from 'path';

export default class AIToolsCompletePlugin {
  constructor() {
    this.name = 'ai-tools-complete';
    this.version = '1.0.0';
    this.loaded = false;
    
    // Lazy-loaded dependencies
    this.ollamaClient = null;
    this.dropoffGenerator = null;
    this.titleSummaryGenerator = null;
    this.behavioralAnalyzer = null;
    this.memoryEnrichment = null;
    this.taskAnalytics = null;
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
    this.logger.info('AI Tools Complete plugin initialized');
  }

  /**
   * Lazy load Ollama client
   */
  async loadOllamaClient() {
    if (!this.ollamaClient) {
      try {
        const { OllamaClient } = await import('../lib/ollama-client.js');
        this.ollamaClient = new OllamaClient();
        await this.ollamaClient.initialize();
      } catch (error) {
        this.logger.warn('Failed to load Ollama client:', error.message);
        // Return a mock client for graceful degradation
        this.ollamaClient = {
          isAvailable: () => false,
          enhance: async () => ({ error: 'Ollama not available' }),
          analyze: async () => ({ error: 'Ollama not available' })
        };
      }
    }
    return this.ollamaClient;
  }

  /**
   * Lazy load dropoff generator
   */
  async loadDropoffGenerator() {
    if (!this.dropoffGenerator) {
      try {
        const { DropoffGenerator } = await import('../lib/dropoff-generator.js');
        this.dropoffGenerator = new DropoffGenerator();
      } catch (error) {
        this.logger.warn('Failed to load DropoffGenerator:', error.message);
        this.dropoffGenerator = {
          generate: async () => 'Session dropoff generation not available'
        };
      }
    }
    return this.dropoffGenerator;
  }

  /**
   * Lazy load other AI components as needed
   */
  async loadComponent(componentName) {
    switch (componentName) {
      case 'titleSummary':
        if (!this.titleSummaryGenerator) {
          try {
            const { TitleSummaryGenerator } = await import('../lib/title-summary-generator.js');
            this.titleSummaryGenerator = new TitleSummaryGenerator();
          } catch (error) {
            this.titleSummaryGenerator = { generate: async () => 'Title generation not available' };
          }
        }
        return this.titleSummaryGenerator;

      case 'behavioralAnalyzer':
        if (!this.behavioralAnalyzer) {
          try {
            const { BehavioralAnalyzer } = await import('../lib/behavioral-analyzer.js');
            this.behavioralAnalyzer = new BehavioralAnalyzer();
          } catch (error) {
            this.behavioralAnalyzer = { analyze: async () => 'Behavioral analysis not available' };
          }
        }
        return this.behavioralAnalyzer;

      case 'taskAnalytics':
        if (!this.taskAnalytics) {
          try {
            const { TaskAnalytics } = await import('../lib/task-analytics.js');
            this.taskAnalytics = new TaskAnalytics(this.taskStorage);
          } catch (error) {
            this.taskAnalytics = { analyze: async () => 'Task analytics not available' };
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
        name: 'check_ollama_status',
        description: 'Check if Ollama is available and working',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'enhance_memory_ollama',
        description: 'Use Ollama AI to enhance a memory with better formatting, tags, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'The ID of the memory to enhance'
            },
            model: {
              type: 'string',
              description: 'Ollama model to use (optional)',
              default: 'llama2'
            }
          },
          required: ['memory_id'],
          additionalProperties: false
        }
      },
      {
        name: 'batch_enhance_memories_ollama',
        description: 'Enhance multiple memories using Ollama AI',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to enhance memories from (optional)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of memories to enhance',
              default: 10
            },
            model: {
              type: 'string',
              description: 'Ollama model to use',
              default: 'llama2'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'batch_enhance_tasks_ollama',
        description: 'Enhance multiple tasks using Ollama AI for better descriptions and context',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to enhance tasks from (optional)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to enhance',
              default: 10
            },
            model: {
              type: 'string',
              description: 'Ollama model to use',
              default: 'llama2'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'generate_dropoff',
        description: 'Generate a comprehensive session dropoff document for handoff to another session',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project context for the dropoff'
            },
            includeRecent: {
              type: 'boolean',
              description: 'Include recent memories and tasks',
              default: true
            },
            outputPath: {
              type: 'string',
              description: 'Custom output path for the dropoff file'
            },
            format: {
              type: 'string',
              enum: ['markdown', 'json'],
              description: 'Output format',
              default: 'markdown'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'analyze_performance',
        description: 'Analyze task and memory performance with AI insights',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project to analyze (optional)'
            },
            timeframe: {
              type: 'string',
              enum: ['week', 'month', 'quarter'],
              description: 'Time period for analysis',
              default: 'week'
            },
            includeRecommendations: {
              type: 'boolean',
              description: 'Include AI-generated recommendations',
              default: true
            }
          },
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
        case 'check_ollama_status':
          return await this.checkOllamaStatus();
        
        case 'enhance_memory_ollama':
          return await this.enhanceMemoryOllama(args);
        
        case 'batch_enhance_memories_ollama':
          return await this.batchEnhanceMemoriesOllama(args);
        
        case 'batch_enhance_tasks_ollama':
          return await this.batchEnhanceTasksOllama(args);
        
        case 'generate_dropoff':
          return await this.generateDropoff(args);
        
        case 'analyze_performance':
          return await this.analyzePerformance(args);
        
        default:
          throw new Error(`Unknown AI tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`AI tool error (${name}):`, error);
      return {
        error: `AI tool ${name} failed: ${error.message}`,
        suggestion: 'Check Ollama installation and try again'
      };
    }
  }

  /**
   * Check Ollama status
   */
  async checkOllamaStatus() {
    const ollama = await this.loadOllamaClient();
    
    const status = {
      available: ollama.isAvailable(),
      timestamp: new Date().toISOString()
    };

    if (status.available) {
      try {
        // Test with a simple prompt
        const testResult = await ollama.chat('test', 'Say "OK" if you receive this');
        status.working = testResult && !testResult.error;
        status.models = await ollama.listModels();
      } catch (error) {
        status.working = false;
        status.error = error.message;
      }
    }

    return {
      status: status.available ? (status.working ? 'working' : 'error') : 'unavailable',
      details: status,
      message: status.available 
        ? (status.working ? '✅ Ollama is available and working' : '⚠️ Ollama available but not responding')
        : '❌ Ollama is not available'
    };
  }

  /**
   * Enhance memory with Ollama
   */
  async enhanceMemoryOllama(args) {
    const { memory_id, model = 'llama2' } = args;
    
    const memory = await this.memoryStorage.getMemory(memory_id);
    if (!memory) {
      return { error: `Memory ${memory_id} not found` };
    }

    const ollama = await this.loadOllamaClient();
    if (!ollama.isAvailable()) {
      return { error: 'Ollama is not available' };
    }

    const enhancementPrompt = `
Please analyze this memory content and suggest improvements:

Content: ${memory.content}
Current tags: ${memory.tags?.join(', ') || 'none'}
Current category: ${memory.category || 'none'}

Provide:
1. Better tags (5-8 relevant tags)
2. Appropriate category
3. Enhanced title (max 60 chars)
4. Brief summary (max 150 chars)
5. Any missing context or improvements

Format as JSON: {
  "tags": ["tag1", "tag2", ...],
  "category": "category",
  "title": "enhanced title",
  "summary": "brief summary",
  "improvements": "suggested improvements"
}
`;

    const result = await ollama.chat(model, enhancementPrompt);
    
    if (result.error) {
      return { error: `Ollama enhancement failed: ${result.error}` };
    }

    try {
      const enhancement = JSON.parse(result.response);
      
      // Update memory with enhancements
      const updatedMemory = {
        ...memory,
        tags: enhancement.tags || memory.tags,
        category: enhancement.category || memory.category,
        title: enhancement.title || memory.title,
        summary: enhancement.summary || memory.summary,
        enhanced: true,
        enhancedAt: new Date().toISOString()
      };
      
      await this.memoryStorage.updateMemory(memory_id, updatedMemory);
      
      return {
        success: true,
        enhanced: updatedMemory,
        improvements: enhancement.improvements,
        message: '✅ Memory enhanced with Ollama AI'
      };
    } catch (error) {
      return {
        error: 'Failed to parse Ollama response',
        raw_response: result.response
      };
    }
  }

  /**
   * Batch enhance memories
   */
  async batchEnhanceMemoriesOllama(args) {
    const { project, limit = 10, model = 'llama2' } = args;
    
    const memories = await this.memoryStorage.listMemories({ project });
    const toEnhance = memories
      .filter(m => !m.enhanced) // Only enhance unenhanced memories
      .slice(0, limit);

    if (toEnhance.length === 0) {
      return {
        message: 'No memories found that need enhancement',
        processed: 0
      };
    }

    const results = {
      processed: 0,
      enhanced: 0,
      errors: 0,
      details: []
    };

    for (const memory of toEnhance) {
      const result = await this.enhanceMemoryOllama({
        memory_id: memory.id,
        model
      });

      results.processed++;
      
      if (result.success) {
        results.enhanced++;
      } else {
        results.errors++;
      }
      
      results.details.push({
        id: memory.id,
        title: memory.title || memory.content.substring(0, 50),
        success: !!result.success,
        error: result.error
      });

      // Small delay to avoid overwhelming Ollama
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      summary: `Enhanced ${results.enhanced}/${results.processed} memories`,
      results,
      message: `✅ Batch enhancement completed: ${results.enhanced} enhanced, ${results.errors} errors`
    };
  }

  /**
   * Batch enhance tasks
   */
  async batchEnhanceTasksOllama(args) {
    const { project, limit = 10, model = 'llama2' } = args;
    
    const tasks = await this.taskStorage.listTasks({ project });
    const toEnhance = tasks
      .filter(t => !t.enhanced && (!t.description || t.description.length < 50))
      .slice(0, limit);

    const ollama = await this.loadOllamaClient();
    if (!ollama.isAvailable()) {
      return { error: 'Ollama is not available' };
    }

    const results = {
      processed: 0,
      enhanced: 0,
      errors: 0,
      details: []
    };

    for (const task of toEnhance) {
      try {
        const enhancementPrompt = `
Analyze this task and provide improvements:

Title: ${task.title}
Description: ${task.description || 'none'}
Status: ${task.status}
Priority: ${task.priority || 'medium'}

Provide as JSON:
{
  "description": "enhanced description (100-200 chars)",
  "tags": ["relevant", "tags"],
  "category": "appropriate category",
  "improvements": "suggested improvements"
}
`;

        const result = await ollama.chat(model, enhancementPrompt);
        
        if (result.error) {
          results.errors++;
          results.details.push({
            id: task.id,
            title: task.title,
            success: false,
            error: result.error
          });
          continue;
        }

        const enhancement = JSON.parse(result.response);
        
        const updatedTask = {
          ...task,
          description: enhancement.description || task.description,
          tags: enhancement.tags || task.tags,
          category: enhancement.category || task.category,
          enhanced: true,
          enhancedAt: new Date().toISOString()
        };
        
        await this.taskStorage.updateTask(task.id, updatedTask);
        
        results.enhanced++;
        results.details.push({
          id: task.id,
          title: task.title,
          success: true,
          improvements: enhancement.improvements
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          id: task.id,
          title: task.title,
          success: false,
          error: error.message
        });
      }
      
      results.processed++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      summary: `Enhanced ${results.enhanced}/${results.processed} tasks`,
      results,
      message: `✅ Task batch enhancement completed: ${results.enhanced} enhanced, ${results.errors} errors`
    };
  }

  /**
   * Generate session dropoff
   */
  async generateDropoff(args) {
    const { project, includeRecent = true, outputPath, format = 'markdown' } = args;
    
    const dropoffGenerator = await this.loadDropoffGenerator();
    
    try {
      const dropoff = await dropoffGenerator.generate({
        project,
        includeRecent,
        format,
        memoryStorage: this.memoryStorage,
        taskStorage: this.taskStorage
      });

      // Save to file if path provided
      if (outputPath) {
        const fullPath = path.resolve(outputPath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, dropoff, 'utf8');
        
        return {
          success: true,
          dropoff,
          saved_to: fullPath,
          message: `✅ Session dropoff generated and saved to ${fullPath}`
        };
      }

      return {
        success: true,
        dropoff,
        message: '✅ Session dropoff generated successfully'
      };
    } catch (error) {
      return {
        error: `Dropoff generation failed: ${error.message}`,
        suggestion: 'Check that memories and tasks exist for the specified project'
      };
    }
  }

  /**
   * Analyze performance with AI
   */
  async analyzePerformance(args) {
    const { project, timeframe = 'week', includeRecommendations = true } = args;
    
    const taskAnalytics = await this.loadComponent('taskAnalytics');
    
    // Get basic analytics
    const analytics = await taskAnalytics.analyze({ project, timeframe });
    
    if (!includeRecommendations) {
      return {
        success: true,
        analytics,
        message: '✅ Performance analysis completed'
      };
    }

    // Add AI recommendations
    const ollama = await this.loadOllamaClient();
    if (ollama.isAvailable()) {
      try {
        const prompt = `
Analyze this productivity data and provide recommendations:

${JSON.stringify(analytics, null, 2)}

Provide actionable recommendations for:
1. Improving task completion rates
2. Better time management
3. Priority optimization
4. Workflow improvements

Format as JSON: {
  "recommendations": ["rec1", "rec2", ...],
  "insights": ["insight1", "insight2", ...],
  "score": 1-10
}
`;

        const aiResult = await ollama.chat('llama2', prompt);
        if (!aiResult.error) {
          const aiAnalysis = JSON.parse(aiResult.response);
          analytics.ai_recommendations = aiAnalysis.recommendations;
          analytics.ai_insights = aiAnalysis.insights;
          analytics.ai_score = aiAnalysis.score;
        }
      } catch (error) {
        this.logger.warn('Failed to get AI recommendations:', error.message);
      }
    }

    return {
      success: true,
      analytics,
      message: '✅ AI-powered performance analysis completed'
    };
  }
}

export const metadata = {
  name: 'ai-tools-complete',
  version: '1.0.0',
  description: 'Complete AI tools plugin with lazy loading',
  category: 'ai',
  dependencies: ['memory-tools', 'task-tools'],
  provides: [
    'generate_dropoff', 'enhance_memory_ollama', 'batch_enhance_memories_ollama',
    'batch_enhance_tasks_ollama', 'check_ollama_status', 'analyze_performance'
  ],
  enabled: true
};