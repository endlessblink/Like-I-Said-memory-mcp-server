#!/usr/bin/env node

/**
 * Claude Desktop Installation Verification Script
 * 
 * This script helps users verify their Like-I-Said MCP Server installation
 * is working correctly with Claude Desktop.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function detectClaudeDesktopConfig() {
  const platform = process.platform;
  const homeDir = os.homedir();
  
  let configPath;
  switch (platform) {
    case 'win32':
      configPath = path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
      break;
    case 'darwin':
      configPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      break;
    case 'linux':
      configPath = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
      break;
    default:
      return null;
  }
  
  return fs.existsSync(configPath) ? configPath : null;
}

async function testMCPServer() {
  return new Promise((resolve) => {
    log('🧪 Testing MCP server functionality...', 'cyan');
    
    const server = spawn('node', [path.join(__dirname, 'server-markdown.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Send tools/list request
    server.stdin.write('{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}\\n');
    server.stdin.end();
    
    const timeout = setTimeout(() => {
      server.kill();
      log('⏰ MCP server test timed out', 'yellow');
      resolve(false);
    }, 5000);
    
    server.on('close', () => {
      clearTimeout(timeout);
      try {
        if (!output.trim()) {
          log('❌ No output from MCP server', 'red');
          resolve(false);
          return;
        }
        
        const response = JSON.parse(output.trim());
        const tools = response.result?.tools || [];
        
        if (tools.length === 23) {
          log(`✅ MCP server working with ${tools.length} tools`, 'green');
          resolve(true);
        } else {
          log(`❌ Expected 23 tools, found ${tools.length}`, 'red');
          resolve(false);
        }
      } catch (error) {
        log(`❌ MCP server test failed: ${error.message}`, 'red');
        resolve(false);
      }
    });
  });
}

function checkClaudeDesktopConfig(configPath) {
  log('📋 Checking Claude Desktop configuration...', 'cyan');
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const mcpServers = config.mcpServers || {};
    
    if (mcpServers['like-i-said-memory-v2']) {
      log('✅ Like-I-Said server found in Claude Desktop config', 'green');
      
      const serverConfig = mcpServers['like-i-said-memory-v2'];
      log(`   Command: ${serverConfig.command}`, 'blue');
      log(`   Args: ${JSON.stringify(serverConfig.args)}`, 'blue');
      
      return true;
    } else {
      log('❌ Like-I-Said server not found in Claude Desktop config', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Failed to read Claude Desktop config: ${error.message}`, 'red');
    return false;
  }
}

function checkProjectStructure() {
  log('📁 Checking project structure...', 'cyan');
  
  const requiredFiles = [
    'server-markdown.js',
    'mcp-server-wrapper.js',
    'package.json'
  ];
  
  const requiredDirs = [
    'memories',
    'lib'
  ];
  
  let allGood = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      log(`   ✅ ${file}`, 'green');
    } else {
      log(`   ❌ ${file} missing`, 'red');
      allGood = false;
    }
  }
  
  for (const dir of requiredDirs) {
    if (fs.existsSync(path.join(__dirname, dir))) {
      log(`   ✅ ${dir}/`, 'green');
    } else {
      log(`   ❌ ${dir}/ missing`, 'red');
      allGood = false;
    }
  }
  
  return allGood;
}

function generateConfigSuggestion() {
  const platform = process.platform;
  const projectPath = __dirname;
  
  log('\\n🔧 Suggested Claude Desktop Configuration:', 'blue');
  log('=' .repeat(45), 'blue');
  
  let suggestion;
  
  if (platform === 'win32') {
    const windowsPath = projectPath.replace(/\\\\/g, '\\\\').replace(/\\//g, '\\\\');
    suggestion = {
      "mcpServers": {
        "like-i-said-memory-v2": {
          "command": "cmd",
          "args": [
            "/c",
            `cd /d "${windowsPath}" && node mcp-server-wrapper.js`
          ],
          "env": {
            "MEMORY_MODE": "markdown",
            "DEBUG_MCP": "false"
          }
        }
      }
    };
  } else {
    suggestion = {
      "mcpServers": {
        "like-i-said-memory-v2": {
          "command": "node",
          "args": [path.join(projectPath, "mcp-server-wrapper.js")],
          "env": {
            "MEMORY_MODE": "markdown",
            "PROJECT_ROOT": projectPath
          }
        }
      }
    };
  }
  
  console.log(JSON.stringify(suggestion, null, 2));
}

async function main() {
  log('🚀 Like-I-Said MCP Server - Claude Desktop Verification', 'bold');
  log('=' .repeat(55), 'blue');
  
  // Check project structure
  const structureOK = checkProjectStructure();
  
  // Test MCP server
  const serverOK = await testMCPServer();
  
  // Check Claude Desktop config
  const configPath = detectClaudeDesktopConfig();
  let configOK = false;
  
  if (configPath) {
    log(`\\n📍 Found Claude Desktop config at: ${configPath}`, 'blue');
    configOK = checkClaudeDesktopConfig(configPath);
  } else {
    log('\\n❌ Claude Desktop config file not found', 'red');
    log('   Please ensure Claude Desktop is installed', 'yellow');
  }
  
  // Summary
  log('\\n📊 Verification Summary', 'bold');
  log('=' .repeat(22), 'blue');
  log(`Project Structure: ${structureOK ? '✅ OK' : '❌ Issues'}`, structureOK ? 'green' : 'red');
  log(`MCP Server: ${serverOK ? '✅ Working' : '❌ Issues'}`, serverOK ? 'green' : 'red');
  log(`Claude Config: ${configOK ? '✅ Configured' : '❌ Not Found'}`, configOK ? 'green' : 'red');
  
  const overallStatus = structureOK && serverOK && configOK;
  log(`\\nOverall Status: ${overallStatus ? '✅ READY' : '❌ NEEDS ATTENTION'}`, overallStatus ? 'green' : 'red');
  
  if (overallStatus) {
    log('\\n🎉 Your installation is ready for Claude Desktop!', 'green');
    log('\\n📋 Next steps:', 'blue');
    log('1. Restart Claude Desktop completely', 'yellow');
    log('2. Ask Claude: "What MCP tools do you have available?"', 'yellow');
    log('3. Test: "Can you store a test memory for me?"', 'yellow');
  } else {
    log('\\n⚠️  Issues detected. Please review the checks above.', 'yellow');
    
    if (!configOK) {
      generateConfigSuggestion();
      log('\\n💡 Copy the above configuration to your Claude Desktop config file.', 'cyan');
    }
    
    log('\\n🔧 Installation commands:', 'blue');
    log('npm install                  # Install dependencies', 'yellow');
    log('node cli.js install         # Auto-configure clients', 'yellow');
    log('node verify-installation.js # Run this script again', 'yellow');
  }
}

main().catch(error => {
  log(`💥 Verification failed: ${error.message}`, 'red');
  process.exit(1);
});