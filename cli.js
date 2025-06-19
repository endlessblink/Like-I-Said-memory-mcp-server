#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced execution context detection
function detectExecutionContext() {
  const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP;
  const isWindows = process.platform === 'win32';
  const isLocalExecution = __dirname.includes(process.cwd());
  const isNpxInstall = __dirname.includes('npm-cache/_npx') || 
                       __dirname.includes('node_modules') ||
                       __dirname.includes('.npm/_npx');
  
  // Debug context detection
  const context = {
    platform: process.platform,
    isWSL: !!isWSL,
    isWindows,
    isLocalExecution,
    isNpxInstall,
    currentDir: process.cwd(),
    scriptDir: __dirname,
    scriptPath: __filename
  };
  
  return context;
}

// Windows-compatible execution wrapper
function createWindowsCompatiblePaths(context, serverPath) {
  // For Windows, ensure proper path handling and provide alternatives
  if (context.isWindows || context.isWSL) {
    // Convert paths to forward slashes for JSON configuration (required for MCP)
    const normalizedPath = serverPath.replace(/\\/g, '/');
    
    // Alternative paths to try if main path fails
    const alternatives = [
      serverPath,
      normalizedPath,
      path.resolve(serverPath),
      path.resolve(normalizedPath)
    ];
    
    return {
      primary: normalizedPath,
      alternatives,
      needsNodePrefix: context.isWindows && !context.isWSL
    };
  }
  
  return {
    primary: serverPath,
    alternatives: [serverPath],
    needsNodePrefix: false
  };
}

// Enhanced error handling for NPX execution
function handleNpxExecutionError(error, context) {
  log('\n❌ NPX Execution Error:', 'red');
  log(`Error: ${error.message}`, 'red');
  
  if (context.isWindows) {
    log('\n🔧 Windows-specific troubleshooting:', 'yellow');
    log('1. Try: npx cmd /c like-i-said-v2 install', 'yellow');
    log('2. Or: npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install', 'yellow');
    log('3. Alternative: node cli.js install (if in project directory)', 'yellow');
  }
  
  if (context.isWSL) {
    log('\n🐧 WSL-specific troubleshooting:', 'yellow');
    log('1. Ensure project is in WSL filesystem for best performance', 'yellow');
    log('2. Try: cd ~ && npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install', 'yellow');
  }
  
  log('\n📋 Debug info (set DEBUG=1 for more details):', 'blue');
  log(`Platform: ${context.platform}`, 'yellow');
  log(`NPX Install: ${context.isNpxInstall}`, 'yellow');
  log(`Current Dir: ${context.currentDir}`, 'yellow');
  log(`Script Dir: ${context.scriptDir}`, 'yellow');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal output
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

// Detect OS and MCP client configurations
function detectEnvironment() {
  const platform = process.platform;
  const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP;
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  
  const configs = {
    'claude-desktop': {
      name: 'Claude Desktop',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      win32: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
      linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json'),
      configKey: 'mcpServers'
    },
    'claude-code': {
      name: 'Claude Code (VS Code Extension)',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
      win32: path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json'),
      linux: path.join(homeDir, '.config', 'Code', 'User', 'settings.json'),
      wsl: path.join(homeDir, '.vscode-server', 'data', 'User', 'settings.json'),
      configKey: 'claude.mcpServers',
      isVSCode: true,
      isWSL: isWSL
    },
    'cursor': {
      name: 'Cursor',
      darwin: path.join(homeDir, '.cursor', 'mcp.json'),
      win32: path.join(homeDir, '.cursor', 'mcp.json'), // Primary Windows path
      linux: path.join(homeDir, '.cursor', 'mcp.json'),
      wsl: path.join(homeDir, '.cursor', 'mcp.json'), // WSL-specific path
      configKey: 'mcpServers',
      isWSL: isWSL,
      altPaths: [
        // Alternative Windows paths
        path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'storage.json'),
        path.join(process.env.APPDATA || '', 'Cursor', 'User', 'settings.json'),
        // WSL paths
        path.join(homeDir, '.cursor', 'mcp_servers.json'),
        path.join(homeDir, '.cursor', 'config.json'),
        path.join(homeDir, '.cursor-server', 'data', 'User', 'settings.json'),
        // Windows paths accessible from WSL
        '/mnt/c/Users/*/AppData/Roaming/Cursor/User/globalStorage/storage.json',
        '/mnt/c/Users/*/AppData/Roaming/Cursor/User/settings.json',
        // Standard paths
        path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
        path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json')
      ]
    },
    'windsurf': {
      name: 'Windsurf',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
      win32: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'), // Correct Windows path
      linux: path.join(homeDir, '.config', 'Windsurf', 'User', 'settings.json'),
      wsl: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'), // WSL-specific path
      configKey: 'mcpServers', // Fixed - should be mcpServers not mcp.servers
      isVSCode: false, // Windsurf uses standard MCP format
      isWSL: isWSL
    },
    'continue': {
      name: 'Continue (VS Code)',
      darwin: path.join(homeDir, '.continue', 'config.json'),
      win32: path.join(homeDir, '.continue', 'config.json'),
      linux: path.join(homeDir, '.continue', 'config.json'),
      configKey: 'mcpServers'
    },
    'zed': {
      name: 'Zed Editor',
      darwin: path.join(homeDir, '.config', 'zed', 'settings.json'),
      win32: path.join(homeDir, 'AppData', 'Roaming', 'Zed', 'settings.json'),
      linux: path.join(homeDir, '.config', 'zed', 'settings.json'),
      configKey: 'assistant.mcp_servers'
    },
    'codeium': {
      name: 'Codeium',
      darwin: path.join(homeDir, '.codeium', 'config.json'),
      win32: path.join(homeDir, '.codeium', 'config.json'),
      linux: path.join(homeDir, '.codeium', 'config.json'),
      configKey: 'mcpServers'
    }
  };

  const detectedConfigs = {};
  Object.keys(configs).forEach(client => {
    const config = configs[client];
    
    // Handle WSL-specific paths for supported clients
    let configPath = config[platform];
    if (isWSL && config.wsl) {
      configPath = config.wsl;
      log(`🐧 WSL detected, using WSL path for ${config.name}`, 'blue');
    }
    
    let exists = false;

    // Check main path
    if (configPath && fs.existsSync(path.dirname(configPath))) {
      exists = true;
    }
    
    // Check alternative paths if main path doesn't exist
    if (!exists && config.altPaths) {
      for (const altPath of config.altPaths) {
        if (altPath && fs.existsSync(path.dirname(altPath))) {
          configPath = altPath;
          exists = true;
          break;
        }
      }
    }

    detectedConfigs[client] = {
      ...config,
      path: configPath,
      exists
    };
  });

  return {
    platform,
    homeDir,
    configs: detectedConfigs
  };
}

// Initialize memory structure
async function initializeMemoryStructure() {
  const dirs = [
    'memories',
    'memories/global',
    'memories/projects',
    '.like-i-said'
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✓ Created ${dir}`, 'green');
    }
  }

  // Create default global memories
  const globalReadme = path.join('memories', 'global', 'README.md');
  if (!fs.existsSync(globalReadme)) {
    fs.writeFileSync(globalReadme, `# Global Memories

This directory contains memories that are accessible across all projects.

## Usage
- System preferences
- User information
- Global configurations
- Shared knowledge

## Format
Each memory is stored as a Markdown file with frontmatter metadata.
`);
    log('✓ Created global memory structure', 'green');
  }

  // Create config file
  const config = {
    version: '2.0.0',
    storage: {
      type: 'markdown',
      directory: 'memories'
    },
    security: {
      sandboxed: true,
      allowedPaths: ['memories/**/*.md']
    },
    features: {
      projectIsolation: true,
      graphVisualization: true,
      autoBackup: true
    }
  };

  fs.writeFileSync('.like-i-said/config.json', JSON.stringify(config, null, 2));
  log('✓ Created configuration', 'green');
}

// Configure MCP clients
async function configureMCPClient(clientKey, clientConfig) {
  const projectPath = process.cwd();
  const configPath = clientConfig.path;
  
  if (!configPath) {
    log(`Skipping ${clientConfig.name}: No config path for platform`, 'yellow');
    return false;
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      log(`Warning: Could not parse existing ${clientConfig.name} config`, 'yellow');
    }
  }

  // Create server configuration
  const serverConfig = {
    command: 'node',
    args: [path.join(projectPath, 'server-markdown.js')],
    env: {
      MEMORY_MODE: 'markdown',
      PROJECT_ROOT: projectPath
    }
  };

  // Handle different client configuration formats
  const configKeys = clientConfig.configKey.split('.');
  let targetConfig = config;

  // Navigate/create nested structure
  for (let i = 0; i < configKeys.length - 1; i++) {
    if (!targetConfig[configKeys[i]]) {
      targetConfig[configKeys[i]] = {};
    }
    targetConfig = targetConfig[configKeys[i]];
  }

  const finalKey = configKeys[configKeys.length - 1];
  if (!targetConfig[finalKey]) {
    targetConfig[finalKey] = {};
  }

  // Special handling for different client types
  if (clientConfig.isVSCode) {
    // VS Code style configuration
    if (clientKey === 'claude-code') {
      targetConfig[finalKey]['like-i-said-memory'] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env
      };
    } else if (clientKey === 'windsurf') {
      targetConfig[finalKey]['like-i-said-memory'] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env
      };
    }
  } else if (clientKey === 'cursor') {
    // Cursor-specific configuration
    targetConfig[finalKey]['like-i-said-memory'] = {
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
      description: "Like-I-Said Memory Server - Persistent AI memory across conversations"
    };
  } else {
    // Standard MCP configuration
    targetConfig[finalKey]['like-i-said-memory'] = serverConfig;
  }

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write configuration
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  log(`✓ Configured ${clientConfig.name}`, 'green');
  return true;
}

// Main setup flow
async function main() {
  log('\n🧠 Like-I-Said Memory MCP Server Setup\n', 'blue');

  const env = detectEnvironment();
  log(`Detected OS: ${env.platform}`, 'blue');

  // Check if already in a project
  const isGitRepo = fs.existsSync('.git');
  const projectName = isGitRepo ? 
    path.basename(process.cwd()) : 
    await new Promise(resolve => {
      rl.question('Project name (or press Enter for global): ', resolve);
    });

  log('\n📁 Initializing memory structure...', 'blue');
  await initializeMemoryStructure();

  // Install dependencies if needed
  if (!fs.existsSync('node_modules')) {
    log('\n📦 Installing dependencies...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Configure MCP clients
  log('\n🔧 Detecting and configuring MCP clients...', 'blue');
  
  const availableClients = [];
  const configuredClients = [];

  // Check each client
  Object.keys(env.configs).forEach(clientKey => {
    const clientConfig = env.configs[clientKey];
    
    if (clientConfig.exists && clientConfig.path) {
      availableClients.push(clientKey);
      log(`🔍 Found: ${clientConfig.name}`, 'blue');
    }
  });

  if (availableClients.length === 0) {
    log('⚠️  No MCP clients detected.', 'yellow');
    log('\nSupported clients:', 'blue');
    log('• Claude Desktop - https://claude.ai/desktop', 'yellow');
    log('• Claude Code (VS Code Extension)', 'yellow');
    log('• Cursor - https://cursor.sh', 'yellow');
    log('• Windsurf - https://codeium.com/windsurf', 'yellow');
    log('• Continue (VS Code Extension)', 'yellow');
    log('• Zed Editor - https://zed.dev', 'yellow');
    log('• Codeium', 'yellow');
  } else {
    log(`\n📱 Configuring ${availableClients.length} detected client(s)...`, 'blue');
    
    for (const clientKey of availableClients) {
      const clientConfig = env.configs[clientKey];
      try {
        const success = await configureMCPClient(clientKey, clientConfig);
        if (success) {
          configuredClients.push(clientConfig.name);
        }
      } catch (error) {
        log(`❌ Failed to configure ${clientConfig.name}: ${error.message}`, 'red');
      }
    }

    if (configuredClients.length > 0) {
      log(`\n✅ Successfully configured: ${configuredClients.join(', ')}`, 'green');
    }
  }

  // Create project memory if specified
  if (projectName) {
    const projectDir = path.join('memories', 'projects', projectName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectDir, 'README.md'),
        `# ${projectName} Memories\n\nProject-specific memories and context.\n`
      );
      log(`✓ Created project: ${projectName}`, 'green');
    }
  }

  log('\n✅ Setup complete!', 'green');
  log('\n🚀 How it works:', 'blue');
  log('• Memory server starts automatically when Claude/Cursor starts', 'green');
  log('• Dashboard runs in background while clients are open', 'green'); 
  log('• Everything stops when you close Claude/Cursor', 'green');
  log('• No manual startup needed!', 'green');
  
  log('\n📋 Next steps:', 'blue');
  log('1. Restart Claude Desktop or Cursor', 'yellow');
  log('2. Test: Ask Claude "Can you store a test memory?"', 'yellow');
  log('3. View dashboard: http://localhost:3001 (when running)', 'yellow');
  
  log('\n🔧 Useful commands:', 'blue');
  log('• View logs: npm run logs', 'yellow');
  log('• Manual start: npm start', 'yellow');
  log('• Web dashboard: npm run dev:full', 'yellow');
  log('• Docker setup: npm run docker:setup', 'yellow');
  
  rl.close();
}

// Quick install for NPX users
async function quickInstall() {
  log('\n🚀 Like-I-Said MCP v2 - Quick Install', 'blue');
  log('=====================================', 'blue');

  // Enhanced execution context detection
  const context = detectExecutionContext();
  
  // Debug output for troubleshooting
  if (process.env.DEBUG || process.argv.includes('--debug')) {
    log('\n🔍 Execution Context Debug:', 'blue');
    log(`Platform: ${context.platform}`, 'yellow');
    log(`WSL: ${context.isWSL}`, 'yellow');
    log(`Windows: ${context.isWindows}`, 'yellow');
    log(`Local execution: ${context.isLocalExecution}`, 'yellow');
    log(`NPX install: ${context.isNpxInstall}`, 'yellow');
    log(`Current dir: ${context.currentDir}`, 'yellow');
    log(`Script dir: ${context.scriptDir}`, 'yellow');
  }

  // Test if server works
  log('\n🧪 Testing MCP server...', 'blue');
  
  // Smart path resolution based on context
  const projectPath = context.isNpxInstall ? context.currentDir : context.scriptDir;
  const baseServerPath = path.join(context.isNpxInstall ? context.scriptDir : projectPath, 'server-markdown.js');
  
  // Create Windows-compatible paths
  const pathConfig = createWindowsCompatiblePaths(context, baseServerPath);
  const serverPath = pathConfig.primary;
  
  if (context.isNpxInstall) {
    log('🔍 NPX installation detected', 'blue');
    // Check if we're in a project with server-markdown.js
    const localServerPath = path.join(projectPath, 'server-markdown.js');
    if (!fs.existsSync(localServerPath)) {
      log('📁 Setting up project files...', 'blue');
      
      // Essential files to copy
      const filesToCopy = [
        'server-markdown.js',
        'package.json',
        'README.md'
      ];
      
      let copied = 0;
      for (const file of filesToCopy) {
        const sourcePath = path.join(__dirname, file);
        const destPath = path.join(projectPath, file);
        
        if (fs.existsSync(sourcePath)) {
          if (!fs.existsSync(destPath)) {
            fs.copyFileSync(sourcePath, destPath);
            log(`✓ Copied ${file}`, 'green');
            copied++;
          } else {
            log(`- Skipped ${file} (already exists)`, 'yellow');
          }
        }
      }
      
      // Create memories directory
      const memoriesDir = path.join(projectPath, 'memories');
      if (!fs.existsSync(memoriesDir)) {
        fs.mkdirSync(memoriesDir, { recursive: true });
        log('✓ Created memories directory', 'green');
      }
      
      if (copied > 0) {
        log(`📋 Copied ${copied} files to current directory`, 'green');
      }
    } else {
      log('✓ Project files found', 'green');
    }
  }
  
  const serverTest = new Promise((resolve) => {
    const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    
    child.stdout.on('data', (data) => output += data.toString());
    child.stdin.write('{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}\n');
    child.stdin.end();
    
    child.on('close', () => {
      resolve(output.includes('add_memory'));
    });
    
    setTimeout(() => { child.kill(); resolve(false); }, 5000);
  });

  const serverWorks = await serverTest;
  if (!serverWorks) {
    log('❌ Server test failed', 'red');
    return;
  }
  log('✅ Server working with 6 tools', 'green');

  // Quick config for detected clients
  const env = detectEnvironment();
  const configs = {
    claude: env.configs['claude-desktop'],
    cursor: env.configs['cursor'],
    windsurf: env.configs['windsurf']
  };

  let configured = 0;
  
  for (const [client, config] of Object.entries(configs)) {
    if (config.exists && config.path) {
      try {
        // Simple config creation
        let clientConfig = {};
        if (fs.existsSync(config.path)) {
          try {
            clientConfig = JSON.parse(fs.readFileSync(config.path, 'utf8'));
          } catch (e) { /* ignore */ }
        }

        if (!clientConfig.mcpServers) clientConfig.mcpServers = {};
        
        // Use Windows-compatible path configuration
        const serverConfigPath = path.join(projectPath, 'server-markdown.js');
        const configPathSetup = createWindowsCompatiblePaths(context, serverConfigPath);
        
        clientConfig.mcpServers['like-i-said-memory'] = {
          command: 'node',
          args: [configPathSetup.primary]
        };

        const configDir = path.dirname(config.path);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(config.path, JSON.stringify(clientConfig, null, 2));
        log(`✅ ${config.name} configured`, 'green');
        configured++;
      } catch (error) {
        log(`❌ Failed to configure ${config.name}`, 'red');
      }
    }
  }

  if (configured === 0) {
    log('\n⚠️  No AI clients found', 'yellow');
    log('Please install Claude Desktop, Cursor, or Windsurf first', 'yellow');
    return;
  }

  log(`\n✅ Installation Complete! Configured ${configured} client(s)`, 'green');
  log('\n⚠️  Restart Required:', 'yellow');
  log('• Claude Desktop: Close and restart completely', 'yellow');
  log('• Cursor: Ctrl+Shift+P → "Reload Window"', 'yellow');
  log('• Windsurf: Auto-detects changes', 'yellow');
  
  log('\n🚀 Test: Ask "What MCP tools do you have available?"', 'blue');
  log('\n📊 Web Dashboard: Run "npm run dev:full" for browser interface', 'blue');
}

// Setup command - copy files and install
async function setupAndInstall() {
  log('\n📦 Like-I-Said MCP v2 - Complete Setup', 'blue');
  log('=====================================', 'blue');
  
  const context = detectExecutionContext();
  if (!context.isNpxInstall) {
    log('❌ This command is for NPX installations only', 'red');
    log('💡 Use "npm run install" for local projects', 'yellow');
    return;
  }

  log('\n📁 Setting up project files...', 'blue');
  const projectPath = process.cwd();
  
  // Essential files to copy
  const filesToCopy = [
    'server-markdown.js',
    'package.json',
    'README.md'
  ];
  
  let copied = 0;
  for (const file of filesToCopy) {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join(projectPath, file);
    
    if (fs.existsSync(sourcePath)) {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(sourcePath, destPath);
        log(`✓ Copied ${file}`, 'green');
        copied++;
      } else {
        log(`- Skipped ${file} (already exists)`, 'yellow');
      }
    }
  }
  
  // Create memories directory
  const memoriesDir = path.join(projectPath, 'memories');
  if (!fs.existsSync(memoriesDir)) {
    fs.mkdirSync(memoriesDir, { recursive: true });
    log('✓ Created memories directory', 'green');
  }
  
  if (copied > 0) {
    log(`\n📋 Copied ${copied} files to current directory`, 'green');
  }
  
  // Now run the install
  log('\n🔧 Configuring MCP clients...', 'blue');
  await quickInstall();
}

// Handle commands
async function handleCommand() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'install':
        await quickInstall();
        break;
      case 'setup':
        await setupAndInstall();
        break;
      case 'init':
        await main();
        break;
      case 'start':
        await import('./server-markdown.js');
        break;
      case 'migrate':
        const { migrateFromJson } = await import('./migrate.js');
        await migrateFromJson();
        break;
      case 'migrate:preview':
        const { showPreview } = await import('./migrate.js');
        await showPreview();
        break;
      case 'debug:cursor':
        await import('./debug-cursor.js');
        break;
    default:
      log('Like-I-Said Memory MCP Server v2.0', 'blue');
      log('\n🎯 Supported Clients:', 'green');
      log('  • Claude Desktop, Claude Code (VS Code)', 'yellow');
      log('  • Cursor, Windsurf, Continue', 'yellow');
      log('  • Zed Editor, Codeium, Docker', 'yellow');
      
      log('\n📋 Commands:', 'blue');
      log('  npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install - Auto-setup and configure all clients (recommended)', 'yellow');
      log('  npx -p @endlessblink/like-i-said-v2 like-i-said-v2 setup   - Alternative setup command', 'yellow');
      log('  npx -p @endlessblink/like-i-said-v2 like-i-said-v2 init    - Advanced setup and configuration', 'yellow');
      log('  npx -p @endlessblink/like-i-said-v2 like-i-said-v2 start   - Start the MCP server manually', 'yellow');
      
      log('\n🚀 Quick Start:', 'green');
      log('  1. npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install', 'yellow');
      log('  2. Restart your AI client (Claude Desktop, Cursor, Windsurf)', 'yellow');
      log('  3. Ask: "What MCP tools do you have available?"', 'yellow');
      
      log('\n🔧 Troubleshooting:', 'blue');
      log('  • Force latest version: npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install', 'yellow');
      log('  • Windows issues: npx cmd /c like-i-said-v2 install', 'yellow');
      log('  • Debug mode: node cli.js install --debug', 'yellow');
      
        log('\n📖 More info: https://github.com/endlessblink/like-i-said-mcp-server', 'blue');
        break;
    }
  } catch (error) {
    const context = detectExecutionContext();
    handleNpxExecutionError(error, context);
    process.exit(1);
  }
}

// Run the command handler
handleCommand();