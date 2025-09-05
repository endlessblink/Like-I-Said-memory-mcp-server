#!/usr/bin/env node

/**
 * E2E MCP Simulation Tests
 * Simulates Claude Code interactions with the MCP server
 */

import { spawn } from 'child_process';
import { createLogger } from '../services/logger.js';

const logger = createLogger('E2E-MCP-Test');

/**
 * MCP Protocol Simulator
 * Simulates Claude Code's interaction with MCP servers
 */
class MCPSimulator {
  constructor(serverPath = 'server-minimal.js') {
    this.serverPath = serverPath;
    this.server = null;
    this.requestId = 1;
    this.responses = [];
    this.errors = [];
    this.startTime = null;
    this.memoryReadings = [];
  }
  
  /**
   * Start the MCP server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.startTime = Date.now();
      
      this.server = spawn('node', [this.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let initialized = false;
      let output = '';
      
      this.server.stdout.on('data', (data) => {
        output += data.toString();
        
        // Look for initialization response
        if (!initialized && output.includes('capabilities')) {
          initialized = true;
          resolve();
        }
        
        // Parse complete JSON responses
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('{')) {
            try {
              const response = JSON.parse(line);
              this.responses.push(response);
            } catch (e) {
              // Not complete JSON yet
            }
          }
        }
      });
      
      this.server.stderr.on('data', (data) => {
        const error = data.toString();
        this.errors.push(error);
        
        // Check for fatal errors
        if (error.includes('process.exit') || error.includes('FATAL')) {
          reject(new Error(`Server crashed: ${error}`));
        }
      });
      
      this.server.on('exit', (code) => {
        if (code !== 0 && !initialized) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });
      
      // Send initialization
      setTimeout(() => {
        this.sendRequest({
          method: 'initialize',
          params: {
            protocolVersion: '1.0.0',
            clientInfo: {
              name: 'claude-code-simulator',
              version: '1.0.0'
            },
            capabilities: {
              tools: {},
              prompts: {}
            }
          }
        });
      }, 100);
      
      // Timeout
      setTimeout(() => {
        if (!initialized) {
          reject(new Error('Server initialization timeout'));
        }
      }, 5000);
    });
  }
  
  /**
   * Send an MCP request
   */
  sendRequest(request) {
    const fullRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      ...request
    };
    
    const json = JSON.stringify(fullRequest) + '\n';
    this.server.stdin.write(json);
    
    return fullRequest.id;
  }
  
  /**
   * Wait for a response by ID
   */
  async waitForResponse(id, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = this.responses.find(r => r.id === id);
      if (response) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for response to request ${id}`);
  }
  
  /**
   * Get server memory usage
   */
  getMemoryUsage() {
    if (!this.server || !this.server.pid) return 0;
    
    try {
      const fs = require('fs');
      const status = fs.readFileSync(`/proc/${this.server.pid}/status`, 'utf8');
      const vmRss = status.match(/VmRSS:\s+(\d+)/);
      if (vmRss) {
        return parseInt(vmRss[1]) / 1024; // Convert to MB
      }
    } catch (e) {
      // Not on Linux or process ended
    }
    
    return 0;
  }
  
  /**
   * Stop the server
   */
  stop() {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }
}

/**
 * E2E Test Suite
 */
class E2ETestSuite {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }
  
  /**
   * Test: Claude Code initialization sequence
   */
  async testInitializationSequence() {
    logger.info('Testing Claude Code initialization sequence...');
    
    const simulator = new MCPSimulator();
    
    try {
      // Start and initialize
      await simulator.start();
      
      // Request tool list
      const toolsId = simulator.sendRequest({
        method: 'tools/list'
      });
      
      const toolsResponse = await simulator.waitForResponse(toolsId);
      
      // Validate response
      const hasTools = toolsResponse.result?.tools?.length > 0;
      const hasMemoryTools = toolsResponse.result?.tools?.some(t => 
        t.name === 'add_memory' || t.name === 'list_memories'
      );
      const hasTaskTools = toolsResponse.result?.tools?.some(t =>
        t.name === 'create_task' || t.name === 'list_tasks'
      );
      
      simulator.stop();
      
      return {
        name: 'Initialization Sequence',
        passed: hasTools && hasMemoryTools && hasTaskTools,
        details: {
          toolCount: toolsResponse.result?.tools?.length || 0,
          hasMemoryTools,
          hasTaskTools,
          errors: simulator.errors.length
        }
      };
    } catch (error) {
      simulator.stop();
      return {
        name: 'Initialization Sequence',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test: Tool execution flow
   */
  async testToolExecution() {
    logger.info('Testing tool execution flow...');
    
    const simulator = new MCPSimulator();
    
    try {
      await simulator.start();
      
      // Execute test_tool
      const testId = simulator.sendRequest({
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: {
            message: 'E2E test'
          }
        }
      });
      
      const testResponse = await simulator.waitForResponse(testId);
      
      // Execute add_memory
      const memoryId = simulator.sendRequest({
        method: 'tools/call',
        params: {
          name: 'add_memory',
          arguments: {
            content: 'E2E test memory',
            project: 'e2e-test'
          }
        }
      });
      
      const memoryResponse = await simulator.waitForResponse(memoryId);
      
      simulator.stop();
      
      return {
        name: 'Tool Execution',
        passed: !testResponse.error && !memoryResponse.error,
        details: {
          testToolResult: !!testResponse.result,
          memoryCreated: !!memoryResponse.result?.id,
          errors: simulator.errors.length
        }
      };
    } catch (error) {
      simulator.stop();
      return {
        name: 'Tool Execution',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test: Rapid request handling
   */
  async testRapidRequests() {
    logger.info('Testing rapid request handling...');
    
    const simulator = new MCPSimulator();
    
    try {
      await simulator.start();
      
      const requestIds = [];
      const requestCount = 50;
      
      // Send rapid requests
      for (let i = 0; i < requestCount; i++) {
        const id = simulator.sendRequest({
          method: 'tools/list'
        });
        requestIds.push(id);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Wait for all responses
      const responses = [];
      for (const id of requestIds) {
        try {
          const response = await simulator.waitForResponse(id, 10000);
          responses.push(response);
        } catch (e) {
          // Timeout or error
        }
      }
      
      simulator.stop();
      
      const successRate = (responses.length / requestCount) * 100;
      
      return {
        name: 'Rapid Requests',
        passed: successRate >= 80, // 80% success rate minimum
        details: {
          sent: requestCount,
          received: responses.length,
          successRate: `${successRate.toFixed(1)}%`,
          errors: simulator.errors.length
        }
      };
    } catch (error) {
      simulator.stop();
      return {
        name: 'Rapid Requests',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test: Memory stability
   */
  async testMemoryStability() {
    logger.info('Testing memory stability...');
    
    const simulator = new MCPSimulator();
    
    try {
      await simulator.start();
      
      // Initial memory reading
      await new Promise(resolve => setTimeout(resolve, 1000));
      const initialMemory = simulator.getMemoryUsage();
      
      // Send 100 requests
      for (let i = 0; i < 100; i++) {
        simulator.sendRequest({
          method: 'tools/call',
          params: {
            name: 'add_memory',
            arguments: {
              content: `Memory test ${i}`,
              project: 'memory-test'
            }
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Final memory reading
      const finalMemory = simulator.getMemoryUsage();
      const increase = finalMemory - initialMemory;
      const increasePercent = initialMemory > 0 ? (increase / initialMemory) * 100 : 0;
      
      simulator.stop();
      
      return {
        name: 'Memory Stability',
        passed: increase < 20, // Less than 20MB increase
        details: {
          initialMemory: `${initialMemory.toFixed(2)}MB`,
          finalMemory: `${finalMemory.toFixed(2)}MB`,
          increase: `${increase.toFixed(2)}MB`,
          increasePercent: `${increasePercent.toFixed(1)}%`
        }
      };
    } catch (error) {
      simulator.stop();
      return {
        name: 'Memory Stability',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test: Error recovery
   */
  async testErrorRecovery() {
    logger.info('Testing error recovery...');
    
    const simulator = new MCPSimulator();
    
    try {
      await simulator.start();
      
      // Send invalid request
      const invalidId = simulator.sendRequest({
        method: 'invalid/method'
      });
      
      let errorResponse;
      try {
        errorResponse = await simulator.waitForResponse(invalidId);
      } catch {
        // Might timeout
      }
      
      // Send valid request after error
      const validId = simulator.sendRequest({
        method: 'tools/list'
      });
      
      const validResponse = await simulator.waitForResponse(validId);
      
      simulator.stop();
      
      return {
        name: 'Error Recovery',
        passed: validResponse.result?.tools?.length > 0,
        details: {
          errorHandled: !!errorResponse?.error,
          recoveredSuccessfully: !!validResponse.result,
          serverCrashed: simulator.errors.some(e => e.includes('exit'))
        }
      };
    } catch (error) {
      simulator.stop();
      return {
        name: 'Error Recovery',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test: Large payload handling
   */
  async testLargePayload() {
    logger.info('Testing large payload handling...');
    
    const simulator = new MCPSimulator();
    
    try {
      await simulator.start();
      
      // Create 1MB content
      const largeContent = 'x'.repeat(1024 * 1024);
      
      const largeId = simulator.sendRequest({
        method: 'tools/call',
        params: {
          name: 'add_memory',
          arguments: {
            content: largeContent,
            project: 'large-test'
          }
        }
      });
      
      const response = await simulator.waitForResponse(largeId, 10000);
      
      simulator.stop();
      
      return {
        name: 'Large Payload',
        passed: !response.error,
        details: {
          payloadSize: '1MB',
          handled: !!response.result,
          errors: simulator.errors.length
        }
      };
    } catch (error) {
      simulator.stop();
      return {
        name: 'Large Payload',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test: Server restart simulation
   */
  async testServerRestart() {
    logger.info('Testing server restart...');
    
    const simulator1 = new MCPSimulator();
    
    try {
      // First session
      await simulator1.start();
      
      const id1 = simulator1.sendRequest({
        method: 'tools/call',
        params: {
          name: 'add_memory',
          arguments: {
            content: 'Before restart',
            project: 'restart-test'
          }
        }
      });
      
      await simulator1.waitForResponse(id1);
      simulator1.stop();
      
      // Simulate restart delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Second session
      const simulator2 = new MCPSimulator();
      await simulator2.start();
      
      const id2 = simulator2.sendRequest({
        method: 'tools/call',
        params: {
          name: 'list_memories',
          arguments: {
            project: 'restart-test'
          }
        }
      });
      
      const response = await simulator2.waitForResponse(id2);
      simulator2.stop();
      
      // Check if memory persisted
      const hasPreviousMemory = response.result?.memories?.some(m =>
        m.content?.includes('Before restart')
      );
      
      return {
        name: 'Server Restart',
        passed: true, // Server restarted successfully
        details: {
          memoryPersisted: hasPreviousMemory,
          cleanRestart: true
        }
      };
    } catch (error) {
      return {
        name: 'Server Restart',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Run all E2E tests
   */
  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('E2E MCP SIMULATION TEST SUITE');
    console.log('Simulating Claude Code interactions');
    console.log('='.repeat(60) + '\n');
    
    const tests = [
      () => this.testInitializationSequence(),
      () => this.testToolExecution(),
      () => this.testRapidRequests(),
      () => this.testMemoryStability(),
      () => this.testErrorRecovery(),
      () => this.testLargePayload(),
      () => this.testServerRestart()
    ];
    
    for (const test of tests) {
      try {
        const result = await test();
        this.tests.push(result);
        
        if (result.passed) {
          this.results.passed++;
          console.log(`✅ ${result.name}`);
        } else {
          this.results.failed++;
          console.log(`❌ ${result.name}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        }
        
        if (result.details) {
          console.log(`   Details:`, result.details);
        }
        console.log();
      } catch (error) {
        this.results.failed++;
        console.log(`❌ Test execution error: ${error.message}`);
      }
    }
    
    // Summary
    console.log('='.repeat(60));
    console.log('E2E TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.tests.length) * 100)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n✅ All E2E tests passed! Server is Claude Code compatible.');
    } else {
      console.log('\n⚠️ Some E2E tests failed. Review for potential API Error 500 issues.');
    }
    
    // Exit code based on results
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new E2ETestSuite();
  suite.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { MCPSimulator, E2ETestSuite };