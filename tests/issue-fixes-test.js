#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

const TEST_PORT = 3005;
const TIMEOUT = 30000; // 30 seconds

/**
 * Test suite for GitHub issue fixes
 */
class IssueFixTests {
  constructor() {
    this.results = [];
    this.serverProcess = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '📋';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async runTest(name, testFunc) {
    this.log(`Testing: ${name}`);
    try {
      await testFunc();
      this.results.push({ name, success: true });
      this.log(`${name} - PASSED`, 'success');
    } catch (error) {
      this.results.push({ name, success: false, error: error.message });
      this.log(`${name} - FAILED: ${error.message}`, 'error');
    }
  }

  /**
   * Test Issue #4: dev:full script exists
   */
  async testDevFullScript() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts?.['dev:full']) {
      throw new Error('dev:full script is missing from package.json');
    }
    
    // Verify the script command is correct
    const expectedCommand = 'concurrently "npm run start:dashboard" "npm run dev" --names "API,UI" --prefix-colors "green,magenta"';
    if (packageJson.scripts['dev:full'] !== expectedCommand) {
      throw new Error(`dev:full script has incorrect command. Expected: ${expectedCommand}`);
    }
  }

  /**
   * Test Issue #2: Loader2 imports
   */
  async testLoader2Imports() {
    const componentsDir = path.join(process.cwd(), 'src', 'components');
    const filesToCheck = [
      'FilterPresets.tsx',
      'MemoryEditModal.tsx',
      'ProgressIndicators.tsx',
      'ToastNotifications.tsx',
      'LoadingStates.tsx',
      'MemoryCard.tsx',
      'TaskManagement.tsx',
      'MemoryViewModal.tsx',
      'CategorySuggestions.tsx'
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(componentsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check if file uses Loader2
      if (content.includes('<Loader2')) {
        // Check if Loader2 is imported
        if (!content.includes('Loader2') || !content.includes('from "lucide-react"') && !content.includes('from \'lucide-react\'')) {
          throw new Error(`${file} uses Loader2 but doesn't import it from lucide-react`);
        }
      }
    }
  }

  /**
   * Test Issue #3: Dashboard server connectivity
   */
  async testDashboardConnectivity() {
    // Start the dashboard server
    await this.startDashboardServer();
    
    // Wait for server to be ready
    await this.waitForServer(TEST_PORT);
    
    // Test API endpoints
    await this.testEndpoint('/api/health', 'GET');
    await this.testEndpoint('/api/memories', 'GET');
    await this.testEndpoint('/api/tasks', 'GET');
    await this.testEndpoint('/api/settings', 'GET');
    
    // Test WebSocket connection
    await this.testWebSocketConnection();
  }

  async startDashboardServer() {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['dashboard-server-bridge.js'], {
        env: { ...process.env, PORT: TEST_PORT },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let serverStarted = false;

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Server] ${output}`);
        
        if ((output.includes('DASHBOARD READY') || output.includes('Server running on')) && !serverStarted) {
          serverStarted = true;
          setTimeout(resolve, 1000); // Give it a second to fully initialize
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data.toString()}`);
      });

      this.serverProcess.on('error', reject);

      // Timeout if server doesn't start
      setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Server failed to start within timeout'));
        }
      }, 10000);
    });
  }

  async waitForServer(port, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.makeRequest(`http://localhost:${port}/api/health`);
        return;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Server not ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async testEndpoint(path, method = 'GET') {
    const url = `http://localhost:${TEST_PORT}${path}`;
    const response = await this.makeRequest(url, { method });
    
    if (response.statusCode >= 400) {
      throw new Error(`${method} ${path} returned ${response.statusCode}`);
    }
    
    // Parse JSON response
    const data = JSON.parse(response.body);
    
    // Verify response structure
    if (path === '/api/health' && !data.status) {
      throw new Error('Health endpoint missing status field');
    }
    
    if (path === '/api/memories' && !Array.isArray(data)) {
      throw new Error('Memories endpoint should return an array');
    }
    
    if (path === '/api/tasks' && !Array.isArray(data)) {
      throw new Error('Tasks endpoint should return an array');
    }
  }

  async testWebSocketConnection() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.log('WebSocket connected successfully');
        
        // Test sending a message
        ws.send(JSON.stringify({ type: 'ping' }));
        
        setTimeout(() => {
          ws.close();
          resolve();
        }, 1000);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      ws.on('message', (data) => {
        this.log(`WebSocket received: ${data}`);
      });
    });
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  async cleanup() {
    if (this.serverProcess) {
      this.log('Stopping dashboard server...');
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async runAll() {
    this.log('Starting GitHub Issue Fixes Test Suite');
    this.log('=====================================');
    
    try {
      // Test Issue #4
      await this.runTest('Issue #4: dev:full script exists', () => this.testDevFullScript());
      
      // Test Issue #2
      await this.runTest('Issue #2: Loader2 imports', () => this.testLoader2Imports());
      
      // Test Issue #3
      await this.runTest('Issue #3: Dashboard connectivity', () => this.testDashboardConnectivity());
      
    } finally {
      await this.cleanup();
    }

    // Summary
    this.log('\nTest Summary');
    this.log('============');
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    this.log(`Total: ${this.results.length}`);
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    
    if (failed > 0) {
      this.log('\nFailed Tests:');
      this.results.filter(r => !r.success).forEach(r => {
        this.log(`- ${r.name}: ${r.error}`, 'error');
      });
    }
    
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new IssueFixTests();
tester.runAll().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});