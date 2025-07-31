#!/usr/bin/env node

/**
 * Test that actually verifies UI can connect to API
 * This test would have caught the WebSocket and API connection issues
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUIAPIConnection() {
  console.log('🧪 Testing UI-API Connection\n');
  
  let serverProcess = null;
  let browser = null;
  
  try {
    // Start servers
    console.log('🚀 Starting servers...');
    serverProcess = spawn('npm', ['run', 'dev:full'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      detached: false
    });
    
    // Wait for servers to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);
      
      let apiReady = false;
      let uiReady = false;
      
      serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(`[SERVER] ${text.trim()}`);
        
        if (text.includes('API server responding correctly')) {
          apiReady = true;
        }
        if (text.includes('ready in') && text.includes('ms')) {
          uiReady = true;
        }
        
        if (apiReady && uiReady) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error(`[ERROR] ${data.toString().trim()}`);
      });
    });
    
    // Wait a bit for stabilization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Launch browser
    console.log('\n🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to false to see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs and errors
    const consoleLogs = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log(`❌ [CONSOLE ERROR] ${text}`);
      } else if (msg.type() === 'warn') {
        console.log(`⚠️  [CONSOLE WARN] ${text}`);
      } else {
        consoleLogs.push(text);
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(error.toString());
      console.log(`❌ [PAGE ERROR] ${error}`);
    });
    
    // Navigate to UI
    console.log('\n📍 Navigating to UI...');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for app to load
    await page.waitForSelector('.app-container', { timeout: 10000 });
    console.log('✅ UI loaded');
    
    // Check for WebSocket connection
    const wsConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if WebSocket connects within 5 seconds
        let connected = false;
        const checkInterval = setInterval(() => {
          const wsIndicator = document.querySelector('[data-ws-status="connected"]');
          if (wsIndicator || window.wsConnected) {
            connected = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(connected);
        }, 5000);
      });
    });
    
    if (wsConnected) {
      console.log('✅ WebSocket connected');
    } else {
      console.log('❌ WebSocket failed to connect');
    }
    
    // Check if memories load
    const memoriesLoaded = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const memoryCards = document.querySelectorAll('.memory-card');
          const loadingIndicator = document.querySelector('.loading-spinner');
          const errorMessage = document.querySelector('.error-message');
          
          if (errorMessage) {
            resolve({ loaded: false, error: errorMessage.textContent });
          } else if (memoryCards.length > 0 || !loadingIndicator) {
            resolve({ loaded: true, count: memoryCards.length });
          } else {
            resolve({ loaded: false, error: 'Still loading' });
          }
        }, 5000);
      });
    });
    
    if (memoriesLoaded.loaded) {
      console.log(`✅ Memories loaded: ${memoriesLoaded.count || 0} items`);
    } else {
      console.log(`❌ Memories failed to load: ${memoriesLoaded.error}`);
    }
    
    // Check if API calls work
    const apiWorks = await page.evaluate(async () => {
      try {
        // Get API port from dashboard
        const portResponse = await fetch('/api/port');
        const portData = await portResponse.json();
        const apiPort = portData.port || 3001;
        
        // Test the root route
        const rootResponse = await fetch(`http://localhost:${apiPort}/`);
        const rootData = await rootResponse.json();
        
        // Test the status endpoint
        const response = await fetch(`http://localhost:${apiPort}/api/status`);
        const data = await response.json();
        
        return { 
          success: true, 
          data,
          rootOk: rootResponse.status === 200 && rootData.status === 'ok',
          apiPort 
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (apiWorks.success) {
      console.log(`✅ API calls work (port: ${apiWorks.apiPort})`);
      if (apiWorks.rootOk) {
        console.log('✅ Root route returns 200 OK');
      } else {
        console.log('❌ Root route validation failed');
      }
    } else {
      console.log(`❌ API calls failed: ${apiWorks.error}`);
    }
    
    // Take screenshot
    await fs.promises.mkdir(path.join(__dirname, 'screenshots'), { recursive: true });
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'ui-api-test.png'),
      fullPage: true 
    });
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors found:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    const allPassed = wsConnected && memoriesLoaded.loaded && apiWorks.success && consoleErrors.length === 0;
    
    if (allPassed) {
      console.log('\n✅ All UI-API connection tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ UI-API connection tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (browser) await browser.close();
    if (serverProcess) {
      try {
        process.kill(-serverProcess.pid);
      } catch (e) {
        serverProcess.kill();
      }
    }
    
    // Clean up port file
    const portFile = path.join(__dirname, '..', '.dashboard-port');
    if (fs.existsSync(portFile)) {
      fs.unlinkSync(portFile);
    }
  }
}

// Run test
testUIAPIConnection().catch(console.error);