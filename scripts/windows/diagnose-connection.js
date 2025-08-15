#!/usr/bin/env node

/**
 * Windows MCP Connection Diagnostic Tool
 * Safe, read-only diagnostic script to identify connection issues
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

console.log('🔍 Like-I-Said MCP Windows Connection Diagnostics');
console.log('=' .repeat(50));

const diagnostics = {
  environment: {},
  nodejs: {},
  filesystem: {},
  process: {},
  mcp: {},
  recommendations: []
};

// 1. Check Node.js Environment
console.log('\n📊 Node.js Environment:');
diagnostics.nodejs.version = process.version;
diagnostics.nodejs.platform = process.platform;
diagnostics.nodejs.arch = process.arch;
diagnostics.nodejs.execPath = process.execPath;

console.log(`  Version: ${diagnostics.nodejs.version}`);
console.log(`  Platform: ${diagnostics.nodejs.platform}`);
console.log(`  Architecture: ${diagnostics.nodejs.arch}`);
console.log(`  Executable: ${diagnostics.nodejs.execPath}`);

if (parseInt(process.version.slice(1)) < 16) {
  console.log('  ⚠️ WARNING: Node.js version is below v16');
  diagnostics.recommendations.push('Upgrade to Node.js v16 or higher');
}

// 2. Check TTY Detection
console.log('\n📊 TTY Detection:');
diagnostics.process.stdinTTY = process.stdin.isTTY;
diagnostics.process.stdoutTTY = process.stdout.isTTY;
diagnostics.process.stderrTTY = process.stderr.isTTY;

console.log(`  stdin.isTTY: ${process.stdin.isTTY || 'undefined'}`);
console.log(`  stdout.isTTY: ${process.stdout.isTTY || 'undefined'}`);
console.log(`  stderr.isTTY: ${process.stderr.isTTY || 'undefined'}`);

if (!process.stdin.isTTY) {
  console.log('  ⚠️ TTY not detected on stdin - this is normal for MCP mode');
  diagnostics.recommendations.push('Set MCP_MODE=true to explicitly enable MCP mode');
}

// 3. Check Environment Variables
console.log('\n📊 Environment Variables:');
const mcpVars = ['MCP_MODE', 'MCP_QUIET', 'DEBUG_MCP', 'NODE_ENV', 'MEMORY_DIR', 'TASK_DIR'];
mcpVars.forEach(varName => {
  const value = process.env[varName];
  diagnostics.environment[varName] = value || 'not set';
  console.log(`  ${varName}: ${value || '(not set)'}`);
});

if (!process.env.MCP_MODE) {
  diagnostics.recommendations.push('Set MCP_MODE=true for reliable Windows operation');
}

// 4. Check File System
console.log('\n📊 File System:');
const checkPaths = [
  { name: 'Root Directory', path: rootDir },
  { name: 'Server Script', path: path.join(rootDir, 'server-markdown.js') },
  { name: 'Wrapper Script', path: path.join(rootDir, 'mcp-server-wrapper.js') },
  { name: 'Memories Directory', path: path.join(rootDir, 'memories') },
  { name: 'Tasks Directory', path: path.join(rootDir, 'tasks') },
  { name: 'Package.json', path: path.join(rootDir, 'package.json') }
];

checkPaths.forEach(({ name, path: checkPath }) => {
  const exists = fs.existsSync(checkPath);
  const stats = exists ? fs.statSync(checkPath) : null;
  
  diagnostics.filesystem[name] = {
    exists,
    path: checkPath,
    isDirectory: stats?.isDirectory(),
    isFile: stats?.isFile(),
    readable: exists ? isReadable(checkPath) : false,
    writable: exists ? isWritable(checkPath) : false
  };
  
  console.log(`  ${name}:`);
  console.log(`    Path: ${checkPath}`);
  console.log(`    Exists: ${exists ? '✅' : '❌'}`);
  
  if (exists) {
    console.log(`    Type: ${stats.isDirectory() ? 'Directory' : 'File'}`);
    console.log(`    Readable: ${isReadable(checkPath) ? '✅' : '❌'}`);
    console.log(`    Writable: ${isWritable(checkPath) ? '✅' : '❌'}`);
  }
  
  if (!exists && (name === 'Memories Directory' || name === 'Tasks Directory')) {
    diagnostics.recommendations.push(`Create ${name}: mkdir "${checkPath}"`);
  }
});

// 5. Check MCP Server Response
console.log('\n📊 MCP Server Test:');
console.log('  Testing MCP server startup...');

testMCPServer().then(result => {
  diagnostics.mcp = result;
  
  if (result.success) {
    console.log('  ✅ MCP server responds correctly');
  } else {
    console.log('  ❌ MCP server test failed');
    console.log(`  Error: ${result.error}`);
    diagnostics.recommendations.push('Check server-markdown.js for errors');
  }
  
  // 6. Generate Report
  generateReport();
}).catch(error => {
  console.log(`  ❌ MCP server test error: ${error.message}`);
  diagnostics.mcp = { success: false, error: error.message };
  generateReport();
});

function isReadable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function isWritable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function testMCPServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(rootDir, 'server-markdown.js');
    
    if (!fs.existsSync(serverPath)) {
      resolve({ success: false, error: 'server-markdown.js not found' });
      return;
    }
    
    const child = spawn('node', [serverPath], {
      env: { ...process.env, MCP_MODE: 'true', MCP_QUIET: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let responded = false;
    
    // Send test message
    const testMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {}
      },
      id: 1
    }) + '\n';
    
    child.stdin.write(testMessage);
    
    // Set timeout
    const timeout = setTimeout(() => {
      if (!responded) {
        child.kill();
        resolve({
          success: false,
          error: 'Server did not respond within 5 seconds',
          stdout,
          stderr
        });
      }
    }, 5000);
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (!responded && stdout.includes('jsonrpc')) {
        responded = true;
        clearTimeout(timeout);
        child.kill();
        resolve({
          success: true,
          response: stdout
        });
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: error.message
      });
    });
    
    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (!responded) {
        resolve({
          success: false,
          error: `Server exited with code ${code}`,
          stdout,
          stderr
        });
      }
    });
  });
}

function generateReport() {
  console.log('\n' + '='.repeat(50));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  
  // Overall Status
  const issues = [];
  
  if (!process.env.MCP_MODE) {
    issues.push('MCP_MODE not set');
  }
  
  if (!diagnostics.filesystem['Memories Directory']?.exists) {
    issues.push('Memories directory missing');
  }
  
  if (!diagnostics.filesystem['Tasks Directory']?.exists) {
    issues.push('Tasks directory missing');
  }
  
  if (!diagnostics.mcp.success) {
    issues.push('MCP server not responding');
  }
  
  if (issues.length === 0) {
    console.log('\n✅ System appears to be configured correctly!');
  } else {
    console.log('\n⚠️ Issues detected:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  // Recommendations
  if (diagnostics.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    diagnostics.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  // Quick Fix Commands
  console.log('\n🔧 Quick Fix Commands:');
  console.log('  Run these commands to fix common issues:\n');
  
  console.log('  REM Set environment variables');
  console.log('  set MCP_MODE=true');
  console.log('  set MCP_QUIET=true');
  console.log('');
  console.log('  REM Create directories');
  console.log('  mkdir memories 2>nul');
  console.log('  mkdir tasks 2>nul');
  console.log('');
  console.log('  REM Test the server');
  console.log('  node mcp-server-wrapper.js');
  
  // Save diagnostic report
  const reportPath = path.join(rootDir, 'diagnostic-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
  console.log(`\n📄 Full diagnostic report saved to: ${reportPath}`);
  
  // Exit code based on issues
  process.exit(issues.length > 0 ? 1 : 0);
}