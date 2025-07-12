/**
 * Manual test scenarios for memory-task automation
 * These can be run interactively to test specific patterns
 */

import MemoryTaskAutomator from '../lib/memory-task-automator.js';
import { TaskStorage } from '../lib/task-storage.js';

// Mock storage for manual testing
class SimpleMemoryStorage {
  constructor() {
    this.memories = new Map();
  }

  async saveMemory(memory) {
    this.memories.set(memory.id, memory);
    return `/mock/${memory.id}.md`;
  }

  async getMemory(id) {
    return this.memories.get(id) || null;
  }

  async updateMemory(id, memory) {
    this.memories.set(id, memory);
    return true;
  }

  async listMemories() {
    return Array.from(this.memories.values());
  }
}

class ManualTestScenarios {
  constructor() {
    this.memoryStorage = new SimpleMemoryStorage();
    this.taskStorage = new TaskStorage('test-tasks', this.memoryStorage);
    this.automator = new MemoryTaskAutomator(this.memoryStorage, this.taskStorage, {
      enabled: true,
      minConfidence: 0.3, // Lower for testing
      autoExecuteThreshold: 0.7,
      logAutomatedActions: true
    });
  }

  async testScenario(name, memory) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING SCENARIO: ${name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Memory Content: "${memory.content}"`);
    console.log(`Project: ${memory.project || 'default'}`);
    console.log(`Category: ${memory.category || 'general'}`);
    console.log(`Tags: ${JSON.stringify(memory.tags || [])}`);
    console.log('-'.repeat(60));

    try {
      const result = await this.automator.processMemory({
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...memory
      });

      console.log('RESULT:');
      console.log(`  Performed: ${result.performed}`);
      
      if (result.performed) {
        console.log(`  Action: ${result.action}`);
        console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`  Message: ${result.message}`);
        
        if (result.taskSerial) {
          console.log(`  Task: ${result.taskSerial}`);
        }
      } else {
        console.log(`  Reason: ${result.reason}`);
      }

      return result;
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
      return { performed: false, error: error.message };
    }
  }

  async runTaskCreationScenarios() {
    console.log('\n🔧 TESTING TASK CREATION PATTERNS');
    
    const scenarios = [
      {
        name: 'Explicit TODO Statement',
        memory: {
          content: 'I need to implement user authentication with JWT tokens for the API',
          project: 'web-app',
          category: 'code',
          tags: ['authentication', 'jwt', 'api']
        }
      },
      {
        name: 'Bug Report Pattern',
        memory: {
          content: 'Bug: Users cannot log in after password reset, need to fix the password reset flow',
          project: 'web-app',
          category: 'code',
          tags: ['bug', 'password-reset', 'authentication']
        }
      },
      {
        name: 'Feature Request',
        memory: {
          content: 'Feature: Add real-time notifications for user messages using WebSocket connection',
          project: 'web-app',
          category: 'code',
          tags: ['feature', 'notifications', 'websocket']
        }
      },
      {
        name: 'Research Task',
        memory: {
          content: 'Need to research and evaluate different state management solutions for React app',
          project: 'web-app',
          category: 'research',
          tags: ['research', 'react', 'state-management']
        }
      },
      {
        name: 'Urgent Task',
        memory: {
          content: 'URGENT: Security vulnerability found in authentication system, must patch immediately',
          project: 'web-app',
          category: 'code',
          tags: ['urgent', 'security', 'authentication']
        }
      },
      {
        name: 'Documentation Task',
        memory: {
          content: 'Should document the new API endpoints with examples and usage guidelines',
          project: 'web-app',
          category: 'documentation',
          tags: ['docs', 'api', 'examples']
        }
      }
    ];

    for (const scenario of scenarios) {
      await this.testScenario(scenario.name, scenario.memory);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    }
  }

  async runTaskUpdateScenarios() {
    console.log('\n📝 TESTING TASK UPDATE PATTERNS');
    
    // First create some tasks to update
    await this.taskStorage.saveTask({
      id: 'task-auth',
      title: 'Implement authentication system',
      project: 'web-app',
      status: 'todo',
      tags: ['authentication', 'security']
    });

    await this.taskStorage.saveTask({
      id: 'task-api',
      title: 'Build REST API endpoints',
      project: 'web-app',
      status: 'in_progress',
      tags: ['api', 'rest', 'backend']
    });

    const scenarios = [
      {
        name: 'Progress Update',
        memory: {
          content: 'Working on the authentication system, implemented basic login/logout functionality',
          project: 'web-app',
          category: 'code',
          tags: ['authentication', 'progress', 'login']
        }
      },
      {
        name: 'Continuing Work',
        memory: {
          content: 'Continuing work on REST API endpoints, added user CRUD operations today',
          project: 'web-app',
          category: 'code',
          tags: ['api', 'crud', 'users', 'progress']
        }
      },
      {
        name: 'Testing Phase',
        memory: {
          content: 'Started testing the authentication system with unit tests and integration tests',
          project: 'web-app',
          category: 'code',
          tags: ['authentication', 'testing', 'unit-tests']
        }
      },
      {
        name: 'Debugging Session',
        memory: {
          content: 'Debugging issues with API response formatting, fixing JSON serialization problems',
          project: 'web-app',
          category: 'code',
          tags: ['api', 'debugging', 'json', 'serialization']
        }
      }
    ];

    for (const scenario of scenarios) {
      await this.testScenario(scenario.name, scenario.memory);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async runTaskCompletionScenarios() {
    console.log('\n✅ TESTING TASK COMPLETION PATTERNS');
    
    // Create tasks that can be completed
    await this.taskStorage.saveTask({
      id: 'task-migration',
      title: 'Database migration for user profiles',
      project: 'web-app',
      status: 'in_progress',
      tags: ['database', 'migration', 'users']
    });

    await this.taskStorage.saveTask({
      id: 'task-deployment',
      title: 'Deploy application to production',
      project: 'web-app',
      status: 'in_progress',
      tags: ['deployment', 'production', 'devops']
    });

    const scenarios = [
      {
        name: 'Successful Completion',
        memory: {
          content: 'Successfully completed the database migration for user profiles, all tests pass',
          project: 'web-app',
          category: 'code',
          tags: ['database', 'migration', 'completed', 'success']
        }
      },
      {
        name: 'Deployment Complete',
        memory: {
          content: 'Finished deploying the application to production, everything is working correctly',
          project: 'web-app',
          category: 'devops',
          tags: ['deployment', 'production', 'completed']
        }
      },
      {
        name: 'Task Done with Details',
        memory: {
          content: 'Done with API documentation, wrote comprehensive guides with examples and published to dev portal',
          project: 'web-app',
          category: 'documentation',
          tags: ['documentation', 'api', 'completed', 'published']
        }
      },
      {
        name: 'Fixed and Resolved',
        memory: {
          content: 'Fixed the authentication bug, users can now login properly after password reset',
          project: 'web-app',
          category: 'code',
          tags: ['authentication', 'bug', 'fixed', 'resolved']
        }
      }
    ];

    for (const scenario of scenarios) {
      await this.testScenario(scenario.name, scenario.memory);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async runTaskBlockingScenarios() {
    console.log('\n🚫 TESTING TASK BLOCKING PATTERNS');
    
    // Create tasks that can be blocked
    await this.taskStorage.saveTask({
      id: 'task-integration',
      title: 'Third-party API integration',
      project: 'web-app',
      status: 'todo',
      tags: ['api', 'integration', 'third-party']
    });

    await this.taskStorage.saveTask({
      id: 'task-payment',
      title: 'Payment processing implementation',
      project: 'web-app',
      status: 'in_progress',
      tags: ['payment', 'stripe', 'processing']
    });

    const scenarios = [
      {
        name: 'Waiting for External Resources',
        memory: {
          content: 'Blocked by waiting for API keys and documentation from third-party vendor',
          project: 'web-app',
          category: 'work',
          tags: ['api', 'integration', 'blocked', 'vendor']
        }
      },
      {
        name: 'Dependency Issue',
        memory: {
          content: 'Cannot proceed with payment processing, waiting for legal approval of terms',
          project: 'web-app',
          category: 'work',
          tags: ['payment', 'legal', 'approval', 'blocked']
        }
      },
      {
        name: 'Technical Blocker',
        memory: {
          content: 'Stuck on database performance issue, need help from senior developer',
          project: 'web-app',
          category: 'code',
          tags: ['database', 'performance', 'help-needed', 'stuck']
        }
      },
      {
        name: 'Missing Information',
        memory: {
          content: 'Need clarification from product team on user requirements before proceeding',
          project: 'web-app',
          category: 'work',
          tags: ['requirements', 'product', 'clarification', 'blocked']
        }
      }
    ];

    for (const scenario of scenarios) {
      await this.testScenario(scenario.name, scenario.memory);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async runEdgeCaseScenarios() {
    console.log('\n⚠️ TESTING EDGE CASES AND LOW CONFIDENCE');
    
    const scenarios = [
      {
        name: 'Vague Content',
        memory: {
          content: 'maybe should do something later',
          project: 'web-app',
          category: 'general'
        }
      },
      {
        name: 'Very Short Content',
        memory: {
          content: 'fix bug',
          project: 'web-app',
          category: 'code'
        }
      },
      {
        name: 'No Clear Action',
        memory: {
          content: 'Had a meeting about the project, discussed various options and possibilities',
          project: 'web-app',
          category: 'work'
        }
      },
      {
        name: 'Question Format',
        memory: {
          content: 'Should we implement real-time features or focus on performance optimization?',
          project: 'web-app',
          category: 'planning'
        }
      },
      {
        name: 'Past Tense Reflection',
        memory: {
          content: 'Yesterday I thought about implementing caching, but decided against it',
          project: 'web-app',
          category: 'planning'
        }
      },
      {
        name: 'Multiple Actions Mixed',
        memory: {
          content: 'I need to fix the login bug and also implement new dashboard features and deploy to staging',
          project: 'web-app',
          category: 'code',
          tags: ['bug', 'feature', 'deployment']
        }
      }
    ];

    for (const scenario of scenarios) {
      await this.testScenario(scenario.name, scenario.memory);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async runPerformanceTest() {
    console.log('\n⚡ TESTING PERFORMANCE WITH MULTIPLE MEMORIES');
    
    const memories = Array.from({ length: 20 }, (_, i) => ({
      content: `I need to implement feature ${i} for the project with specific requirements`,
      project: 'performance-test',
      category: 'code',
      tags: [`feature-${i}`, 'implementation']
    }));

    console.log(`Processing ${memories.length} memories...`);
    const startTime = Date.now();
    
    const results = await this.automator.batchProcessMemories(
      memories.map((memory, i) => ({
        id: `perf-test-${i}`,
        timestamp: new Date().toISOString(),
        ...memory
      }))
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`PERFORMANCE RESULTS:`);
    console.log(`  Total time: ${duration}ms`);
    console.log(`  Average per memory: ${(duration / memories.length).toFixed(1)}ms`);
    console.log(`  Successful automations: ${results.filter(r => r.performed).length}`);
    console.log(`  Failed automations: ${results.filter(r => !r.performed).length}`);
  }

  async runStatisticsTest() {
    console.log('\n📊 TESTING STATISTICS AND MONITORING');
    
    // Reset stats
    this.automator.resetStats();
    
    // Process various memories
    const testMemories = [
      { content: 'I need to implement feature A', project: 'stats-test', category: 'code' },
      { content: 'Working on feature B implementation', project: 'stats-test', category: 'code' },
      { content: 'Completed feature C successfully', project: 'stats-test', category: 'code' },
      { content: 'Blocked by vendor dependency', project: 'stats-test', category: 'work' },
      { content: 'maybe do something', project: 'stats-test', category: 'general' } // Low confidence
    ];

    for (const memory of testMemories) {
      await this.automator.processMemory({
        id: `stats-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...memory
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const stats = this.automator.getStats();
    const health = this.automator.getHealthStatus();
    
    console.log('STATISTICS:');
    console.log(`  Memories processed: ${stats.memoriesProcessed}`);
    console.log(`  Tasks created: ${stats.tasksCreated}`);
    console.log(`  Tasks updated: ${stats.tasksUpdated}`);
    console.log(`  Tasks completed: ${stats.tasksCompleted}`);
    console.log(`  Tasks blocked: ${stats.tasksBlocked}`);
    console.log(`  Errors: ${stats.errors}`);
    
    console.log('\nHEALTH STATUS:');
    console.log(`  Healthy: ${health.healthy}`);
    console.log(`  Error rate: ${health.errorRate}`);
    console.log(`  Total actions: ${health.totalActions}`);
  }

  async runAllScenarios() {
    console.log('🧪 STARTING COMPREHENSIVE MANUAL TEST SCENARIOS');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    try {
      await this.runTaskCreationScenarios();
      await this.runTaskUpdateScenarios();
      await this.runTaskCompletionScenarios();
      await this.runTaskBlockingScenarios();
      await this.runEdgeCaseScenarios();
      await this.runPerformanceTest();
      await this.runStatisticsTest();
      
      console.log('\n🎉 ALL MANUAL TEST SCENARIOS COMPLETED SUCCESSFULLY');
      
      // Print final summary
      const finalStats = this.automator.getStats();
      console.log('\nFINAL SUMMARY:');
      console.log(`  Total memories processed: ${finalStats.memoriesProcessed}`);
      console.log(`  Total automations performed: ${finalStats.tasksCreated + finalStats.tasksUpdated + finalStats.tasksCompleted + finalStats.tasksBlocked}`);
      console.log(`  Success rate: ${finalStats.errors === 0 ? '100%' : `${((finalStats.memoriesProcessed - finalStats.errors) / finalStats.memoriesProcessed * 100).toFixed(1)}%`}`);
      
    } catch (error) {
      console.error('❌ TEST EXECUTION FAILED:', error);
      throw error;
    }
  }
}

// Export for use in other files
export { ManualTestScenarios };

// Run scenarios if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ManualTestScenarios();
  
  tester.runAllScenarios()
    .then(() => {
      console.log('\n✅ Manual test scenarios completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Manual test scenarios failed:', error);
      process.exit(1);
    });
}