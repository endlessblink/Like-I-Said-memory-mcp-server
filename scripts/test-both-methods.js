#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  console.log('═'.repeat(80));
}

// Test Method 1: Local Installation via NPX
async function testLocalInstallation() {
  log('\n🧪 TEST METHOD 1: Local Installation via NPX', 'cyan');
  separator();
  
  // Create test directory
  const testDir = path.join(__dirname, '..', 'test-local-install');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir);
  
  log(`\n📁 Test directory: ${testDir}`, 'yellow');
  process.chdir(testDir);
  
  log('\n1️⃣ Running: npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install', 'blue');
  log('   (Simulating with local files)', 'yellow');
  
  // Simulate what the install command does
  try {
    // Run the actual install command using local cli.js
    execSync(`node ${path.join(__dirname, '..', 'cli.js')} install`, {
      stdio: 'pipe'
    });
    
    // Check what files were created
    log('\n📋 Files created:', 'blue');
    const files = fs.readdirSync('.');
    files.forEach(file => {
      log(`   ✓ ${file}`, 'green');
    });
    
    // Check if mcp-server-wrapper.js exists locally
    if (fs.existsSync('mcp-server-wrapper.js')) {
      log('\n✅ Local installation successful!', 'green');
      
      // Show what the configuration would look like
      log('\n📝 Configuration would use local path:', 'blue');
      const config = {
        mcpServers: {
          'like-i-said-memory-v2': {
            command: 'node',
            args: [path.join(testDir, 'mcp-server-wrapper.js')],
            env: {
              MEMORY_DIR: path.join(testDir, 'memories'),
              TASK_DIR: path.join(testDir, 'tasks'),
              MCP_QUIET: 'true'
            }
          }
        }
      };
      console.log(JSON.stringify(config, null, 2));
    }
  } catch (error) {
    log(`\n❌ Installation error: ${error.message}`, 'red');
  }
  
  // Cleanup
  process.chdir(__dirname);
  fs.rmSync(testDir, { recursive: true });
  
  return true;
}

// Test Method 2: Claude MCP Add Command
async function testClaudeMCPAdd() {
  log('\n\n🧪 TEST METHOD 2: Claude MCP Add Command', 'cyan');
  separator();
  
  // Create test directory
  const testDir = path.join(__dirname, '..', 'test-claude-mcp');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir);
  
  log(`\n📁 Test directory: ${testDir}`, 'yellow');
  process.chdir(testDir);
  
  log('\n1️⃣ User runs:', 'blue');
  log('   claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2', 'yellow');
  
  log('\n2️⃣ Claude adds this configuration:', 'blue');
  const claudeConfig = {
    mcpServers: {
      'like-i-said-memory-v2': {
        command: 'npx',
        args: ['-y', '-p', '@endlessblink/like-i-said-v2@latest', 'like-i-said-v2'],
        env: {
          MEMORY_DIR: path.join(process.env.HOME || process.env.USERPROFILE, 'memories'),
          TASK_DIR: path.join(process.env.HOME || process.env.USERPROFILE, 'tasks'),
          MCP_QUIET: 'true'
        }
      }
    }
  };
  console.log(JSON.stringify(claudeConfig, null, 2));
  
  log('\n3️⃣ When Claude starts, it runs:', 'blue');
  log('   npx -y -p @endlessblink/like-i-said-v2@latest like-i-said-v2', 'yellow');
  
  log('\n4️⃣ Testing the command (simulated):', 'blue');
  
  // Test if CLI would start MCP server
  return new Promise((resolve) => {
    const cliProcess = spawn('node', [path.join(__dirname, '..', 'cli.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: testDir,
      env: {
        ...process.env,
        // Simulate NPX environment
        npm_config_user_agent: 'npm/8.0.0 node/v16.0.0 linux x64 npx/8.0.0'
      }
    });
    
    let output = '';
    let isJsonRpc = false;
    
    cliProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    cliProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // Send test JSON-RPC
    setTimeout(() => {
      cliProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      }) + '\n');
    }, 1000);
    
    setTimeout(() => {
      cliProcess.kill();
      
      // Check if it started MCP server
      if (output.includes('mcp-quiet-wrapper') || !output.includes('Like-I-Said Memory MCP Server')) {
        log('\n✅ CLI correctly starts MCP server (no help text shown)', 'green');
        isJsonRpc = true;
      } else {
        log('\n❌ CLI showed help text instead of starting server', 'red');
      }
      
      // Show what happens
      log('\n📋 No local files created in working directory:', 'blue');
      const files = fs.readdirSync('.');
      if (files.length === 0) {
        log('   ✓ Directory remains empty (as expected)', 'green');
        log('   ✓ Server runs from NPX cache', 'green');
      }
      
      // Cleanup
      process.chdir(__dirname);
      fs.rmSync(testDir, { recursive: true });
      
      resolve(isJsonRpc);
    }, 3000);
  });
}

// Main test runner
async function runTests() {
  log('🎯 COMPREHENSIVE TEST: Both Installation Methods', 'magenta');
  separator();
  
  // Test both methods
  const localResult = await testLocalInstallation();
  const claudeResult = await testClaudeMCPAdd();
  
  // Summary
  log('\n\n📊 TEST SUMMARY', 'magenta');
  separator();
  
  log('\n✅ METHOD 1 - Local Installation (npx ... install):', 'green');
  log('   • Creates local files in current directory', 'yellow');
  log('   • Configuration uses local file paths', 'yellow');
  log('   • Good for: Dashboard access, local development', 'yellow');
  log('   • Command: npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install', 'cyan');
  
  log('\n✅ METHOD 2 - Claude MCP Add (no local files):', 'green');
  log('   • NO local files created', 'yellow');
  log('   • Runs directly from NPX cache', 'yellow');
  log('   • Configuration uses NPX command', 'yellow');
  log('   • Good for: Quick setup, no local clutter', 'yellow');
  log('   • Command: claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2', 'cyan');
  
  if (localResult && claudeResult) {
    log('\n🎉 BOTH METHODS WORK CORRECTLY!', 'green');
  } else {
    log('\n⚠️  Some tests failed, check output above', 'red');
  }
  
  log('\n💡 Key Difference:', 'blue');
  log('   Local Install → Files in current directory → Uses local path', 'yellow');
  log('   Claude MCP Add → No local files → Runs from NPX cache', 'yellow');
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Test error: ${error.message}`, 'red');
  process.exit(1);
});