#!/usr/bin/env node

/**
 * Build a complete release package for distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const VERSION = '2.4.8';
const RELEASE_NAME = `like-i-said-dashboard-v${VERSION}-windows`;

console.log(`🔨 Building Release Package v${VERSION}...\n`);

// Create release directory
const releaseDir = path.join(process.cwd(), 'releases', RELEASE_NAME);
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

console.log(`📁 Creating release directory: ${releaseDir}`);

// Files and directories to include
const filesToCopy = [
  // Core files
  { src: 'dashboard-launcher-final-working.cjs', dst: 'dashboard-launcher.cjs' },
  { src: 'dashboard-server-bridge.js', dst: 'dashboard-server-bridge.js' },
  { src: 'package.json', dst: 'package.json' },
  { src: 'package-lock.json', dst: 'package-lock.json' },
  { src: 'manifest.json', dst: 'manifest.json' },
  { src: 'server-markdown.js', dst: 'server-markdown.js' },
  { src: 'memory-format.js', dst: 'memory-format.js' },
  
  // Optional but helpful
  { src: 'memory-quality-standards.md', dst: 'memory-quality-standards.md', optional: true }
];

const directoriesToCopy = [
  { src: 'lib', dst: 'lib' },
  { src: 'dist', dst: 'dist' }
];

// Copy files
console.log('\n📋 Copying files...');
for (const file of filesToCopy) {
  if (fs.existsSync(file.src)) {
    const destPath = path.join(releaseDir, file.dst);
    fs.copyFileSync(file.src, destPath);
    console.log(`  ✓ ${file.dst}`);
  } else if (!file.optional) {
    console.log(`  ⚠️  ${file.src} not found (required)`);
  }
}

// Copy directories
console.log('\n📁 Copying directories...');
for (const dir of directoriesToCopy) {
  if (fs.existsSync(dir.src)) {
    const destPath = path.join(releaseDir, dir.dst);
    fs.cpSync(dir.src, destPath, { recursive: true });
    console.log(`  ✓ ${dir.dst}/`);
  } else {
    console.log(`  ⚠️  ${dir.src}/ not found`);
  }
}

// Create data directory with default settings
console.log('\n⚙️  Creating default configuration...');
const dataDir = path.join(releaseDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const defaultSettings = {
  authentication: {
    enabled: false,
    requireAuth: false
  }
};
fs.writeFileSync(
  path.join(dataDir, 'settings.json'),
  JSON.stringify(defaultSettings, null, 2)
);
console.log('  ✓ data/settings.json');

// Build the executable
console.log('\n🚀 Building executable...');
const launcherPath = path.join(releaseDir, 'dashboard-launcher.cjs');
const exePath = path.join(releaseDir, 'dashboard.exe');

try {
  execSync(`pkg "${launcherPath}" --targets node18-win-x64 --output "${exePath}"`, {
    stdio: 'inherit'
  });
  
  if (fs.existsSync(exePath)) {
    // Remove the source launcher after building
    fs.unlinkSync(launcherPath);
    console.log(`  ✓ dashboard.exe created`);
  }
} catch (error) {
  console.error('  ❌ Failed to build executable');
}

// Create setup batch file
console.log('\n📝 Creating setup files...');
const setupBatch = `@echo off
echo ==================================
echo Like-I-Said Dashboard Setup
echo Version ${VERSION}
echo ==================================
echo.
echo This will install the dashboard dependencies.
echo Make sure you have Node.js installed.
echo.
pause

echo.
echo Installing dependencies...
call npm install --production

echo.
echo ==================================
echo Setup Complete!
echo ==================================
echo.
echo You can now run: dashboard.exe
echo.
pause`;

fs.writeFileSync(path.join(releaseDir, 'setup.bat'), setupBatch);
console.log('  ✓ setup.bat');

// Create README
const readme = `# Like-I-Said Dashboard v${VERSION}

## Quick Start

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/

2. **Run Setup**
   \`\`\`
   setup.bat
   \`\`\`

3. **Start Dashboard**
   \`\`\`
   dashboard.exe
   \`\`\`

## First Run

On first run, the dashboard will:
1. Ask you to configure memory and task directories
2. Save your configuration
3. Start the dashboard on an available port

## Requirements

- Windows 10 or later
- Node.js 16 or later
- 200MB free disk space

## What's Included

- \`dashboard.exe\` - Main launcher executable
- \`dashboard-server-bridge.js\` - Dashboard server
- \`lib/\` - Core libraries
- \`dist/\` - React dashboard files
- \`setup.bat\` - Dependency installer

## Configuration

Your settings are saved in \`dashboard-config.json\` and will be remembered between runs.

## Troubleshooting

- Check \`logs/\` directory for error details
- Ensure Node.js is installed and in PATH
- Try running \`setup.bat\` again if dependencies are missing

---
Like-I-Said MCP Server v2 - Advanced Memory Management System
`;

fs.writeFileSync(path.join(releaseDir, 'README.md'), readme);
console.log('  ✓ README.md');

// Create the ZIP archive
console.log('\n📦 Creating ZIP archive...');
const outputZip = path.join(process.cwd(), 'releases', `${RELEASE_NAME}.zip`);
const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✨ Release package created successfully!`);
  console.log(`📦 File: ${outputZip}`);
  console.log(`📏 Size: ${sizeMB} MB`);
  console.log(`\n🚀 Ready for distribution!`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(releaseDir, false);
archive.finalize();