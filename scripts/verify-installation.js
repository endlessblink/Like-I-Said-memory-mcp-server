#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
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

log('\n🔍 Verifying Like-I-Said Installation', 'blue');
log('=====================================\n', 'blue');

// Check command line arguments
const installPath = process.argv[2] || process.cwd();
log(`Checking installation at: ${installPath}`, 'blue');

// Verification checks
const checks = [];

// 1. Check core files
log('\n📁 Core Files:', 'yellow');
const coreFiles = [
  'mcp-server-wrapper.js',
  'server-markdown.js',
  'package.json',
  'lib/memory-storage-wrapper.js',
  'lib/task-storage.js'
];

for (const file of coreFiles) {
  const filePath = path.join(installPath, file);
  const exists = fs.existsSync(filePath);
  checks.push({ name: `Core file: ${file}`, success: exists });
  log(`  ${exists ? '✅' : '❌'} ${file}`, exists ? 'green' : 'red');
}

// 2. Check directories
log('\n📂 Directories:', 'yellow');
const directories = ['memories', 'tasks', 'lib'];

for (const dir of directories) {
  const dirPath = path.join(installPath, dir);
  const exists = fs.existsSync(dirPath);
  checks.push({ name: `Directory: ${dir}`, success: exists });
  log(`  ${exists ? '✅' : '❌'} ${dir}/`, exists ? 'green' : 'red');
}

// 3. Check MCP configurations
log('\n⚙️  MCP Client Configurations:', 'yellow');
const homeDir = os.homedir();
const platform = process.platform;

const configPaths = {
  'Claude Desktop': {
    darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    win32: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
    linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
  },
  'Claude Code (VS Code Extension)': {
    darwin: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
    win32: path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json'),
    linux: path.join(homeDir, '.config', 'Code', 'User', 'settings.json')
  },
  'Cursor': {
    all: path.join(homeDir, '.cursor', 'mcp.json')
  },
  'Windsurf': {
    all: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json')
  }
};

let foundAnyConfig = false;

for (const [client, paths] of Object.entries(configPaths)) {
  const configPath = paths.all || paths[platform];
  if (configPath && fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      let hasLikeISaid = false;
      
      // Check different possible locations for the config
      if (config.mcpServers?.['like-i-said-memory-v2'] || 
          config.mcpServers?.['like-i-said-memory'] ||
          config.mcp?.servers?.['like-i-said-memory-v2']) {
        hasLikeISaid = true;
        foundAnyConfig = true;
      }
      
      checks.push({ name: `${client} configuration`, success: hasLikeISaid });
      log(`  ${hasLikeISaid ? '✅' : '⚠️ '} ${client} ${hasLikeISaid ? 'configured' : 'found but not configured'}`, 
          hasLikeISaid ? 'green' : 'yellow');
      
      if (hasLikeISaid) {
        // Check if paths point to our installation
        const serverConfig = config.mcpServers?.['like-i-said-memory-v2'] || 
                           config.mcpServers?.['like-i-said-memory'] ||
                           config.mcp?.servers?.['like-i-said-memory-v2'];
        
        if (serverConfig && serverConfig.args) {
          const configuredPath = serverConfig.args[0];
          const normalizedConfigPath = path.normalize(configuredPath);
          const normalizedInstallPath = path.normalize(path.join(installPath, 'mcp-server-wrapper.js'));
          
          if (normalizedConfigPath === normalizedInstallPath) {
            log(`      Points to this installation ✓`, 'green');
          } else {
            log(`      Points to different installation: ${configuredPath}`, 'yellow');
          }
        }
      }
    } catch (error) {
      log(`  ❌ ${client} configuration error: ${error.message}`, 'red');
    }
  }
}

// Check Claude Code CLI separately
log('\n🖥️  Claude Code CLI:', 'yellow');
try {
  const claudeVersion = execSync('claude --version', { encoding: 'utf8' }).trim();
  log(`  ✅ Claude CLI found: ${claudeVersion}`, 'green');
  
  try {
    const mcpList = execSync('claude mcp list', { encoding: 'utf8' });
    if (mcpList.includes('like-i-said-memory')) {
      log(`  ✅ like-i-said-memory-v2 configured in Claude Code CLI`, 'green');
      foundAnyConfig = true;
      checks.push({ name: 'Claude Code CLI configuration', success: true });
    } else {
      log(`  ⚠️  like-i-said-memory-v2 not found in Claude Code CLI`, 'yellow');
      checks.push({ name: 'Claude Code CLI configuration', success: false });
    }
  } catch (error) {
    log(`  ⚠️  Could not list MCP servers: ${error.message}`, 'yellow');
    checks.push({ name: 'Claude Code CLI configuration', success: false });
  }
} catch (error) {
  log(`  ⚠️  Claude Code CLI not found`, 'yellow');
  log('     Install with: npm install -g @anthropic/claude-cli', 'yellow');
}

if (!foundAnyConfig) {
  log('  ⚠️  No MCP client configurations found', 'yellow');
  log('     This is normal if you haven\'t installed any MCP clients yet', 'yellow');
}

// 4. Check Node.js version
log('\n🟢 Node.js Version:', 'yellow');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
const versionOk = majorVersion >= 18;
checks.push({ name: 'Node.js version', success: versionOk });
log(`  ${versionOk ? '✅' : '❌'} ${nodeVersion} ${versionOk ? '(OK)' : '(requires v18+)'}`, 
    versionOk ? 'green' : 'red');

// 5. Check permissions
log('\n🔐 Permissions:', 'yellow');
try {
  const testFile = path.join(installPath, 'memories', '.test-write');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  checks.push({ name: 'Write permissions', success: true });
  log('  ✅ Write permissions OK', 'green');
} catch (error) {
  checks.push({ name: 'Write permissions', success: false });
  log('  ❌ Write permissions failed', 'red');
}

// Summary
log('\n📊 Summary:', 'blue');
const passed = checks.filter(c => c.success).length;
const total = checks.length;
const allPassed = passed === total;

log(`  Total checks: ${total}`, 'blue');
log(`  Passed: ${passed}`, 'green');
log(`  Failed: ${total - passed}`, total - passed > 0 ? 'red' : 'green');

if (allPassed) {
  log('\n✅ Installation verified successfully!', 'green');
  log('\n🚀 Next steps:', 'blue');
  log('  1. Restart your MCP client (Claude Desktop, Cursor, etc.)', 'yellow');
  log('  2. Ask Claude: "What MCP tools do you have available?"', 'yellow');
  log('  3. You should see 27 tools including add_memory, create_task, etc.', 'yellow');
} else {
  log('\n⚠️  Some checks failed', 'yellow');
  log('\n🔧 Troubleshooting:', 'blue');
  if (!coreFiles.every(f => fs.existsSync(path.join(installPath, f)))) {
    log('  • Run the installer again: npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install', 'yellow');
  }
  if (!foundAnyConfig) {
    log('  • Make sure you have an MCP client installed (Claude Desktop, Cursor, etc.)', 'yellow');
  }
}

// Exit code
process.exit(allPassed ? 0 : 1);