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

// Helper function for single keypress menus
async function getSingleKeypress(prompt, validKeys) {
  return new Promise((resolve) => {
    console.log(prompt);
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    const onData = (key) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      
      // Handle Ctrl+C
      if (key === '\u0003') {
        console.log('\nInstallation cancelled');
        process.exit(0);
      }
      
      const keyStr = key.toString().trim();
      if (validKeys.includes(keyStr)) {
        console.log(`\nYou selected: ${keyStr}`);
        resolve(keyStr);
      } else {
        // Invalid key, ask again
        getSingleKeypress(prompt, validKeys).then(resolve);
      }
    };
    
    process.stdin.on('data', onData);
  });
}

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

// Detect Node.js installation path
function detectNodePath() {
  // Check common Node.js locations
  const possibleNodePaths = [
    // nvm paths
    path.join(process.env.HOME || process.env.USERPROFILE, '.nvm/versions/node/*/bin/node'),
    // Standard paths
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
    // Windows paths
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    path.join(process.env.ProgramFiles || '', 'nodejs\\node.exe'),
    // Current process path (most reliable)
    process.execPath
  ];
  
  // Return the current Node.js executable path
  return process.execPath;
}

// Detect OS and MCP client configurations
function detectEnvironment() {
  const platform = process.platform;
  const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP;
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const nodePath = detectNodePath();
  
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

// Helper function to get installation path from --path argument or default to cwd
function getInstallPath() {
  const pathIndex = process.argv.indexOf('--path');
  if (pathIndex !== -1 && process.argv[pathIndex + 1]) {
    const customPath = process.argv[pathIndex + 1];
    return path.resolve(customPath);
  }
  
  // FORCE UNIFIED STORAGE - Never use local project directories
  return '/mnt/d/APPSNospaces/like-i-said-mcp';
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
  const projectPath = getInstallPath();
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

  // Create server configuration with detected paths
  const detectedPaths = findExistingDirectories();
  const nodePath = detectNodePath();
  
  const serverConfig = {
    command: nodePath,
    args: [path.join(projectPath, 'mcp-server-wrapper.js')],
    env: {
      MEMORY_MODE: 'markdown',
      PROJECT_ROOT: projectPath,
      MEMORY_DIR: detectedPaths.memoryDir || '',
      TASK_DIR: detectedPaths.taskDir || '',
      MCP_QUIET: 'true'
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

// Auto-detect existing memory and task directories
function findExistingDirectories() {
  const installPath = getInstallPath();
  const possibleMemoryPaths = [
    // Check current/install directory first
    path.join(installPath, 'memories'),
    path.join(installPath, 'memory'),
    // Check home directory locations
    path.join(process.env.HOME || process.env.USERPROFILE, 'memories'),
    path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'memories'),
    path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'AI-Memories'),
    // Check parent directories
    path.join(installPath, '..', 'memories'),
    path.join(installPath, '..', '..', 'memories'),
    // Windows-specific paths
    'D:\\memories',
    'D:\\AI-Memories',
    'D:\\Documents\\memories',
    'C:\\memories',
    'C:\\AI-Memories'
  ];
  
  const possibleTaskPaths = [
    // Check current/install directory first
    path.join(installPath, 'tasks'),
    path.join(installPath, 'task'),
    // Check home directory locations
    path.join(process.env.HOME || process.env.USERPROFILE, 'tasks'),
    path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'tasks'),
    path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'AI-Tasks'),
    // Check parent directories
    path.join(installPath, '..', 'tasks'),
    path.join(installPath, '..', '..', 'tasks'),
    // Windows-specific paths
    'D:\\tasks',
    'D:\\AI-Tasks',
    'D:\\Documents\\tasks',
    'C:\\tasks',
    'C:\\AI-Tasks'
  ];
  
  // Find first existing memory directory
  let memoryDir = null;
  for (const path of possibleMemoryPaths) {
    if (fs.existsSync(path)) {
      // Check if it contains memory files
      try {
        const files = fs.readdirSync(path);
        const hasMemoryFiles = files.some(f => f.endsWith('.md') || fs.statSync(path + '/' + f).isDirectory());
        if (hasMemoryFiles) {
          memoryDir = path;
          break;
        }
      } catch (e) {
        // Skip if can't read
      }
    }
  }
  
  // Find first existing task directory
  let taskDir = null;
  for (const path of possibleTaskPaths) {
    if (fs.existsSync(path)) {
      // Check if it contains task files
      try {
        const files = fs.readdirSync(path);
        const hasTaskFiles = files.some(f => f.endsWith('.md') || fs.statSync(path + '/' + f).isDirectory());
        if (hasTaskFiles) {
          taskDir = path;
          break;
        }
      } catch (e) {
        // Skip if can't read
      }
    }
  }
  
  return { memoryDir, taskDir };
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
  const installPath = getInstallPath();
  
  // Validate custom path if provided
  const hasCustomPath = process.argv.includes('--path');
  if (hasCustomPath) {
    log(`\n📍 Using custom installation path: ${installPath}`, 'blue');
    
    // Ensure parent directory exists
    const parentDir = path.dirname(installPath);
    if (!fs.existsSync(parentDir)) {
      log(`❌ Parent directory does not exist: ${parentDir}`, 'red');
      log('Please create the parent directory first or choose a different path.', 'yellow');
      process.exit(1);
    }
    
    // Create install directory if needed
    if (!fs.existsSync(installPath)) {
      try {
        fs.mkdirSync(installPath, { recursive: true });
        log(`✓ Created installation directory: ${installPath}`, 'green');
      } catch (error) {
        log(`❌ Failed to create directory: ${error.message}`, 'red');
        process.exit(1);
      }
    }
  }
  
  const projectPath = context.isNpxInstall ? installPath : context.scriptDir;
  const baseServerPath = path.join(context.isNpxInstall ? context.scriptDir : projectPath, 'mcp-server-wrapper.js');
  
  // Create Windows-compatible paths
  const pathConfig = createWindowsCompatiblePaths(context, baseServerPath);
  const serverPath = pathConfig.primary;
  
  if (context.isNpxInstall) {
    log('🔍 NPX installation detected', 'blue');
    // Check if we're in a project with mcp-server-wrapper.js
    const localServerPath = path.join(projectPath, 'mcp-server-wrapper.js');
    if (!fs.existsSync(localServerPath)) {
      log('📁 Setting up project files...', 'blue');
      
      // Essential files to copy
      const filesToCopy = [
        'mcp-server-wrapper.js',
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
      
      // Copy lib directory
      const libSource = path.join(__dirname, 'lib');
      const libDest = path.join(projectPath, 'lib');
      if (fs.existsSync(libSource) && !fs.existsSync(libDest)) {
        fs.cpSync(libSource, libDest, { recursive: true });
        log('✓ Copied lib directory', 'green');
        copied++;
      }
      
      // Create memories directory
      const memoriesDir = path.join(projectPath, 'memories');
      if (!fs.existsSync(memoriesDir)) {
        fs.mkdirSync(memoriesDir, { recursive: true });
        log('✓ Created memories directory', 'green');
      }
      
      // Create tasks directory
      const tasksDir = path.join(projectPath, 'tasks');
      if (!fs.existsSync(tasksDir)) {
        fs.mkdirSync(tasksDir, { recursive: true });
        log('✓ Created tasks directory', 'green');
      }
      
      if (copied > 0) {
        log(`📋 Copied ${copied} files to current directory`, 'green');
        
        // Install dependencies
        log('\n📦 Installing dependencies...', 'blue');
        try {
          execSync('npm install', { 
            cwd: projectPath, 
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'production' }
          });
          log('✅ Dependencies installed successfully', 'green');
        } catch (error) {
          log('❌ Failed to install dependencies', 'red');
          log('Please run "npm install" manually', 'yellow');
          return;
        }
      }
    } else {
      log('✓ Project files found', 'green');
    }
  }
  
  const serverTest = new Promise((resolve) => {
    const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());
    
    // Send proper MCP initialization first
    child.stdin.write('{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}\n');
    
    // Then request tools list after a short delay
    setTimeout(() => {
      child.stdin.write('{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}\n');
      setTimeout(() => child.stdin.end(), 100);
    }, 500);
    
    child.on('close', (code) => {
      if (process.env.DEBUG || errorOutput) {
        log(`\nDebug: Exit code: ${code}`, 'yellow');
        if (output) log(`Debug: Output: ${output.substring(0, 200)}...`, 'yellow');
        if (errorOutput) log(`Debug: Error: ${errorOutput.substring(0, 200)}...`, 'yellow');
      }
      resolve(output.includes('add_memory'));
    });
    
    setTimeout(() => { child.kill(); resolve(false); }, 5000);
  });

  const serverWorks = await serverTest;
  if (!serverWorks) {
    log('⚠️  Server test failed - continuing with configuration anyway', 'yellow');
    log('You can test the server manually after installation', 'yellow');
    // Don't return - continue with configuration
  } else {
    log('✅ Server working with 6 tools', 'green');
  }

  // Quick config for detected clients
  const env = detectEnvironment();
  const configs = {
    claude: env.configs['claude-desktop'],
    'claude-code': env.configs['claude-code'],
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
        const serverConfigPath = path.join(projectPath, 'mcp-server-wrapper.js');
        const configPathSetup = createWindowsCompatiblePaths(context, serverConfigPath);
        
        // Auto-detect paths before configuration
        const detectedPaths = findExistingDirectories();
        
        // Use full Node.js path to avoid "command not found" errors
        const nodePath = detectNodePath();
        
        // Configure based on execution context and whether local files exist
        const localServerPath = path.join(installPath, 'mcp-server-wrapper.js');
        
        if (context.isNpxInstall && !fs.existsSync(localServerPath)) {
          // NPX mode without local installation - use NPX directly
          // This is what happens when using: claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
          clientConfig.mcpServers['like-i-said-memory-v2'] = {
            command: 'npx',
            args: ['-y', '-p', '@endlessblink/like-i-said-v2@latest', 'like-i-said-v2'],
            env: {
              MEMORY_DIR: detectedPaths.memoryDir || path.join(installPath, 'memories'),
              TASK_DIR: detectedPaths.taskDir || path.join(installPath, 'tasks'),
              MCP_QUIET: 'true'
            }
          };
        } else if (fs.existsSync(localServerPath)) {
          // Local installation exists - use local path
          const normalizedPath = localServerPath.replace(/\\/g, '/');
          
          clientConfig.mcpServers['like-i-said-memory-v2'] = {
            command: nodePath,
            args: [normalizedPath],
            env: {
              MEMORY_DIR: detectedPaths.memoryDir || path.join(installPath, 'memories'),
              TASK_DIR: detectedPaths.taskDir || path.join(installPath, 'tasks'),
              MCP_QUIET: 'true'
            }
          };
        } else {
          // Fallback - use configured path
          clientConfig.mcpServers['like-i-said-memory-v2'] = {
            command: nodePath,
            args: [configPathSetup.primary],
            env: {
              MEMORY_DIR: detectedPaths.memoryDir || process.env.MEMORY_DIR || '',
              TASK_DIR: detectedPaths.taskDir || process.env.TASK_DIR || '',
              MCP_QUIET: 'true'
            }
          };
        }

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

  // Check for Claude Code CLI and configure it
  try {
    // Check if claude CLI is installed
    execSync('claude --version', { stdio: 'ignore' });
    
    try {
      // Add the MCP server to Claude Code using NPX command
      // This ensures all 27 tools are available regardless of installation method
      execSync('claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2', {
        stdio: 'inherit'
      });
      
      log('✅ Claude Code CLI configured with all 27 tools', 'green');
      configured++;
    } catch (error) {
      log('⚠️  Failed to configure Claude Code CLI', 'yellow');
      log('  You can manually add it with:', 'yellow');
      log('  claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2', 'blue');
    }
  } catch (error) {
    // Claude CLI not installed, skip
  }

  if (configured === 0) {
    log('\n⚠️  No AI clients found', 'yellow');
    log('Please install Claude Desktop, Cursor, Windsurf, or Claude Code CLI first', 'yellow');
    return;
  }

  // Auto-detect existing memory and task directories
  log('\n🔍 Detecting existing memory and task directories...', 'blue');
  const { memoryDir, taskDir } = findExistingDirectories();
  
  if (memoryDir || taskDir) {
    log('\n📁 Found existing directories:', 'green');
    if (memoryDir) log(`  Memory: ${memoryDir}`, 'yellow');
    if (taskDir) log(`  Tasks: ${taskDir}`, 'yellow');
    
    // Update all configured clients with the detected paths
    for (const [client, config] of Object.entries(configs)) {
      if (config.exists && config.path) {
        try {
          let clientConfig = JSON.parse(fs.readFileSync(config.path, 'utf8'));
          if (clientConfig.mcpServers && clientConfig.mcpServers['like-i-said-memory-v2']) {
            if (memoryDir) {
              clientConfig.mcpServers['like-i-said-memory-v2'].env.MEMORY_DIR = memoryDir;
            }
            if (taskDir) {
              clientConfig.mcpServers['like-i-said-memory-v2'].env.TASK_DIR = taskDir;
            }
            fs.writeFileSync(config.path, JSON.stringify(clientConfig, null, 2));
            log(`  ✓ Updated ${config.name} with detected paths`, 'green');
          }
        } catch (e) {
          // Skip if can't update
        }
      }
    }
  }
  
  log(`\n✅ Installation Complete! Configured ${configured} client(s)`, 'green');
  log('\n⚠️  Restart Required:', 'yellow');
  log('• Claude Desktop: Close and restart completely', 'yellow');
  log('• Claude Code (VS Code): Reload VS Code window', 'yellow');
  log('• Cursor: Ctrl+Shift+P → "Reload Window"', 'yellow');
  log('• Windsurf: Auto-detects changes', 'yellow');
  log('• Claude Code CLI: Already configured, no restart needed', 'yellow');
  
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
  const projectPath = getInstallPath();
  
  // Essential files to copy
  const filesToCopy = [
    'mcp-server-wrapper.js',
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

// Docker configuration helper
async function setupDockerConfig() {
  log('\n🐳 Setting up Docker configuration...', 'blue');
  
  const dockerFiles = [
    'docker-configs/Dockerfile.production',
    'docker-configs/Dockerfile.minimal'
  ];
  
  for (const dockerFile of dockerFiles) {
    if (fs.existsSync(dockerFile)) {
      const targetName = dockerFile.includes('production') ? 'Dockerfile' : 'Dockerfile.minimal';
      fs.copyFileSync(dockerFile, targetName);
      log(`✓ Copied ${dockerFile} to ${targetName}`, 'green');
    }
  }
  
  // Create docker-compose.yml if it doesn't exist
  if (!fs.existsSync('docker-compose.yml')) {
    const dockerCompose = `version: '3.8'
services:
  like-i-said-mcp:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./memories:/app/memories
    environment:
      - NODE_ENV=production
      - MCP_MEMORY_PATH=/app/memories
    restart: unless-stopped
`;
    fs.writeFileSync('docker-compose.yml', dockerCompose);
    log('✓ Created docker-compose.yml', 'green');
  }
  
  log('\n🐳 Docker setup complete!', 'green');
  log('To use Docker:', 'blue');
  log('  docker build -t like-i-said-mcp .', 'yellow');
  log('  docker run -p 3001:3001 like-i-said-mcp', 'yellow');
  log('Or with docker-compose:', 'blue');
  log('  docker-compose up -d', 'yellow');
}

// Get available project names from task directories
async function getAvailableProjects() {
  const tasksDir = path.join(__dirname, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    return [];
  }
  
  try {
    const dirs = fs.readdirSync(tasksDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => name !== 'default'); // Exclude default directory
    return dirs;
  } catch (error) {
    return [];
  }
}

// Fuzzy match project name to available projects
function findBestProjectMatch(targetName, availableProjects) {
  // Exact match first
  if (availableProjects.includes(targetName)) {
    return { match: targetName, confidence: 1.0 };
  }
  
  // Normalize names for comparison (remove special chars, lowercase)
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedTarget = normalize(targetName);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const project of availableProjects) {
    const normalizedProject = normalize(project);
    
    // Check if target is contained in project name
    if (normalizedProject.includes(normalizedTarget)) {
      const score = normalizedTarget.length / normalizedProject.length;
      if (score > bestScore) {
        bestMatch = project;
        bestScore = score;
      }
    }
    
    // Check if project is contained in target
    if (normalizedTarget.includes(normalizedProject)) {
      const score = normalizedProject.length / normalizedTarget.length;
      if (score > bestScore) {
        bestMatch = project;
        bestScore = score;
      }
    }
  }
  
  // Only return matches with reasonable confidence
  if (bestScore > 0.3) {
    return { match: bestMatch, confidence: bestScore };
  }
  
  return null;
}

// Simple task watch - auto-detects project and starts monitoring
async function startSimpleWatch() {
  const { spawn } = await import('child_process');
  const currentDir = process.cwd();
  const directoryName = path.basename(currentDir);
  
  // Check for --list-projects flag
  if (process.argv.includes('--list-projects')) {
    console.log('📋 Available projects in Like-I-Said MCP:');
    const projects = await getAvailableProjects();
    if (projects.length === 0) {
      console.log('   No projects found');
    } else {
      projects.forEach(project => console.log(`   • ${project}`));
    }
    console.log(`\n💡 Use: npx @endlessblink/like-i-said-mcp watch --project=PROJECT_NAME`);
    return;
  }
  
  // Parse watch-specific arguments
  const watchArgs = [];
  const args = process.argv.slice(3); // Skip 'node', 'cli.js', 'watch'
  
  // Auto-detect project if not specified
  let hasProjectArg = false;
  let specifiedProject = null;
  
  for (const arg of args) {
    if (arg.startsWith('--project=')) {
      hasProjectArg = true;
      specifiedProject = arg.split('=')[1];
    }
    watchArgs.push(arg);
  }
  
  // Smart project detection - check for local tasks first
  let finalProject = directoryName;
  
  if (!hasProjectArg) {
    // Check if project has local task directory
    const localTasksDir = path.join(currentDir, 'tasks');
    
    if (fs.existsSync(localTasksDir)) {
      // Project has local tasks - use actual directory name
      finalProject = directoryName;
      console.log('🎯 Local task detection:');
      console.log(`   Directory: "${directoryName}" has local tasks`);
      console.log(`   → Using project name: "${finalProject}"`);
    } else {
      // No local tasks - try central system matching
      const availableProjects = await getAvailableProjects();
      const match = findBestProjectMatch(directoryName, availableProjects);
      
      if (match) {
        finalProject = match.match;
        console.log('🎯 Smart project matching:');
        console.log(`   Directory: "${directoryName}"`);
        console.log(`   → Matched: "${finalProject}" (${Math.round(match.confidence * 100)}% confidence)`);
      } else {
        console.log('⚠️  Project auto-detection:');
        console.log(`   Directory: "${directoryName}" - no matching project found`);
        console.log('📋 Available projects:');
        if (availableProjects.length === 0) {
          console.log('   No projects found in Like-I-Said MCP');
        } else {
          availableProjects.slice(0, 5).forEach(project => console.log(`   • ${project}`));
          if (availableProjects.length > 5) {
            console.log(`   ... and ${availableProjects.length - 5} more`);
          }
        }
        console.log(`\n💡 Continuing with "${directoryName}" (may show no tasks)`);
        console.log(`   Use: npx @endlessblink/like-i-said-mcp watch --project=PROJECT_NAME`);
        console.log(`   Or: npx @endlessblink/like-i-said-mcp watch --list-projects`);
      }
    }
    
    watchArgs.push(`--project=${finalProject}`);
  } else {
    finalProject = specifiedProject;
  }
  
  // Default to active filter for better UX
  const hasFilterArg = args.some(arg => arg.startsWith('--filter='));
  if (!hasFilterArg) {
    watchArgs.push('--filter=active');
  }
  
  console.log('🔥 Starting Simple Task Monitor...');
  console.log(`📁 Project: ${finalProject}`);
  console.log(`📍 Directory: ${currentDir}`);
  
  // Path to the working monitor script  
  const watchScriptPath = path.join(__dirname, 'scripts/utilities/simple-task-watch.js');
  
  // Spawn the watch script with correct working directory and project
  const child = spawn('node', [watchScriptPath, `--project=${finalProject}`, ...watchArgs], {
    stdio: 'inherit',
    cwd: currentDir, // Run in the original project directory
    env: {
      ...process.env,
      PROJECT_NAME: finalProject // Also pass as env var
    }
  });
  
  // Handle exit
  child.on('exit', (code) => {
    process.exit(code);
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start task monitor:', error.message);
    process.exit(1);
  });
}

// Handle commands
async function handleCommand() {
  const command = process.argv[2];
  const hasDockerFlag = process.argv.includes('--docker');

  try {
    switch (command) {
      case 'install':
        await quickInstall();
        if (hasDockerFlag) {
          await setupDockerConfig();
        }
        break;
      case 'setup':
        await setupAndInstall();
        break;
      case 'init':
        await main();
        break;
      case 'start':
        await import('./scripts/mcp-wrappers/mcp-quiet-wrapper.js');
        break;
      case 'dashboard':
        await startDashboard();
        break;
      case 'watch':
        await startSimpleWatch();
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
      // When no command is provided, start the MCP server (for NPX execution)
      // This is what happens when Claude Code runs: npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
      const context = detectExecutionContext();
      if (context.isNpxInstall || !process.stdout.isTTY) {
        // Running from NPX or in non-interactive mode - start MCP server
        await import('./scripts/mcp-wrappers/mcp-quiet-wrapper.js');
      } else {
        // Running interactively - show help
        log('Like-I-Said Memory MCP Server v2.0', 'blue');
        log('\n🎯 Supported Clients:', 'green');
        log('  • Claude Desktop, Claude Code (VS Code)', 'yellow');
        log('  • Cursor, Windsurf, Continue', 'yellow');
        log('  • Zed Editor, Codeium, Docker', 'yellow');
        
        log('\n📋 Commands:', 'blue');
        log('  claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2  - Add to Claude Code', 'green');
        log('  npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install        - Auto-setup and configure all clients', 'yellow');
        log('  npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /custom/path - Install to specific directory', 'yellow');
        log('  npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --docker - Install with Docker configuration', 'yellow');
        log('  npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 setup          - Alternative setup command', 'yellow');
        log('  npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 init           - Advanced setup and configuration', 'yellow');
        log('  npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 start          - Start the MCP server manually', 'yellow');
        
        log('\n🚀 Quick Start:', 'green');
        log('  1. For Claude Code: claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2', 'green');
        log('  2. For others: npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install', 'yellow');
        log('  3. Restart your AI client (Claude Desktop, Cursor, Windsurf)', 'yellow');
        log('  4. Ask: "What MCP tools do you have available?"', 'yellow');
        
        log('\n🔧 Troubleshooting:', 'blue');
        log('  • Force latest version: npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install', 'yellow');
        log('  • Windows issues: npx cmd /c like-i-said-v2 install', 'yellow');
        log('  • Debug mode: node cli.js install --debug', 'yellow');
        log('  • Custom path: npx ... install --path C:\\tools\\mcp-servers', 'yellow');
        
        log('\n📖 More info: https://github.com/endlessblink/like-i-said-mcp-server', 'blue');
      }
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