#!/usr/bin/env node

/**
 * Health Monitor Test Suite
 * Tests the health monitoring endpoints and functionality
 */

import { HealthMonitor } from '../lib/health-monitor.js';
import fetch from 'node-fetch';
import WebSocket from 'ws';

const TEST_PORT = 8081;

class HealthMonitorTestSuite {
  constructor() {
    this.monitor = null;
    this.baseUrl = `http://localhost:${TEST_PORT}`;
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0
    };
  }
  
  /**
   * Setup test monitor
   */
  async setup() {
    this.monitor = new HealthMonitor({
      port: TEST_PORT,
      checkInterval: 5000 // Faster for testing
    });
    
    await this.monitor.start();
    // Wait for service to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * Teardown test monitor
   */
  async teardown() {
    if (this.monitor) {
      await this.monitor.stop();
    }
  }
  
  /**
   * Test basic health endpoint
   */
  async testBasicHealth() {
    console.log('Testing /health endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      return {
        name: 'Basic Health Check',
        passed: response.status === 200 && data.status === 'healthy',
        details: {
          statusCode: response.status,
          hasTimestamp: !!data.timestamp,
          hasUptime: !!data.uptime,
          hasMemory: !!data.memory
        }
      };
    } catch (error) {
      return {
        name: 'Basic Health Check',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test detailed health endpoint
   */
  async testDetailedHealth() {
    console.log('Testing /health/detailed endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health/detailed`);
      const data = await response.json();
      
      const hasChecks = data.checks && Object.keys(data.checks).length > 0;
      const hasOverall = !!data.overall;
      
      return {
        name: 'Detailed Health Check',
        passed: response.status === 200 && hasChecks && hasOverall,
        details: {
          statusCode: response.status,
          overall: data.overall,
          checkCount: Object.keys(data.checks || {}).length,
          checks: Object.keys(data.checks || {})
        }
      };
    } catch (error) {
      return {
        name: 'Detailed Health Check',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test liveness probe
   */
  async testLivenessProbe() {
    console.log('Testing /health/live endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health/live`);
      const data = await response.json();
      
      return {
        name: 'Liveness Probe',
        passed: response.status === 200 && data.status === 'alive',
        details: {
          statusCode: response.status,
          status: data.status
        }
      };
    } catch (error) {
      return {
        name: 'Liveness Probe',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test readiness probe
   */
  async testReadinessProbe() {
    console.log('Testing /health/ready endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health/ready`);
      const data = await response.json();
      
      return {
        name: 'Readiness Probe',
        passed: response.status === 200 && data.ready === true,
        details: {
          statusCode: response.status,
          ready: data.ready
        }
      };
    } catch (error) {
      return {
        name: 'Readiness Probe',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test metrics endpoint
   */
  async testMetrics() {
    console.log('Testing /metrics endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/metrics`);
      const data = await response.json();
      
      const hasMemory = !!data.memory;
      const hasCpu = !!data.cpu;
      const hasUptime = !!data.uptime;
      
      return {
        name: 'Metrics Endpoint',
        passed: response.status === 200 && hasMemory && hasCpu && hasUptime,
        details: {
          statusCode: response.status,
          hasMemory,
          hasCpu,
          hasUptime,
          memoryHeap: data.memory?.heapUsed ? `${Math.round(data.memory.heapUsed / 1024 / 1024)}MB` : 'unknown'
        }
      };
    } catch (error) {
      return {
        name: 'Metrics Endpoint',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test history endpoint
   */
  async testHistory() {
    console.log('Testing /health/history endpoint...');
    
    try {
      // Force a check first
      await fetch(`${this.baseUrl}/health/check`, { method: 'POST' });
      
      const response = await fetch(`${this.baseUrl}/health/history`);
      const data = await response.json();
      
      return {
        name: 'History Endpoint',
        passed: response.status === 200 && Array.isArray(data.history),
        details: {
          statusCode: response.status,
          historyCount: data.count,
          maxSize: data.maxSize
        }
      };
    } catch (error) {
      return {
        name: 'History Endpoint',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test force check endpoint
   */
  async testForceCheck() {
    console.log('Testing /health/check endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health/check`, {
        method: 'POST'
      });
      const data = await response.json();
      
      const hasChecks = data.checks && Object.keys(data.checks).length > 0;
      
      return {
        name: 'Force Check Endpoint',
        passed: response.status === 200 && hasChecks,
        details: {
          statusCode: response.status,
          overall: data.overall,
          checkCount: Object.keys(data.checks || {}).length
        }
      };
    } catch (error) {
      return {
        name: 'Force Check Endpoint',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test WebSocket connection
   */
  async testWebSocket() {
    console.log('Testing WebSocket connection...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      let messageReceived = false;
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          name: 'WebSocket Connection',
          passed: false,
          error: 'Timeout waiting for message'
        });
      }, 5000);
      
      ws.on('open', () => {
        console.log('  WebSocket connected');
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          messageReceived = true;
          clearTimeout(timeout);
          ws.close();
          
          resolve({
            name: 'WebSocket Connection',
            passed: message.type === 'health-update',
            details: {
              messageType: message.type,
              hasData: !!message.data
            }
          });
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          resolve({
            name: 'WebSocket Connection',
            passed: false,
            error: error.message
          });
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          name: 'WebSocket Connection',
          passed: false,
          error: error.message
        });
      });
    });
  }
  
  /**
   * Test custom health check registration
   */
  async testCustomCheck() {
    console.log('Testing custom health check...');
    
    // Register a custom check
    this.monitor.registerCheck('custom-test', async () => {
      return {
        healthy: true,
        details: {
          message: 'Custom check working'
        }
      };
    });
    
    try {
      const response = await fetch(`${this.baseUrl}/health/detailed`);
      const data = await response.json();
      
      const hasCustomCheck = data.checks && data.checks['custom-test'];
      const customHealthy = hasCustomCheck && data.checks['custom-test'].healthy;
      
      return {
        name: 'Custom Health Check',
        passed: hasCustomCheck && customHealthy,
        details: {
          hasCustomCheck,
          customHealthy,
          customDetails: data.checks?.['custom-test']?.details
        }
      };
    } catch (error) {
      return {
        name: 'Custom Health Check',
        passed: false,
        error: error.message
      };
    }
  }
  
  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('HEALTH MONITOR TEST SUITE');
    console.log('='.repeat(60) + '\n');
    
    await this.setup();
    
    const tests = [
      () => this.testBasicHealth(),
      () => this.testDetailedHealth(),
      () => this.testLivenessProbe(),
      () => this.testReadinessProbe(),
      () => this.testMetrics(),
      () => this.testHistory(),
      () => this.testForceCheck(),
      () => this.testWebSocket(),
      () => this.testCustomCheck()
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
    
    await this.teardown();
    
    // Summary
    console.log('='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.tests.length) * 100)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n✅ All health monitor tests passed!');
    } else {
      console.log('\n⚠️ Some tests failed. Review the details above.');
    }
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new HealthMonitorTestSuite();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { HealthMonitorTestSuite };