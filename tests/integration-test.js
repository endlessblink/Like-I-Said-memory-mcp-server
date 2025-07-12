/**
 * Integration tests for memory-task automation with real MCP server
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

class MCPServerTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['server-markdown.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let output = '';
      
      this.serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('tools/list')) {
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', reject);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async sendMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) {
        reject(new Error('Server not started'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: params
      };

      let response = '';
      
      const onData = (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          this.serverProcess.stdout.off('data', onData);
          resolve(parsed);
        } catch (e) {
          // Continue collecting data
        }
      };

      this.serverProcess.stdout.on('data', onData);
      
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.serverProcess.stdout.off('data', onData);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  async testTaskCreation() {
    console.log('Testing task creation from memory...');
    
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'add_memory',
        arguments: {
          content: 'I need to implement a comprehensive user authentication system with JWT tokens and role-based access control for the web application',
          project: 'automation-test',
          category: 'code',
          tags: ['authentication', 'jwt', 'rbac', 'security'],
          priority: 'high'
        }
      });

      console.log('Memory creation response:', JSON.stringify(response, null, 2));
      
      // Check if automation was triggered
      if (response.result && response.result.content && response.result.content[0]) {
        const text = response.result.content[0].text;
        const hasAutomation = text.includes('Task Automation:');
        
        this.testResults.push({
          test: 'Task Creation',
          passed: hasAutomation,
          details: hasAutomation ? 'Task automation detected in response' : 'No task automation detected',
          response: text
        });
      } else {
        this.testResults.push({
          test: 'Task Creation',
          passed: false,
          details: 'Invalid response format',
          response: response
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Task Creation',
        passed: false,
        details: `Error: ${error.message}`,
        error: error
      });
    }
  }

  async testTaskUpdate() {
    console.log('Testing task update from memory...');
    
    // First, create a task to update
    try {
      await this.sendMCPRequest('tools/call', {
        name: 'create_task',
        arguments: {
          title: 'API development for user management',
          project: 'automation-test',
          category: 'code',
          priority: 'medium',
          status: 'todo'
        }
      });

      // Now create memory that should update the task
      const response = await this.sendMCPRequest('tools/call', {
        name: 'add_memory',
        arguments: {
          content: 'Started working on the API development for user management, implemented the basic CRUD operations for users',
          project: 'automation-test',
          category: 'code',
          tags: ['api', 'user-management', 'progress']
        }
      });

      console.log('Task update response:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.content && response.result.content[0]) {
        const text = response.result.content[0].text;
        const hasUpdate = text.includes('Task Automation: update');
        
        this.testResults.push({
          test: 'Task Update',
          passed: hasUpdate,
          details: hasUpdate ? 'Task update automation detected' : 'No task update detected',
          response: text
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Task Update',
        passed: false,
        details: `Error: ${error.message}`,
        error: error
      });
    }
  }

  async testTaskCompletion() {
    console.log('Testing task completion from memory...');
    
    try {
      // Create a task in progress
      await this.sendMCPRequest('tools/call', {
        name: 'create_task',
        arguments: {
          title: 'Database migration script',
          project: 'automation-test',
          category: 'code',
          priority: 'high',
          status: 'in_progress'
        }
      });

      // Create memory indicating completion
      const response = await this.sendMCPRequest('tools/call', {
        name: 'add_memory',
        arguments: {
          content: 'Successfully completed the database migration script, all tests pass and production migration went smoothly',
          project: 'automation-test',
          category: 'code',
          tags: ['database', 'migration', 'completed']
        }
      });

      console.log('Task completion response:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.content && response.result.content[0]) {
        const text = response.result.content[0].text;
        const hasCompletion = text.includes('Task Automation: complete');
        
        this.testResults.push({
          test: 'Task Completion',
          passed: hasCompletion,
          details: hasCompletion ? 'Task completion automation detected' : 'No task completion detected',
          response: text
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Task Completion',
        passed: false,
        details: `Error: ${error.message}`,
        error: error
      });
    }
  }

  async testTaskBlocking() {
    console.log('Testing task blocking from memory...');
    
    try {
      // Create a task
      await this.sendMCPRequest('tools/call', {
        name: 'create_task',
        arguments: {
          title: 'External API integration',
          project: 'automation-test',
          category: 'code',
          priority: 'medium',
          status: 'todo'
        }
      });

      // Create memory indicating blocking
      const response = await this.sendMCPRequest('tools/call', {
        name: 'add_memory',
        arguments: {
          content: 'Cannot proceed with external API integration, blocked by waiting for API keys and documentation from the vendor',
          project: 'automation-test',
          category: 'work',
          tags: ['api', 'blocked', 'vendor']
        }
      });

      console.log('Task blocking response:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.content && response.result.content[0]) {
        const text = response.result.content[0].text;
        const hasBlocking = text.includes('Task Automation: block');
        
        this.testResults.push({
          test: 'Task Blocking',
          passed: hasBlocking,
          details: hasBlocking ? 'Task blocking automation detected' : 'No task blocking detected',
          response: text
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Task Blocking',
        passed: false,
        details: `Error: ${error.message}`,
        error: error
      });
    }
  }

  async testLowConfidenceMemory() {
    console.log('Testing low confidence memory (should not trigger automation)...');
    
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'add_memory',
        arguments: {
          content: 'Maybe I should do something later',
          project: 'automation-test',
          category: 'general'
        }
      });

      console.log('Low confidence response:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.content && response.result.content[0]) {
        const text = response.result.content[0].text;
        const hasAutomation = text.includes('Task Automation:');
        
        this.testResults.push({
          test: 'Low Confidence Memory',
          passed: !hasAutomation, // Should NOT trigger automation
          details: hasAutomation ? 'Unexpected automation triggered' : 'Correctly ignored low confidence content',
          response: text
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Low Confidence Memory',
        passed: false,
        details: `Error: ${error.message}`,
        error: error
      });
    }
  }

  async testBidirectionalLinking() {
    console.log('Testing bidirectional memory-task linking...');
    
    try {
      // Create memory that should generate a task
      const memoryResponse = await this.sendMCPRequest('tools/call', {
        name: 'add_memory',
        arguments: {
          content: 'I need to implement comprehensive error handling for the payment processing system',
          project: 'automation-test',
          category: 'code',
          tags: ['error-handling', 'payments', 'critical']
        }
      });

      console.log('Memory response:', JSON.stringify(memoryResponse, null, 2));

      // Get the task that should have been created
      const tasksResponse = await this.sendMCPRequest('tools/call', {
        name: 'list_tasks',
        arguments: {
          project: 'automation-test'
        }
      });

      console.log('Tasks response:', JSON.stringify(tasksResponse, null, 2));
      
      // Check if task was created and linked
      if (tasksResponse.result && tasksResponse.result.content && tasksResponse.result.content[0]) {
        const text = tasksResponse.result.content[0].text;
        const hasErrorHandlingTask = text.includes('error handling') || text.includes('payment');
        
        this.testResults.push({
          test: 'Bidirectional Linking',
          passed: hasErrorHandlingTask,
          details: hasErrorHandlingTask ? 'Task created and appears in task list' : 'Task not found in list',
          response: text
        });
      }
    } catch (error) {
      this.testResults.push({
        test: 'Bidirectional Linking',
        passed: false,
        details: `Error: ${error.message}`,
        error: error
      });
    }
  }

  async runAllTests() {
    console.log('Starting comprehensive integration tests...');
    
    try {
      console.log('Starting MCP server...');
      await this.startServer();
      console.log('Server started successfully');

      // Wait a moment for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Run all test scenarios
      await this.testTaskCreation();
      await this.testTaskUpdate();
      await this.testTaskCompletion();
      await this.testTaskBlocking();
      await this.testLowConfidenceMemory();
      await this.testBidirectionalLinking();

      console.log('All tests completed');
    } catch (error) {
      console.error('Integration test error:', error);
      this.testResults.push({
        test: 'Server Startup',
        passed: false,
        details: `Failed to start server: ${error.message}`,
        error: error
      });
    } finally {
      await this.stopServer();
    }

    return this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('MEMORY-TASK AUTOMATION INTEGRATION TEST REPORT');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`\nOverall Result: ${passed}/${total} tests passed`);
    console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%\n`);

    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      console.log(`   Details: ${result.details}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error.message}`);
      }
      console.log('');
    });

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: total,
      passedTests: passed,
      failedTests: total - passed,
      successRate: (passed/total) * 100,
      results: this.testResults
    };

    return summary;
  }

  async saveReport(summary) {
    const reportPath = path.join(process.cwd(), 'test-reports', `integration-test-${Date.now()}.json`);
    
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    return reportPath;
  }
}

// Export for use in other test files
export { MCPServerTester };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPServerTester();
  
  tester.runAllTests()
    .then(async (summary) => {
      await tester.saveReport(summary);
      process.exit(summary.passedTests === summary.totalTests ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}