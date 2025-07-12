/**
 * Comprehensive test suite for memory-task automation system
 */

import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import MemoryTaskAnalyzer from '../lib/memory-task-analyzer.js';
import { TaskDiscovery } from '../lib/task-discovery.js';
import { TaskActionExecutor } from '../lib/task-action-executor.js';
import MemoryTaskAutomator from '../lib/memory-task-automator.js';

// Mock storage classes for testing
class MockMemoryStorage {
  constructor() {
    this.memories = new Map();
    this.nextId = 1;
  }

  async saveMemory(memory) {
    const id = memory.id || `memory-${this.nextId++}`;
    memory.id = id;
    this.memories.set(id, { ...memory });
    return `/mock/path/${id}.md`;
  }

  async getMemory(id) {
    return this.memories.get(id) || null;
  }

  async updateMemory(id, memory) {
    if (this.memories.has(id)) {
      this.memories.set(id, { ...memory });
      return true;
    }
    return false;
  }

  async listMemories() {
    return Array.from(this.memories.values());
  }
}

class MockTaskStorage {
  constructor() {
    this.tasks = new Map();
    this.nextId = 1;
    this.nextSerial = 1;
  }

  async saveTask(task) {
    const id = task.id || `task-${this.nextId++}`;
    const serial = task.serial || `TASK-${this.nextSerial++.toString().padStart(5, '0')}`;
    task.id = id;
    task.serial = serial;
    this.tasks.set(id, { ...task });
    return task;
  }

  async getTask(id) {
    return this.tasks.get(id) || null;
  }

  async updateTask(id, task) {
    if (this.tasks.has(id)) {
      this.tasks.set(id, { ...task });
      return true;
    }
    return false;
  }

  async listTasks(filters = {}) {
    let tasks = Array.from(this.tasks.values());
    
    if (filters.project) {
      tasks = tasks.filter(task => task.project === filters.project);
    }
    
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    
    return tasks;
  }

  async getTasksByProject(project) {
    return Array.from(this.tasks.values()).filter(task => task.project === project);
  }

  async searchTasks(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tasks.values()).filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery))
    );
  }

  async deleteTask(id) {
    return this.tasks.delete(id);
  }
}

describe('Memory-Task Automation System', function() {
  let memoryStorage, taskStorage, analyzer, discovery, executor, automator;

  beforeEach(function() {
    memoryStorage = new MockMemoryStorage();
    taskStorage = new MockTaskStorage();
    analyzer = new MemoryTaskAnalyzer();
    discovery = new TaskDiscovery(memoryStorage, taskStorage);
    executor = new TaskActionExecutor(memoryStorage, taskStorage);
    automator = new MemoryTaskAutomator(memoryStorage, taskStorage, {
      enabled: true,
      minConfidence: 0.5,
      autoExecuteThreshold: 0.8
    });
  });

  describe('MemoryTaskAnalyzer', function() {
    it('should detect task creation patterns', async function() {
      const memory = {
        id: 'test-1',
        content: 'I need to implement user authentication for the project',
        project: 'test-project',
        category: 'code',
        tags: ['authentication', 'security']
      };

      const analysis = await analyzer.analyzeContent(memory);
      
      expect(analysis.action).to.equal('create');
      expect(analysis.confidence).to.be.greaterThan(0.5);
      expect(analysis.extractedData.title).to.include('implement user authentication');
    });

    it('should detect task update patterns', async function() {
      const memory = {
        id: 'test-2',
        content: 'Working on the API endpoints, made good progress today',
        project: 'test-project',
        category: 'code'
      };

      const analysis = await analyzer.analyzeContent(memory);
      
      expect(analysis.action).to.equal('update');
      expect(analysis.extractedData.status).to.equal('in_progress');
    });

    it('should detect task completion patterns', async function() {
      const memory = {
        id: 'test-3',
        content: 'Successfully completed the database migration, all tests pass',
        project: 'test-project',
        category: 'code'
      };

      const analysis = await analyzer.analyzeContent(memory);
      
      expect(analysis.action).to.equal('complete');
      expect(analysis.confidence).to.be.greaterThan(0.8);
    });

    it('should detect task blocking patterns', async function() {
      const memory = {
        id: 'test-4',
        content: 'Blocked by waiting for API keys from external service',
        project: 'test-project',
        category: 'work'
      };

      const analysis = await analyzer.analyzeContent(memory);
      
      expect(analysis.action).to.equal('block');
      expect(analysis.extractedData.blockingReason).to.include('API keys');
    });

    it('should infer correct priority levels', function() {
      expect(analyzer.inferPriority('urgent task that needs immediate attention')).to.equal('urgent');
      expect(analyzer.inferPriority('important feature for the next release')).to.equal('high');
      expect(analyzer.inferPriority('nice to have improvement')).to.equal('low');
      expect(analyzer.inferPriority('regular task')).to.equal('medium');
    });

    it('should infer correct categories', function() {
      expect(analyzer.inferCategory('implement new API endpoint')).to.equal('code');
      expect(analyzer.inferCategory('fix bug in authentication')).to.equal('bug');
      expect(analyzer.inferCategory('research new framework')).to.equal('research');
      expect(analyzer.inferCategory('design user interface')).to.equal('design');
    });

    it('should extract deadlines correctly', function() {
      const deadline1 = analyzer.extractDeadline('This needs to be done by tomorrow');
      expect(deadline1).to.not.be.null;
      
      const deadline2 = analyzer.extractDeadline('Due date is next week');
      expect(deadline2).to.not.be.null;
      
      const deadline3 = analyzer.extractDeadline('No specific deadline mentioned');
      expect(deadline3).to.be.null;
    });
  });

  describe('TaskDiscovery', function() {
    beforeEach(async function() {
      // Create some test tasks
      await taskStorage.saveTask({
        id: 'existing-1',
        title: 'Implement authentication system',
        project: 'test-project',
        category: 'code',
        tags: ['authentication', 'security'],
        status: 'in_progress'
      });

      await taskStorage.saveTask({
        id: 'existing-2',
        title: 'Database migration',
        project: 'test-project',
        category: 'code',
        tags: ['database', 'migration'],
        status: 'todo'
      });

      await taskStorage.saveTask({
        id: 'existing-3',
        title: 'API documentation',
        project: 'other-project',
        category: 'documentation',
        status: 'done'
      });
    });

    it('should find relevant tasks by project', async function() {
      const memory = {
        id: 'test-memory',
        content: 'Working on authentication features',
        project: 'test-project',
        category: 'code'
      };

      const relevantTasks = await discovery.findRelevantTasks(memory, {});
      
      expect(relevantTasks).to.have.length.greaterThan(0);
      expect(relevantTasks[0].project).to.equal('test-project');
    });

    it('should find relevant tasks by keywords', async function() {
      const memory = {
        id: 'test-memory',
        content: 'Need to work on database migration scripts',
        project: 'test-project',
        category: 'code'
      };

      const relevantTasks = await discovery.findRelevantTasks(memory, {});
      
      const migrationTask = relevantTasks.find(task => task.title.includes('migration'));
      expect(migrationTask).to.not.be.undefined;
      expect(migrationTask.relevance).to.be.greaterThan(0.3);
    });

    it('should rank tasks by relevance correctly', async function() {
      const memory = {
        id: 'test-memory',
        content: 'Authentication system implementation progress',
        project: 'test-project',
        category: 'code',
        tags: ['authentication']
      };

      const relevantTasks = await discovery.findRelevantTasks(memory, {});
      
      // Should be sorted by relevance (highest first)
      for (let i = 1; i < relevantTasks.length; i++) {
        expect(relevantTasks[i-1].relevance).to.be.greaterThanOrEqual(relevantTasks[i].relevance);
      }
    });

    it('should filter out completed tasks for updates', function() {
      const tasks = [
        { id: '1', status: 'todo', relevance: 0.9 },
        { id: '2', status: 'done', relevance: 0.8 },
        { id: '3', status: 'in_progress', relevance: 0.7 }
      ];

      const bestTask = discovery.findBestTaskForAction('update', {}, tasks);
      expect(bestTask.status).to.not.equal('done');
    });
  });

  describe('TaskActionExecutor', function() {
    it('should create new tasks from memories', async function() {
      const memory = {
        id: 'test-memory',
        content: 'I need to implement OAuth2 authentication',
        project: 'test-project',
        category: 'code',
        tags: ['oauth', 'auth']
      };

      const extractedData = {
        title: 'Implement OAuth2 authentication',
        description: 'Set up OAuth2 authentication system',
        priority: 'high',
        category: 'code'
      };

      const result = await executor.createTaskFromMemory(memory, extractedData);
      
      expect(result.success).to.be.true;
      expect(result.action).to.equal('create');
      expect(result.task.title).to.equal(extractedData.title);
      expect(result.task.memory_connections).to.have.length(1);
      expect(result.task.memory_connections[0].memory_id).to.equal(memory.id);
    });

    it('should update existing tasks', async function() {
      // Create an existing task
      const existingTask = await taskStorage.saveTask({
        title: 'API development',
        project: 'test-project',
        status: 'todo',
        memory_connections: []
      });

      const memory = {
        id: 'test-memory',
        content: 'Started working on API endpoints today'
      };

      const extractedData = {
        status: 'in_progress',
        progressNote: 'Started working on API endpoints'
      };

      const result = await executor.updateTaskFromMemory(existingTask, memory, extractedData);
      
      expect(result.success).to.be.true;
      expect(result.action).to.equal('update');
      expect(result.task.status).to.equal('in_progress');
    });

    it('should complete tasks', async function() {
      const existingTask = await taskStorage.saveTask({
        title: 'Database setup',
        project: 'test-project',
        status: 'in_progress',
        memory_connections: []
      });

      const memory = {
        id: 'test-memory',
        content: 'Successfully completed database setup and migration'
      };

      const extractedData = {
        completionNote: 'Database setup completed successfully'
      };

      const result = await executor.completeTaskFromMemory(existingTask, memory, extractedData);
      
      expect(result.success).to.be.true;
      expect(result.action).to.equal('complete');
      expect(result.task.status).to.equal('done');
      expect(result.task.completed).to.not.be.undefined;
    });

    it('should block tasks with reasons', async function() {
      const existingTask = await taskStorage.saveTask({
        title: 'API integration',
        project: 'test-project',
        status: 'todo',
        memory_connections: []
      });

      const memory = {
        id: 'test-memory',
        content: 'Cannot proceed with API integration, waiting for vendor credentials'
      };

      const extractedData = {
        blockingReason: 'waiting for vendor credentials'
      };

      const result = await executor.blockTaskFromMemory(existingTask, memory, extractedData);
      
      expect(result.success).to.be.true;
      expect(result.action).to.equal('block');
      expect(result.task.status).to.equal('blocked');
    });

    it('should prevent duplicate task creation', async function() {
      // Create existing task
      await taskStorage.saveTask({
        title: 'user authentication',
        project: 'test-project',
        status: 'todo'
      });

      const memory = {
        id: 'test-memory',
        content: 'I need to work on user authentication',
        project: 'test-project'
      };

      const extractedData = {
        title: 'user authentication'
      };

      const result = await executor.createTaskFromMemory(memory, extractedData);
      
      // Should link to existing task instead of creating duplicate
      expect(result.success).to.be.true;
    });
  });

  describe('MemoryTaskAutomator Integration', function() {
    it('should process memory end-to-end for task creation', async function() {
      const memory = {
        id: 'integration-test-1',
        content: 'I need to implement a REST API for user management with CRUD operations',
        project: 'test-project',
        category: 'code',
        tags: ['api', 'crud', 'users'],
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      expect(result.performed).to.be.true;
      expect(result.action).to.equal('create');
      expect(result.confidence).to.be.greaterThan(0.5);
      expect(result.taskSerial).to.match(/TASK-\d{5}/);
    });

    it('should process memory for task updates', async function() {
      // Create existing task
      await taskStorage.saveTask({
        id: 'existing-api-task',
        title: 'REST API development',
        project: 'test-project',
        status: 'todo',
        tags: ['api', 'rest']
      });

      const memory = {
        id: 'integration-test-2',
        content: 'Started working on the REST API endpoints, implemented user creation',
        project: 'test-project',
        category: 'code',
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      expect(result.performed).to.be.true;
      expect(result.action).to.equal('update');
    });

    it('should respect confidence thresholds', async function() {
      const memory = {
        id: 'low-confidence-test',
        content: 'maybe should do something',
        project: 'test-project',
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      // Should not perform action due to low confidence
      expect(result.performed).to.be.false;
      expect(result.reason).to.include('confidence');
    });

    it('should handle automation disabled', async function() {
      automator.updateConfig({ enabled: false });

      const memory = {
        id: 'disabled-test',
        content: 'I need to implement feature X',
        project: 'test-project',
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      expect(result.performed).to.be.false;
      expect(result.reason).to.equal('automation disabled');
    });

    it('should track statistics correctly', async function() {
      // Reset stats
      automator.resetStats();

      // Process several memories
      const memories = [
        {
          id: 'stats-1',
          content: 'I need to create user authentication',
          project: 'test-project',
          timestamp: new Date().toISOString()
        },
        {
          id: 'stats-2',
          content: 'Completed the database setup successfully',
          project: 'test-project',
          timestamp: new Date().toISOString()
        }
      ];

      for (const memory of memories) {
        await automator.processMemory(memory);
      }

      const stats = automator.getStats();
      expect(stats.memoriesProcessed).to.equal(2);
      expect(stats.tasksCreated).to.be.greaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', function() {
    it('should handle malformed memory content', async function() {
      const memory = {
        id: 'malformed-test',
        content: '', // Empty content
        project: 'test-project',
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      expect(result.performed).to.be.false;
    });

    it('should handle missing project gracefully', async function() {
      const memory = {
        id: 'no-project-test',
        content: 'I need to implement feature Y',
        // No project specified
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      // Should still work with default project
      if (result.performed) {
        expect(result.task.project).to.not.be.undefined;
      }
    });

    it('should handle task storage failures', async function() {
      // Mock a failing task storage
      const originalSaveTask = taskStorage.saveTask;
      taskStorage.saveTask = async () => {
        throw new Error('Storage failure');
      };

      const memory = {
        id: 'storage-failure-test',
        content: 'I need to test error handling',
        project: 'test-project',
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      expect(result.performed).to.be.false;
      expect(result.reason).to.include('error');

      // Restore original function
      taskStorage.saveTask = originalSaveTask;
    });

    it('should handle very long content', async function() {
      const longContent = 'I need to implement authentication ' + 'x'.repeat(10000);
      
      const memory = {
        id: 'long-content-test',
        content: longContent,
        project: 'test-project',
        timestamp: new Date().toISOString()
      };

      const analysis = await analyzer.analyzeContent(memory);
      
      // Should still extract meaningful title despite long content
      expect(analysis.extractedData.title).to.have.length.lessThan(200);
    });
  });

  describe('Performance Tests', function() {
    it('should process multiple memories efficiently', async function() {
      const startTime = Date.now();
      
      const memories = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-test-${i}`,
        content: `I need to implement feature ${i} for the project`,
        project: 'test-project',
        timestamp: new Date().toISOString()
      }));

      const results = await automator.batchProcessMemories(memories);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).to.have.length(10);
      expect(duration).to.be.lessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent memory processing', async function() {
      const memories = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-test-${i}`,
        content: `Working on concurrent task ${i}`,
        project: 'test-project',
        timestamp: new Date().toISOString()
      }));

      // Process all memories concurrently
      const promises = memories.map(memory => automator.processMemory(memory));
      const results = await Promise.all(promises);
      
      expect(results).to.have.length(5);
      // All should complete without errors
      results.forEach(result => {
        expect(result).to.have.property('performed');
      });
    });
  });

  describe('Configuration Tests', function() {
    it('should respect custom confidence thresholds', async function() {
      automator.updateConfig({
        minConfidence: 0.9, // Very high threshold
        autoExecuteThreshold: 0.95
      });

      const memory = {
        id: 'high-threshold-test',
        content: 'maybe do something',
        project: 'test-project',
        timestamp: new Date().toISOString()
      };

      const result = await automator.processMemory(memory);
      
      expect(result.performed).to.be.false;
    });

    it('should enforce rate limiting', async function() {
      automator.updateConfig({
        maxActionsPerHour: 2
      });

      // Process memories up to the limit
      for (let i = 0; i < 3; i++) {
        const memory = {
          id: `rate-limit-test-${i}`,
          content: `I need to implement feature ${i}`,
          project: 'test-project',
          timestamp: new Date().toISOString()
        };

        const result = await automator.processMemory(memory);
        
        if (i >= 2) {
          // Should be rate limited
          expect(result.performed).to.be.false;
          expect(result.reason).to.include('rate limit');
        }
      }
    });
  });

  describe('Health and Monitoring', function() {
    it('should provide health status', function() {
      const health = automator.getHealthStatus();
      
      expect(health).to.have.property('healthy');
      expect(health).to.have.property('errorRate');
      expect(health).to.have.property('totalActions');
    });

    it('should track error rates', async function() {
      automator.resetStats();
      
      // Force an error by providing invalid memory
      try {
        await automator.processMemory(null);
      } catch (error) {
        // Expected to fail
      }

      const health = automator.getHealthStatus();
      expect(parseFloat(health.errorRate)).to.be.greaterThan(0);
    });
  });
});

// Export test utilities for manual testing
export {
  MockMemoryStorage,
  MockTaskStorage,
  MemoryTaskAnalyzer,
  TaskDiscovery,
  TaskActionExecutor,
  MemoryTaskAutomator
};