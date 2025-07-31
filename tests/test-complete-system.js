#!/usr/bin/env node

/**
 * Complete system test that validates EVERYTHING
 * - Starts servers
 * - Tests UI rendering
 * - Tests functionality
 * - Tests cross-browser access
 * - Validates no errors occur
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  startupTimeout: 30000,
  testTimeout: 60000,
  apiPort: null,
  uiPort: 5173
};

// Test results
const RESULTS = {
  passed: [],
  failed: [],
  screenshots: []
};

// Helper functions
function log(message, type = 'info') {
  const symbols = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  console.log(`${symbols[type]} ${message}`);
}

function addResult(test, passed, details = '') {
  if (passed) {
    RESULTS.passed.push(test);
    log(`${test} ${details}`, 'success');
  } else {
    RESULTS.failed.push({ test, error: details });
    log(`${test}: ${details}`, 'error');
  }
}

// Get local network IPs
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

// Start servers
async function startServers() {
  return new Promise((resolve, reject) => {
    log('Starting servers...', 'info');
    
    const proc = spawn('npm', ['run', 'dev:full'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    let apiPort = null;
    let uiReady = false;
    let apiReady = false;
    const output = [];
    
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Server startup timeout'));
    }, TEST_CONFIG.startupTimeout);
    
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output.push(text);
      
      // Check for API port
      if (text.includes('API server responding correctly on port')) {
        const match = text.match(/port (\d+)/);
        if (match) {
          apiPort = parseInt(match[1]);
          TEST_CONFIG.apiPort = apiPort;
          apiReady = true;
        }
      }
      
      // Check for UI ready
      if (text.includes('ready in') && text.includes('ms')) {
        uiReady = true;
      }
      
      // Check for startup completion
      if (apiReady && uiReady && apiPort) {
        clearTimeout(timeout);
        log(`Servers started - API: ${apiPort}, UI: ${TEST_CONFIG.uiPort}`, 'success');
        resolve({ process: proc, apiPort });
      }
    });
    
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      if (text.includes('Error') || text.includes('Failed')) {
        console.error(text);
      }
    });
  });
}

// Test 1: Server Health
async function testServerHealth(apiPort) {
  log('\nTesting Server Health...', 'info');
  
  try {
    // Test API
    const apiRes = await fetch(`http://localhost:${apiPort}/api/status`);
    const apiData = await apiRes.json();
    
    if (apiData.status === 'ok' && apiData.server === 'Dashboard Bridge') {
      addResult('API Server Health', true, `v${apiData.version}`);
    } else {
      throw new Error('Invalid API response');
    }
    
    // Test UI
    const uiRes = await fetch(`http://localhost:${TEST_CONFIG.uiPort}`);
    if (uiRes.ok) {
      addResult('UI Server Health', true);
    } else {
      throw new Error(`UI returned ${uiRes.status}`);
    }
    
    // Test WebSocket
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${apiPort}`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        addResult('WebSocket Health', true);
        resolve();
      });
      
      ws.on('error', reject);
    });
    
  } catch (error) {
    addResult('Server Health', false, error.message);
  }
}

// Test 2: UI Rendering
async function testUIRendering() {
  log('\nTesting UI Rendering...', 'info');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Load UI
    await page.goto(`http://localhost:${TEST_CONFIG.uiPort}`, {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    // Wait for app to load
    await page.waitForSelector('.app-container', { timeout: 10000 });
    addResult('UI App Container Loads', true);
    
    // Check navigation exists
    const nav = await page.$('.nav-container');
    if (nav) {
      addResult('UI Navigation Renders', true);
    } else {
      throw new Error('Navigation not found');
    }
    
    // Check main content area
    const content = await page.$('#main-content-area');
    if (content) {
      addResult('UI Content Area Renders', true);
    } else {
      throw new Error('Content area not found');
    }
    
    // Check for no console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length === 0) {
      addResult('UI No Console Errors', true);
    } else {
      addResult('UI No Console Errors', false, consoleErrors.join(', '));
    }
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'ui-test.png');
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    RESULTS.screenshots.push(screenshotPath);
    
    // Check bottom panel visibility (Windows taskbar issue)
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const statsPanel = await page.$('.stats-panel');
    
    if (statsPanel) {
      const box = await statsPanel.boundingBox();
      if (box && box.y + box.height <= viewportHeight) {
        addResult('UI Bottom Panel Visible', true, 'Not cut off by taskbar');
      } else {
        addResult('UI Bottom Panel Visible', false, 'Cut off by viewport');
      }
    }
    
  } catch (error) {
    addResult('UI Rendering', false, error.message);
  } finally {
    await browser.close();
  }
}

// Test 3: Memory and Task Operations
async function testOperations(apiPort) {
  log('\nTesting Memory and Task Operations...', 'info');
  
  try {
    // Create memory
    const memRes = await fetch(`http://localhost:${apiPort}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'System test memory - can be deleted',
        project: 'system-test',
        category: 'test'
      })
    });
    
    if (!memRes.ok) throw new Error(`Memory create failed: ${memRes.status}`);
    const memory = await memRes.json();
    addResult('Memory Creation', true, memory.id);
    
    // Update memory
    const updateRes = await fetch(`http://localhost:${apiPort}/api/memories/${memory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Updated system test memory'
      })
    });
    
    if (updateRes.ok) {
      addResult('Memory Update', true);
    } else {
      throw new Error(`Update failed: ${updateRes.status}`);
    }
    
    // Delete memory
    const deleteRes = await fetch(`http://localhost:${apiPort}/api/memories/${memory.id}`, {
      method: 'DELETE'
    });
    
    if (deleteRes.ok) {
      addResult('Memory Deletion', true);
    } else {
      throw new Error(`Delete failed: ${deleteRes.status}`);
    }
    
    // Create task
    const taskRes = await fetch(`http://localhost:${apiPort}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'System validation task',
        description: 'Automated test task - will be deleted',
        project: 'system-test',
        priority: 'low'
      })
    });
    
    if (!taskRes.ok) throw new Error(`Task create failed: ${taskRes.status}`);
    const task = await taskRes.json();
    addResult('Task Creation', true, task.id);
    
    // Delete task
    const taskDeleteRes = await fetch(`http://localhost:${apiPort}/api/tasks/${task.id}`, {
      method: 'DELETE'
    });
    
    if (taskDeleteRes.ok) {
      addResult('Task Deletion', true);
    } else {
      throw new Error(`Task delete failed: ${taskDeleteRes.status}`);
    }
    
  } catch (error) {
    addResult('Operations', false, error.message);
  }
}

// Test 4: Cross-Browser Access
async function testCrossBrowserAccess(apiPort) {
  log('\nTesting Cross-Browser Access...', 'info');
  
  const ips = getLocalIPs();
  log(`Found network IPs: ${ips.join(', ')}`, 'info');
  
  // Test CORS
  for (const ip of ips) {
    try {
      const res = await fetch(`http://localhost:${apiPort}/api/status`, {
        headers: {
          'Origin': `http://${ip}:${TEST_CONFIG.uiPort}`,
          'Content-Type': 'application/json'
        }
      });
      
      const corsHeader = res.headers.get('access-control-allow-origin');
      const credentialsHeader = res.headers.get('access-control-allow-credentials');
      
      if (corsHeader && credentialsHeader === 'true') {
        addResult(`CORS for ${ip}`, true);
      } else {
        throw new Error('CORS headers missing');
      }
    } catch (error) {
      addResult(`CORS for ${ip}`, false, error.message);
    }
  }
  
  // Test UI accessibility from network IP
  if (ips.length > 0) {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      const networkUrl = `http://${ips[0]}:${TEST_CONFIG.uiPort}`;
      
      await page.goto(networkUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      const title = await page.title();
      if (title) {
        addResult('Network UI Access', true, `Accessible from ${ips[0]}`);
      } else {
        throw new Error('No page title');
      }
    } catch (error) {
      addResult('Network UI Access', false, error.message);
    } finally {
      await browser.close();
    }
  }
}

// Test 5: No Hardcoded URLs
async function testNoHardcodedURLs() {
  log('\nTesting for Hardcoded URLs...', 'info');
  
  const files = [
    'src/utils/apiConfig.ts',
    'src/hooks/useWebSocket.ts',
    'src/hooks/useApi.ts',
    'vite.config.ts'
  ];
  
  for (const file of files) {
    try {
      const content = await fs.promises.readFile(
        path.join(__dirname, '..', file), 
        'utf8'
      );
      
      // Check for hardcoded ports (excluding comments and dynamic detection)
      const lines = content.split('\n');
      const issues = [];
      
      lines.forEach((line, i) => {
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          if (line.includes(':3001') && !line.includes('3001,') && !line.includes('[3001')) {
            issues.push(`Line ${i + 1}: ${line.trim()}`);
          }
        }
      });
      
      if (issues.length === 0) {
        addResult(`No hardcoded ports in ${file}`, true);
      } else {
        addResult(`No hardcoded ports in ${file}`, false, issues.join('; '));
      }
    } catch (error) {
      addResult(`Check ${file}`, false, error.message);
    }
  }
}

// Main test runner
async function runCompleteTest() {
  console.log('🧪 Running Complete System Test\n');
  console.log('This test validates:');
  console.log('- Server startup and health');
  console.log('- UI rendering and layout');
  console.log('- Memory and task operations');
  console.log('- Cross-browser accessibility');
  console.log('- No hardcoded URLs\n');
  
  let serverProcess = null;
  const startTime = Date.now();
  
  try {
    // Start servers
    const { process: proc, apiPort } = await startServers();
    serverProcess = proc;
    
    // Wait for stabilization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run all tests
    await testServerHealth(apiPort);
    await testUIRendering();
    await testOperations(apiPort);
    await testCrossBrowserAccess(apiPort);
    await testNoHardcodedURLs();
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
  } finally {
    // Cleanup
    if (serverProcess) {
      log('\nCleaning up...', 'info');
      
      // Kill the process group
      try {
        process.kill(-serverProcess.pid);
      } catch (e) {
        serverProcess.kill();
      }
      
      // Clean up port file
      const portFile = path.join(__dirname, '..', '.dashboard-port');
      if (fs.existsSync(portFile)) {
        fs.unlinkSync(portFile);
      }
    }
  }
  
  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${RESULTS.passed.length}`);
  console.log(`❌ Failed: ${RESULTS.failed.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  
  const total = RESULTS.passed.length + RESULTS.failed.length;
  const rate = total > 0 ? ((RESULTS.passed.length / total) * 100).toFixed(1) : 0;
  console.log(`📈 Success Rate: ${rate}%`);
  
  if (RESULTS.screenshots.length > 0) {
    console.log(`\n📸 Screenshots saved:`);
    RESULTS.screenshots.forEach(s => console.log(`   - ${s}`));
  }
  
  if (RESULTS.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    RESULTS.failed.forEach(({ test, error }) => {
      console.log(`   - ${test}: ${error}`);
    });
    console.log('\n⚠️  System has issues that need fixing!');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED! System is ready for release.');
    process.exit(0);
  }
}

// Ensure clean exit
process.on('SIGINT', () => {
  console.log('\nTest interrupted, cleaning up...');
  process.exit(1);
});

// Run the test
runCompleteTest().catch(console.error);