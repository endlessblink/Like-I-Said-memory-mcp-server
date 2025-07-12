#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

console.log('🔍 Claude Desktop MCP Diagnostic Tool\n');

// Detect environment
const isWSL = process.platform === 'linux' && (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
const platform = process.platform;
const homeDir = os.homedir();

console.log('📊 System Information:');
console.log(`Platform: ${platform}`);
console.log(`WSL: ${isWSL ? 'Yes - ' + (process.env.WSL_DISTRO_NAME || 'Unknown distro') : 'No'}`);
console.log(`Node.js: ${process.version}`);
console.log(`Home Directory: ${homeDir}`);

if (isWSL) {
  console.log('\n⚠️  WSL Detected! Special configuration needed for Claude Desktop on Windows.\n');
  
  // Get Windows username
  let windowsUsername = 'YourWindowsUsername';
  try {
    const whoamiResult = require('child_process').execSync('cmd.exe /c echo %USERNAME%', { encoding: 'utf8' }).trim();
    if (whoamiResult && !whoamiResult.includes('%')) {
      windowsUsername = whoamiResult;
    }
  } catch (e) {
    console.log('Could not detect Windows username automatically.');
  }
  
  // WSL-specific paths
  const wslPath = process.cwd();
  const windowsPath = wslPath.replace('/home/', '/mnt/c/Users/').replace(/\//g, '\\');
  
  console.log('🔧 WSL to Windows Path Conversion:');
  console.log(`WSL Path: ${wslPath}`);
  console.log(`Windows Path (estimated): ${windowsPath}`);
  
  console.log('\n📝 Claude Desktop Configuration for WSL:\n');
  console.log('Option 1: Use WSL path directly (recommended):');
  console.log(JSON.stringify({
    mcpServers: {
      "like-i-said-memory-v2": {
        command: "wsl",
        args: [
          "-e",
          "node",
          wslPath + "/server-markdown.js"
        ],
        env: {}
      }
    }
  }, null, 2));
  
  console.log('\nOption 2: Use bash -c wrapper:');
  console.log(JSON.stringify({
    mcpServers: {
      "like-i-said-memory-v2": {
        command: "wsl",
        args: [
          "-e",
          "bash",
          "-c",
          `cd ${wslPath} && node server-markdown.js`
        ],
        env: {}
      }
    }
  }, null, 2));
  
  console.log('\nOption 3: Create Windows batch file wrapper:');
  console.log('Create a file like-i-said-mcp.bat in Windows with:');
  console.log(`@echo off
wsl -e bash -c "cd ${wslPath} && node server-markdown.js"`);
  console.log('\nThen use in Claude config:');
  console.log(JSON.stringify({
    mcpServers: {
      "like-i-said-memory-v2": {
        command: "C:\\path\\to\\like-i-said-mcp.bat",
        args: [],
        env: {}
      }
    }
  }, null, 2));
  
  console.log(`\n📁 Claude Desktop config location on Windows:`);
  console.log(`C:\\Users\\${windowsUsername}\\AppData\\Roaming\\Claude\\claude_desktop_config.json`);
  
} else {
  // Non-WSL configuration
  const serverPath = path.join(process.cwd(), 'server-markdown.js');
  
  console.log('\n📝 Standard Claude Desktop Configuration:');
  console.log(JSON.stringify({
    mcpServers: {
      "like-i-said-memory-v2": {
        command: "node",
        args: [serverPath],
        env: {}
      }
    }
  }, null, 2));
}

// Test the server with stdio
console.log('\n🧪 Testing MCP Server with STDIO...');
const testProcess = spawn('node', ['server-markdown.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

// Send test request
testProcess.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
}) + '\n');

let output = '';
let errorOutput = '';

testProcess.stdout.on('data', (data) => {
  output += data.toString();
});

testProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

setTimeout(() => {
  testProcess.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  }) + '\n');
}, 500);

setTimeout(() => {
  testProcess.kill();
  
  console.log('\n📊 Test Results:');
  
  if (output.includes('"result"') && output.includes('"tools"')) {
    console.log('✅ Server is responding correctly to MCP requests!');
    
    // Parse and show tool count
    try {
      const toolsMatch = output.match(/"tools":\s*\[(.*?)\]/s);
      if (toolsMatch) {
        const toolCount = (toolsMatch[1].match(/"name"/g) || []).length;
        console.log(`✅ Found ${toolCount} tools registered`);
      }
    } catch (e) {}
  } else {
    console.log('❌ Server did not respond with expected MCP format');
    console.log('Output received:', output.substring(0, 200) + '...');
  }
  
  if (errorOutput.includes('error') || errorOutput.includes('Error')) {
    console.log('\n⚠️  Errors detected in stderr:');
    console.log(errorOutput.substring(0, 500));
  }
  
  console.log('\n💡 Troubleshooting Tips:');
  console.log('1. Make sure Claude Desktop is fully restarted after config changes');
  console.log('2. Check Claude Desktop developer tools for errors (Ctrl+Shift+I)');
  console.log('3. Ensure Node.js is in system PATH (especially on Windows)');
  if (isWSL) {
    console.log('4. For WSL: Make sure WSL is running and accessible from Windows');
    console.log('5. Try running "wsl -e node --version" from Windows CMD to verify WSL access');
  }
  
}, 2000);