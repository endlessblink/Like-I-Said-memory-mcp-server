#!/usr/bin/env node

/**
 * Build script for creating Like-I-Said MCP Server v2 DXT package
 * Creates a properly structured Desktop Extension (DXT) package
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DXT_BUILD_DIR = path.join(__dirname, 'dxt-build');
const DXT_OUTPUT_FILE = path.join(__dirname, 'like-i-said-memory-v2.dxt');

// Clean build directory
if (fs.existsSync(DXT_BUILD_DIR)) {
  fs.rmSync(DXT_BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DXT_BUILD_DIR, { recursive: true });

console.log('Building Like-I-Said MCP Server v2 DXT package...');

// Step 1: Copy manifest.json to root
console.log('1. Copying manifest.json...');
fs.copyFileSync(
  path.join(__dirname, 'manifest.json'),
  path.join(DXT_BUILD_DIR, 'manifest.json')
);

// Step 2: Create server directory and copy server files
console.log('2. Creating server directory structure...');
const serverDir = path.join(DXT_BUILD_DIR, 'server');
fs.mkdirSync(serverDir, { recursive: true });

// Copy standalone server
fs.copyFileSync(
  path.join(__dirname, 'mcp-server-standalone.js'),
  path.join(serverDir, 'mcp-server-standalone.js')
);

// Step 3: Copy lib directory with essential files
console.log('3. Copying lib directory...');
const libDir = path.join(serverDir, 'lib');
fs.mkdirSync(libDir, { recursive: true });

const essentialLibFiles = [
  'memory-storage-wrapper.js',
  'memory-format.js',
  'task-storage.js',
  'task-format.js',
  'task-memory-linker.js',
  'dropoff-generator.js',
  'vector-storage.js',
  'title-summary-generator.js',
  'ollama-client.js',
  'memory-deduplicator.js',
  'task-nlp-processor.js',
  'task-automation.js',
  'task-status-validator.js',
  'task-analytics.js',
  'memory-task-automator.cjs',
  'system-safeguards.js',
  'connection-protection.cjs',
  'data-integrity.cjs',
  'file-system-monitor.js',
  'content-analyzer.js',
  'memory-quality-standards.cjs',
  'memory-description-quality-scorer.cjs',
  'standards-config-parser.cjs'
];

essentialLibFiles.forEach(file => {
  const sourcePath = path.join(__dirname, 'lib', file);
  const destPath = path.join(libDir, file);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
  } else {
    console.warn(`Warning: lib file not found: ${file}`);
  }
});

// Step 4: Create memories and tasks directories
console.log('4. Creating default directories...');
const memoriesDir = path.join(DXT_BUILD_DIR, 'memories');
const tasksDir = path.join(DXT_BUILD_DIR, 'tasks');
fs.mkdirSync(memoriesDir, { recursive: true });
fs.mkdirSync(tasksDir, { recursive: true });

// Add default directories
fs.mkdirSync(path.join(memoriesDir, 'default'), { recursive: true });
fs.mkdirSync(path.join(tasksDir, 'default'), { recursive: true });

// Step 5: Bundle node_modules dependencies
console.log('5. Bundling dependencies...');
const nodeModulesDir = path.join(serverDir, 'node_modules');
fs.mkdirSync(nodeModulesDir, { recursive: true });

// Essential dependencies for MCP server
const essentialDeps = [
  '@modelcontextprotocol/sdk',
  'js-yaml',
  'natural',
  'chokidar',
  'axios'
];

// Copy essential dependencies
essentialDeps.forEach(dep => {
  const sourcePath = path.join(__dirname, 'node_modules', dep);
  const destPath = path.join(nodeModulesDir, dep);
  if (fs.existsSync(sourcePath)) {
    copyRecursive(sourcePath, destPath);
  } else {
    console.warn(`Warning: dependency not found: ${dep}`);
  }
});

// Step 6: Create assets directory and icon
console.log('6. Creating assets...');
const assetsDir = path.join(DXT_BUILD_DIR, 'assets');
fs.mkdirSync(path.join(assetsDir, 'screenshots'), { recursive: true });

// Create a simple icon if it doesn't exist
const iconPath = path.join(DXT_BUILD_DIR, 'icon.png');
if (!fs.existsSync(path.join(__dirname, 'icon.png'))) {
  console.log('Creating placeholder icon...');
  // Create a simple 256x256 transparent PNG placeholder
  const pngData = Buffer.from('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', 'base64');
  fs.writeFileSync(iconPath, pngData);
} else {
  fs.copyFileSync(path.join(__dirname, 'icon.png'), iconPath);
}

// Copy screenshots if they exist
const screenshotSources = [
  path.join(__dirname, 'assets', 'screenshots', 'dashboard.png'),
  path.join(__dirname, 'assets', 'screenshots', 'memory-tools.png'),
  path.join(__dirname, 'assets', 'screenshots', 'task-management.png')
];

screenshotSources.forEach((source, index) => {
  if (fs.existsSync(source)) {
    const destName = ['dashboard.png', 'memory-tools.png', 'task-management.png'][index];
    fs.copyFileSync(source, path.join(assetsDir, 'screenshots', destName));
  }
});

// Step 7: Create package.json for the server directory
console.log('7. Creating server package.json...');
const serverPackageJson = {
  name: "like-i-said-mcp-server-standalone",
  version: "2.3.7",
  type: "module",
  main: "mcp-server-standalone.js",
  dependencies: {
    "@modelcontextprotocol/sdk": "^0.6.2",
    "js-yaml": "^4.1.0",
    "natural": "^8.0.1",
    "chokidar": "^4.0.3",
    "axios": "^1.7.9"
  }
};

fs.writeFileSync(
  path.join(serverDir, 'package.json'),
  JSON.stringify(serverPackageJson, null, 2)
);

// Step 8: Create the DXT archive
console.log('8. Creating DXT archive...');
const output = fs.createWriteStream(DXT_OUTPUT_FILE);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  console.log(`\n✅ DXT package created successfully!`);
  console.log(`   File: ${DXT_OUTPUT_FILE}`);
  console.log(`   Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\n📦 Package structure:`);
  console.log(`   - manifest.json`);
  console.log(`   - icon.png`);
  console.log(`   - server/`);
  console.log(`     - mcp-server-standalone.js`);
  console.log(`     - package.json`);
  console.log(`     - lib/ (essential libraries)`);
  console.log(`     - node_modules/ (bundled dependencies)`);
  console.log(`   - memories/`);
  console.log(`   - tasks/`);
  console.log(`   - assets/screenshots/`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(DXT_BUILD_DIR, false);
archive.finalize();

// Helper function to copy directories recursively
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}