#!/usr/bin/env node

/**
 * Universal MCP Client Setup Script
 * 
 * Automatically configures all supported MCP clients:
 * - Claude Desktop
 * - Claude Code (VS Code)
 * - Cursor
 * - Windsurf
 * 
 * Works on Windows, WSL, macOS, and Linux
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Detect environment
const platform = process.platform;
const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP;
const homeDir = os.homedir();
const serverPath = path.join(__dirname, 'mcp-server-clean.js');

log('🚀 Universal MCP Client Setup', 'cyan');
log(`Platform: ${platform}${isWSL ? ' (WSL)' : ''}`, 'blue');
log(`Server Path: ${serverPath}`, 'blue');

// Configuration for each client
const clients = {
  'Claude Desktop': {
    paths: {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      win32: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
      linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
    },
    config: (serverPath, isWSL) => {
      if (isWSL || platform === 'win32') {
        return {
          mcpServers: {
            "like-i-said-memory-v2": {
              command: "wsl",
              args: ["-e", "node", serverPath],
              env: {}
            }
          }
        };
      }
      return {
        mcpServers: {
          "like-i-said-memory-v2": {
            command: "node",
            args: [serverPath],
            env: {}
          }
        }
      };
    }
  },
  'Cursor': {
    paths: {
      darwin: path.join(homeDir, '.cursor', 'mcp.json'),
      win32: path.join(homeDir, '.cursor', 'mcp.json'),
      linux: path.join(homeDir, '.cursor', 'mcp.json')
    },
    config: (serverPath) => ({
      mcpServers: {
        "like-i-said-memory-v2": {
          command: "node",
          args: [serverPath]
        }
      }
    })
  },
  'Windsurf': {
    paths: {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
      win32: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
      linux: path.join(homeDir, '.config', 'Windsurf', 'User', 'settings.json')
    },
    config: (serverPath) => ({
      mcp: {
        servers: {
          "like-i-said-memory-v2": {
            command: "node",
            args: [serverPath]
          }
        }
      }
    })
  },
  'Claude Code': {
    paths: {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
      win32: path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json'),
      linux: path.join(homeDir, '.config', 'Code', 'User', 'settings.json')
    },
    isVSCode: true,
    config: (serverPath) => ({
      "claude.mcpServers": {
        "like-i-said-memory-v2": {
          command: "node",
          args: [serverPath]
        }
      }
    })
  }
};

// Helper function to ensure directory exists
function ensureDir(filepath) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`, 'green');
  }
}

// Helper function to backup existing config
function backupConfig(filepath) {
  if (fs.existsSync(filepath)) {
    const backupPath = `${filepath}.backup.${Date.now()}`;
    fs.copyFileSync(filepath, backupPath);
    log(`Backed up existing config to: ${backupPath}`, 'yellow');
    return true;
  }
  return false;
}

// Helper function to merge configurations
function mergeConfigs(existing, newConfig) {
  return { ...existing, ...newConfig };
}

// Setup each client
let successCount = 0;
let failureCount = 0;

for (const [clientName, clientInfo] of Object.entries(clients)) {
  log(`\n📦 Setting up ${clientName}...`, 'cyan');
  
  const configPath = clientInfo.paths[platform];
  if (!configPath) {
    log(`❌ No configuration path for ${clientName} on ${platform}`, 'red');
    failureCount++;
    continue;
  }
  
  try {
    ensureDir(configPath);
    
    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      if (clientInfo.isVSCode) {
        // VS Code settings need special handling
        backupConfig(configPath);
        const content = fs.readFileSync(configPath, 'utf8');
        existingConfig = JSON.parse(content);
      } else {
        backupConfig(configPath);
        const content = fs.readFileSync(configPath, 'utf8');
        existingConfig = JSON.parse(content);
      }
    }
    
    const newConfig = clientInfo.config(serverPath, isWSL);
    const mergedConfig = mergeConfigs(existingConfig, newConfig);
    
    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
    log(`✅ Configured ${clientName} at: ${configPath}`, 'green');
    successCount++;
    
  } catch (error) {
    log(`❌ Failed to setup ${clientName}: ${error.message}`, 'red');
    failureCount++;
  }
}

// Test the server
log('\n🧪 Testing MCP server...', 'cyan');
try {
  const testResult = execSync(`echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node "${serverPath}"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  if (testResult.includes('"result"') && testResult.includes('"tools"')) {
    log('✅ MCP server is working correctly!', 'green');
  } else {
    log('⚠️  MCP server responded but may have issues', 'yellow');
  }
} catch (error) {
  log('❌ Failed to test MCP server', 'red');
}

// Summary
log('\n📊 Setup Summary:', 'cyan');
log(`✅ Successfully configured: ${successCount} clients`, 'green');
if (failureCount > 0) {
  log(`❌ Failed to configure: ${failureCount} clients`, 'red');
}

log('\n💡 Next Steps:', 'cyan');
log('1. Restart any running MCP clients', 'yellow');
log('2. The Like-I-Said memory tools should now appear in your clients', 'yellow');
log('3. If tools don\'t appear, check the client\'s developer console for errors', 'yellow');

if (isWSL) {
  log('\n🐧 WSL-Specific Notes:', 'cyan');
  log('- Claude Desktop on Windows will use WSL to run the server', 'yellow');
  log('- Make sure WSL is running before starting Claude Desktop', 'yellow');
  log('- You can test WSL access with: wsl -e node --version', 'yellow');
}

log('\n✨ Setup complete!', 'green');