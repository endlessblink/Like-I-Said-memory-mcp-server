#!/usr/bin/env node

/**
 * Build standalone dashboard installers using pkg
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

console.log(`${colors.blue}${colors.bright}
Building Like-I-Said Dashboard Standalone Executables
====================================================
${colors.reset}`);

// Check if pkg is installed
try {
  execSync('pkg --version', { stdio: 'ignore' });
} catch (error) {
  console.log(`${colors.yellow}Installing pkg...${colors.reset}`);
  execSync('npm install -g pkg', { stdio: 'inherit' });
}

// Change to project root
process.chdir(projectRoot);

// Ensure dist directory exists and is built
if (!fs.existsSync('dist')) {
  console.log(`${colors.yellow}Building dashboard UI...${colors.reset}`);
  execSync('npm run build', { stdio: 'inherit' });
}

// Create output directory
const outputDir = 'dist-installer';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Build for each platform
const platforms = [
  { target: 'node18-win-x64', name: 'like-i-said-dashboard-win.exe' },
  { target: 'node18-macos-x64', name: 'like-i-said-dashboard-macos' },
  { target: 'node18-linux-x64', name: 'like-i-said-dashboard-linux' }
];

console.log(`${colors.blue}Building executables...${colors.reset}`);

platforms.forEach(({ target, name }) => {
  console.log(`\n${colors.yellow}Building for ${target}...${colors.reset}`);
  
  try {
    const outputPath = path.join(outputDir, name);
    
    // Build with pkg
    execSync(`pkg dashboard-launcher.js --target ${target} --output ${outputPath} --config package-dashboard.json`, {
      stdio: 'inherit'
    });
    
    // Check file size
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    
    console.log(`${colors.green}✓ Built ${name} (${sizeMB} MB)${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Failed to build for ${target}${colors.reset}`);
    console.error(error.message);
  }
});

// Create README for the installer directory
const readmeContent = `# Like-I-Said Dashboard Standalone Executables

These are standalone executables that include Node.js and all dependencies.
No installation required - just download and run!

## Files:
- **like-i-said-dashboard-win.exe** - Windows (64-bit)
- **like-i-said-dashboard-macos** - macOS (64-bit)
- **like-i-said-dashboard-linux** - Linux (64-bit)

## Usage:
1. Download the appropriate file for your operating system
2. Double-click to run (or run from terminal)
3. The dashboard will open in your default browser
4. Close the console window to stop the server

## Features:
- No Node.js installation required
- Embedded server and UI
- Automatic browser launch
- Cross-platform support

## System Requirements:
- Windows 10 or later (64-bit)
- macOS 10.14 or later
- Linux with glibc 2.17 or later

Built with ❤️ using pkg
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent);

console.log(`\n${colors.green}${colors.bright}Build complete!${colors.reset}`);
console.log(`${colors.blue}Executables are in: ${outputDir}/${colors.reset}`);
console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
console.log('1. Test each executable on its target platform');
console.log('2. Create installers using Inno Setup (Windows) or similar');
console.log('3. Upload to GitHub releases');