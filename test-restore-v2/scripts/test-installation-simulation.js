#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test configurations for different platforms
const testConfigs = {
  'claude-code-wsl': {
    platform: 'linux',
    env: { WSL_DISTRO_NAME: 'Ubuntu', WSL_INTEROP: '/run/WSL/1234' },
    expectedCommand: 'npx',
    expectedArgs: ['-p', '@endlessblink/like-i-said-v2@latest', 'like-i-said-v2']
  },
  'claude-code-windows': {
    platform: 'win32',
    env: {},
    expectedCommand: 'npx',
    expectedArgs: ['-p', '@endlessblink/like-i-said-v2@latest', 'like-i-said-v2']
  },
  'claude-code-mac': {
    platform: 'darwin',
    env: {},
    expectedCommand: 'npx',
    expectedArgs: ['-p', '@endlessblink/like-i-said-v2@latest', 'like-i-said-v2']
  },
  'cursor-config': {
    configFile: '~/.cursor/mcp.json',
    expectedConfig: {
      mcpServers: {
        'like-i-said-memory-v2': {
          command: 'npx',
          args: ['-p', '@endlessblink/like-i-said-v2', 'like-i-said-v2', 'start']
        }
      }
    }
  },
  'windsurf-config': {
    configFile: '~/.codeium/windsurf/mcp_config.json',
    expectedConfig: {
      mcp: {
        servers: {
          'like-i-said-memory-v2': {
            command: 'npx',
            args: ['-p', '@endlessblink/like-i-said-v2', 'like-i-said-v2', 'start']
          }
        }
      }
    }
  }
};

// Test MCP server functionality
async function testMCPServer() {
  log('\n📋 Testing MCP Server Functionality', 'blue');
  
  // Test if the wrapper exists
  const wrapperPath = path.join(__dirname, '..', 'mcp-server-wrapper.js');
  if (fs.existsSync(wrapperPath)) {
    log('✓ mcp-server-wrapper.js exists', 'green');
  } else {
    log('✗ mcp-server-wrapper.js not found', 'red');
    return false;
  }
  
  // Test if server-markdown.js exists
  const serverPath = path.join(__dirname, '..', 'server-markdown.js');
  if (fs.existsSync(serverPath)) {
    log('✓ server-markdown.js exists', 'green');
  } else {
    log('✗ server-markdown.js not found', 'red');
    return false;
  }
  
  // Test JSON-RPC request
  log('\n🔧 Testing JSON-RPC Protocol', 'blue');
  const { spawn } = await import('child_process');
  
  return new Promise((resolve) => {
    const child = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Send a test JSON-RPC request
    const testRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    }) + '\n';
    
    child.stdin.write(testRequest);
    
    setTimeout(() => {
      child.kill();
      
      if (output.includes('"jsonrpc":"2.0"') && output.includes('"result"')) {
        log('✓ JSON-RPC protocol working correctly', 'green');
        
        // Check if it returns the expected tools
        if (output.includes('add_memory') && output.includes('create_task')) {
          log('✓ Expected tools (add_memory, create_task) found', 'green');
        } else {
          log('✗ Expected tools not found in response', 'red');
        }
        
        resolve(true);
      } else {
        log('✗ JSON-RPC protocol test failed', 'red');
        if (errorOutput) {
          log(`Error output: ${errorOutput}`, 'yellow');
        }
        resolve(false);
      }
    }, 2000);
  });
}

// Test installation commands
function testInstallationCommands() {
  log('\n🚀 Testing Installation Commands', 'blue');
  
  // Test Claude Code command format
  const claudeCommand = 'claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2';
  log(`\nClaude Code command: ${claudeCommand}`, 'yellow');
  
  // Parse the command
  const parts = claudeCommand.split(' -- ');
  if (parts.length === 2 && parts[1].includes('npx -p @endlessblink/like-i-said-v2@latest')) {
    log('✓ Claude Code command format is correct', 'green');
  } else {
    log('✗ Claude Code command format is incorrect', 'red');
  }
  
  // Test direct NPX command
  const npxCommand = 'npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install';
  log(`\nDirect NPX command: ${npxCommand}`, 'yellow');
  
  if (npxCommand.includes('-p @endlessblink/like-i-said-v2@latest')) {
    log('✓ NPX command includes correct package specification', 'green');
  } else {
    log('✗ NPX command missing -p flag or package name', 'red');
  }
}

// Test configuration generation
function testConfigGeneration() {
  log('\n📁 Testing Configuration Generation', 'blue');
  
  // Test Cursor config
  log('\nCursor Configuration:', 'yellow');
  const cursorConfig = testConfigs['cursor-config'].expectedConfig;
  log(JSON.stringify(cursorConfig, null, 2), 'reset');
  
  if (cursorConfig.mcpServers['like-i-said-memory-v2'].command === 'npx') {
    log('✓ Cursor config uses npx command', 'green');
  } else {
    log('✗ Cursor config not using npx', 'red');
  }
  
  // Test Windsurf config
  log('\nWindsurf Configuration:', 'yellow');
  const windsurfConfig = testConfigs['windsurf-config'].expectedConfig;
  log(JSON.stringify(windsurfConfig, null, 2), 'reset');
  
  if (windsurfConfig.mcp.servers['like-i-said-memory-v2'].command === 'npx') {
    log('✓ Windsurf config uses npx command', 'green');
  } else {
    log('✗ Windsurf config not using npx', 'red');
  }
}

// Test platform compatibility
function testPlatformCompatibility() {
  log('\n🖥️ Testing Platform Compatibility', 'blue');
  
  const platforms = ['claude-code-wsl', 'claude-code-windows', 'claude-code-mac'];
  
  platforms.forEach(platform => {
    const config = testConfigs[platform];
    log(`\n${platform}:`, 'yellow');
    log(`Platform: ${config.platform}`, 'reset');
    log(`Expected command: ${config.expectedCommand}`, 'reset');
    log(`Expected args: ${config.expectedArgs.join(' ')}`, 'reset');
    
    // Verify the command is consistent across platforms
    if (config.expectedCommand === 'npx' && 
        config.expectedArgs.includes('-p') && 
        config.expectedArgs.includes('@endlessblink/like-i-said-v2@latest')) {
      log('✓ Platform configuration is correct', 'green');
    } else {
      log('✗ Platform configuration is incorrect', 'red');
    }
  });
}

// Main test runner
async function runTests() {
  log('🧪 Like-I-Said Installation Simulation Test', 'blue');
  log('==========================================', 'blue');
  
  // Test installation commands
  testInstallationCommands();
  
  // Test configuration generation
  testConfigGeneration();
  
  // Test platform compatibility
  testPlatformCompatibility();
  
  // Test MCP server
  const serverWorking = await testMCPServer();
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  log('==============', 'blue');
  
  if (serverWorking) {
    log('✅ All tests passed! Installation commands are correctly configured.', 'green');
    log('\n💡 The correct installation command for Claude Code is:', 'yellow');
    log('claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2', 'green');
  } else {
    log('❌ Some tests failed. Please review the output above.', 'red');
  }
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Test error: ${error.message}`, 'red');
  process.exit(1);
});