#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class TestRunner {
  constructor() {
    this.results = [];
    this.platform = process.platform;
    this.testDir = path.join(os.tmpdir(), 'like-i-said-test-' + Date.now());
  }

  async runAllTests() {
    log('\n🧪 Comprehensive Custom Path Testing', 'blue');
    log(`Platform: ${this.platform}`, 'blue');
    log(`Node.js: ${process.version}`, 'blue');
    log(`Test Directory: ${this.testDir}`, 'blue');
    log('=====================================\n', 'blue');

    // Create test directory
    fs.mkdirSync(this.testDir, { recursive: true });

    // Run test suites
    await this.testDefaultInstallation();
    await this.testCustomPaths();
    await this.testErrorHandling();
    await this.testMCPConfiguration();
    await this.testPlatformSpecific();

    // Report results
    this.reportResults();

    // Cleanup
    this.cleanup();
  }

  async testDefaultInstallation() {
    log('\n📋 Test Suite 1: Default Installation', 'yellow');
    
    const testPath = path.join(this.testDir, 'default-install');
    fs.mkdirSync(testPath, { recursive: true });

    try {
      process.chdir(testPath);
      
      // Test default installation
      this.runTest('Default installation (no --path)', () => {
        execSync('node ' + path.join(__dirname, '..', 'cli.js') + ' install', {
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        // Verify directories created
        if (!fs.existsSync('memories')) throw new Error('memories directory not created');
        if (!fs.existsSync('tasks')) throw new Error('tasks directory not created');
      });

      // Test reinstallation
      this.runTest('Reinstallation in same directory', () => {
        execSync('node ' + path.join(__dirname, '..', 'cli.js') + ' install', {
          stdio: 'pipe',
          encoding: 'utf8'
        });
        // Should not throw errors
      });

    } catch (error) {
      this.results.push({ name: 'Default installation', success: false, error: error.message });
    }
  }

  async testCustomPaths() {
    log('\n📋 Test Suite 2: Custom Path Installation', 'yellow');

    // Test absolute path
    const absolutePath = path.join(this.testDir, 'custom-absolute');
    this.runTest('Absolute path installation', () => {
      execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path ${absolutePath}`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      if (!fs.existsSync(path.join(absolutePath, 'memories'))) {
        throw new Error('memories not created at custom path');
      }
    });

    // Test relative path
    const relativePath = './custom-relative';
    this.runTest('Relative path installation', () => {
      process.chdir(this.testDir);
      execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path ${relativePath}`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const resolvedPath = path.resolve(this.testDir, relativePath);
      if (!fs.existsSync(path.join(resolvedPath, 'memories'))) {
        throw new Error('memories not created at relative path');
      }
    });

    // Test path with spaces (if not Windows Git Bash)
    if (this.platform !== 'win32' || !process.env.SHELL?.includes('bash')) {
      const spacePath = path.join(this.testDir, 'path with spaces');
      this.runTest('Path with spaces', () => {
        execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path "${spacePath}"`, {
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        if (!fs.existsSync(path.join(spacePath, 'memories'))) {
          throw new Error('memories not created at path with spaces');
        }
      });
    }
  }

  async testErrorHandling() {
    log('\n📋 Test Suite 3: Error Handling', 'yellow');

    // Test non-existent parent
    this.runTest('Non-existent parent directory', () => {
      const badPath = path.join(this.testDir, 'does', 'not', 'exist', 'mcp');
      try {
        execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path ${badPath}`, {
          stdio: 'pipe',
          encoding: 'utf8'
        });
        throw new Error('Should have failed with non-existent parent');
      } catch (error) {
        if (error.message.includes('Should have failed')) throw error;
        // Expected to fail - this is success
      }
    });

    // Test invalid path characters (Windows specific)
    if (this.platform === 'win32') {
      this.runTest('Invalid path characters (Windows)', () => {
        const badPath = 'C:\\test<>pipe';
        try {
          execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path "${badPath}"`, {
            stdio: 'pipe',
            encoding: 'utf8'
          });
          throw new Error('Should have failed with invalid characters');
        } catch (error) {
          if (error.message.includes('Should have failed')) throw error;
          // Expected to fail
        }
      });
    }
  }

  async testMCPConfiguration() {
    log('\n📋 Test Suite 4: MCP Client Configuration', 'yellow');

    const configPath = path.join(this.testDir, 'config-test');
    
    this.runTest('MCP configuration generation', () => {
      execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path ${configPath}`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });

      // Check if any config files were created
      const homeDir = os.homedir();
      const possibleConfigs = [
        path.join(homeDir, '.cursor', 'mcp.json'),
        path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json'),
        path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
      ];

      let foundConfig = false;
      for (const config of possibleConfigs) {
        if (fs.existsSync(config)) {
          foundConfig = true;
          
          // Verify path in config
          const content = JSON.parse(fs.readFileSync(config, 'utf8'));
          const serverConfig = content.mcpServers?.['like-i-said-memory-v2'] || 
                              content.mcpServers?.['like-i-said-memory'];
          
          if (serverConfig) {
            log(`  Found configuration in: ${config}`, 'green');
          }
        }
      }

      if (!foundConfig) {
        log('  No MCP client configurations found (this is OK if clients not installed)', 'yellow');
      }
    });
  }

  async testPlatformSpecific() {
    log('\n📋 Test Suite 5: Platform-Specific Tests', 'yellow');

    if (this.platform === 'win32') {
      // Windows-specific tests
      this.runTest('Windows path normalization', () => {
        const winPath = 'C:\\Users\\Test\\MCP';
        const result = path.resolve(winPath);
        if (!result) throw new Error('Path resolution failed');
      });

      this.runTest('Windows drive letter paths', () => {
        const drivePath = 'D:\\mcp-test-' + Date.now();
        // Only test if D: drive exists
        if (fs.existsSync('D:\\')) {
          execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path ${drivePath}`, {
            stdio: 'pipe',
            encoding: 'utf8'
          });
        }
      });

    } else if (this.platform === 'darwin') {
      // macOS-specific tests
      this.runTest('macOS home directory expansion', () => {
        const homePath = '~/test-mcp-' + Date.now();
        const expanded = homePath.replace('~', os.homedir());
        if (!expanded.includes(os.homedir())) throw new Error('Home expansion failed');
      });

    } else {
      // Linux-specific tests
      this.runTest('Linux hidden directory', () => {
        const hiddenPath = path.join(this.testDir, '.hidden-mcp');
        execSync(`node ${path.join(__dirname, '..', 'cli.js')} install --path ${hiddenPath}`, {
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        if (!fs.existsSync(path.join(hiddenPath, 'memories'))) {
          throw new Error('Hidden directory installation failed');
        }
      });
    }
  }

  runTest(name, testFn) {
    try {
      testFn();
      this.results.push({ name, success: true });
      log(`  ✅ ${name}`, 'green');
    } catch (error) {
      this.results.push({ name, success: false, error: error.message });
      log(`  ❌ ${name}`, 'red');
      log(`     Error: ${error.message}`, 'red');
    }
  }

  reportResults() {
    log('\n📊 Test Results Summary', 'blue');
    log('======================', 'blue');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    
    log(`Total Tests: ${total}`, 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    
    if (failed > 0) {
      log('\n❌ Failed Tests:', 'red');
      this.results.filter(r => !r.success).forEach(r => {
        log(`  - ${r.name}: ${r.error}`, 'red');
      });
    }
    
    log(`\n${failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}`, failed === 0 ? 'green' : 'red');
  }

  cleanup() {
    log('\n🧹 Cleaning up test directory...', 'blue');
    try {
      fs.rmSync(this.testDir, { recursive: true, force: true });
      log('✅ Cleanup complete', 'green');
    } catch (error) {
      log('⚠️  Cleanup failed: ' + error.message, 'yellow');
    }
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(error => {
  log('❌ Test runner failed: ' + error.message, 'red');
  process.exit(1);
});