#!/usr/bin/env node

/**
 * Build script for creating DXT (Desktop Extension) packages
 * for Claude Desktop distribution
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'dist', 'dxt-build');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist');

// Parse command line arguments
const args = process.argv.slice(2);
const versionArg = args.find(arg => arg.startsWith('--version='));
const version = versionArg ? versionArg.split('=')[1] : JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')).version;

console.log('🏗️  Building Like-I-Said MCP Server v2 DXT Package');
console.log(`📦 Version: ${version}`);
console.log('');

// Step 1: Clean and prepare build directory
console.log('1️⃣  Preparing build directory...');
if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Step 2: Build the React dashboard
console.log('2️⃣  Building React dashboard...');
try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to build React dashboard');
    process.exit(1);
}

// Step 3: Create directory structure
console.log('3️⃣  Creating package structure...');
const dirs = [
    'server',
    'server/lib',
    'dashboard',
    'data/memories/default',
    'data/tasks'
];

dirs.forEach(dir => {
    fs.mkdirSync(path.join(BUILD_DIR, dir), { recursive: true });
});

// Step 4: Copy server files
console.log('4️⃣  Copying server files...');
const serverFiles = [
    'server-markdown.js',
    'dashboard-server-bridge.js',
    'mcp-server-wrapper.js'
];

serverFiles.forEach(file => {
    fs.copyFileSync(
        path.join(ROOT_DIR, file),
        path.join(BUILD_DIR, 'server', file)
    );
});

// Copy lib directory
const libSrc = path.join(ROOT_DIR, 'lib');
const libDest = path.join(BUILD_DIR, 'server', 'lib');
copyDirectory(libSrc, libDest);

// Step 5: Copy dashboard files
console.log('5️⃣  Copying dashboard files...');
const dashboardSrc = path.join(ROOT_DIR, 'dist');
const dashboardDest = path.join(BUILD_DIR, 'dashboard', 'dist');
copyDirectory(dashboardSrc, dashboardDest);

// Step 6: Install production dependencies
console.log('6️⃣  Installing production dependencies...');
// Create a minimal package.json for production deps
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: "module",
    dependencies: packageJson.dependencies
};

fs.writeFileSync(
    path.join(BUILD_DIR, 'package.json'),
    JSON.stringify(prodPackageJson, null, 2)
);

try {
    execSync('npm ci --production', { cwd: BUILD_DIR, stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to install production dependencies');
    process.exit(1);
}

// Remove the temporary package.json
fs.unlinkSync(path.join(BUILD_DIR, 'package.json'));

// Step 7: Create manifest.json
console.log('7️⃣  Creating manifest.json...');
const manifest = {
    name: "like-i-said-v2",
    version: version,
    api_version: "1.0",
    display_name: "Like-I-Said Memory v2",
    description: "Enhanced MCP memory server with modern React dashboard - remember conversations across sessions",
    author: "endlessblink",
    homepage: "https://github.com/endlessblink/Like-I-Said-Memory-V2",
    repository: "https://github.com/endlessblink/Like-I-Said-Memory-V2",
    icon: "icon.png",
    main: "server/mcp-server-wrapper.js",
    runtime: "node",
    node_version: ">=18.0.0",
    tools: [
        "add_memory",
        "get_memory",
        "list_memories",
        "delete_memory",
        "search_memories",
        "create_task",
        "update_task",
        "list_tasks",
        "get_task_context",
        "delete_task",
        "generate_dropoff",
        "test_tool"
    ],
    configuration: {
        storageLocation: {
            type: "string",
            default: "~/claude-memories",
            description: "Location to store memories and tasks"
        },
        enableDashboard: {
            type: "boolean",
            default: true,
            description: "Enable web dashboard interface"
        },
        dashboardPort: {
            type: "number",
            default: 3001,
            description: "Port for web dashboard"
        },
        autoBackup: {
            type: "boolean",
            default: true,
            description: "Enable automatic backups"
        },
        backupInterval: {
            type: "number",
            default: 3600,
            description: "Backup interval in seconds"
        }
    },
    permissions: {
        filesystem: {
            read: true,
            write: true,
            paths: ["~/claude-memories", "~/.claude-memories-backup"]
        },
        network: {
            serve: true,
            ports: [3001],
            fetch: false
        },
        environment: {
            variables: []
        }
    },
    features: {
        dashboard: true,
        taskManagement: true,
        autoLinking: true,
        projectOrganization: true,
        realTimeUpdates: true
    }
};

fs.writeFileSync(
    path.join(BUILD_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
);

// Step 8: Create default settings
console.log('8️⃣  Creating default settings...');
const defaultSettings = {
    authentication: {
        enabled: false,
        requireAuth: false,
        allowRegistration: false,
        sessionTimeout: "24h",
        refreshTokenTimeout: "7d"
    },
    server: {
        port: 3001,
        host: "localhost",
        corsOrigins: ["http://localhost:5173"]
    },
    features: {
        autoBackup: true,
        backupInterval: 3600000,
        maxBackups: 10,
        enableWebSocket: true,
        enableOllama: true
    },
    logging: {
        level: "info",
        enableFileLogging: false,
        logDirectory: "./logs"
    }
};

fs.writeFileSync(
    path.join(BUILD_DIR, 'data', 'settings.json'),
    JSON.stringify(defaultSettings, null, 2)
);

// Step 9: Copy icon and README
console.log('9️⃣  Copying icon and documentation...');
// Create a simple icon if it doesn't exist
const iconPath = path.join(ROOT_DIR, 'public', 'icon.png');
if (fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, path.join(BUILD_DIR, 'icon.png'));
} else {
    // Create a placeholder icon (you should replace this with actual icon)
    createPlaceholderIcon(path.join(BUILD_DIR, 'icon.png'));
}

// Create user-friendly README
const readmeContent = `# Like-I-Said Memory v2

Enhanced MCP memory server with modern React dashboard for Claude Desktop.

## Features
- 🧠 Persistent memory across conversations
- 📋 Task management with auto-linking
- 🔍 Advanced search and filtering
- 📊 Real-time dashboard
- 🔄 Automatic backups
- 📁 Project-based organization

## Quick Start
1. This extension is already installed in Claude Desktop
2. Test it by typing: "Test Like-I-Said memory tools"
3. Access dashboard at: http://localhost:3001

## Available Tools
- Memory Management: add, get, list, delete, search memories
- Task Management: create, update, list, get context, delete tasks
- Session Management: generate dropoff documents

## Support
- GitHub: https://github.com/endlessblink/Like-I-Said-Memory-V2
- Issues: https://github.com/endlessblink/Like-I-Said-Memory-V2/issues

Version: ${version}
`;

fs.writeFileSync(path.join(BUILD_DIR, 'README.md'), readmeContent);

// Step 10: Create the DXT package
console.log('🔟 Creating DXT package...');
const outputFile = path.join(OUTPUT_DIR, `like-i-said-v2-${version}.dxt`);
const output = createWriteStream(outputFile);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
    const size = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log('');
    console.log('✅ DXT package created successfully!');
    console.log(`📦 File: ${outputFile}`);
    console.log(`📏 Size: ${size} MB`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Test the package locally');
    console.log('   2. Upload to GitHub releases');
    console.log('   3. Submit to Claude Desktop Extension Directory');
});

archive.on('error', (err) => {
    console.error('❌ Error creating DXT package:', err);
    process.exit(1);
});

archive.pipe(output);
archive.directory(BUILD_DIR, false);
archive.finalize();

// Helper functions
function copyDirectory(src, dest) {
    if (!fs.existsSync(src)) return;
    
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function createPlaceholderIcon(filepath) {
    // Create a simple PNG icon placeholder
    // In production, you should use a proper icon
    const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#6366f1" rx="64"/>
        <text x="256" y="320" font-family="Arial" font-size="200" font-weight="bold" 
              text-anchor="middle" fill="white">M</text>
    </svg>
    `;
    
    // For now, create a simple placeholder file
    // In production, convert SVG to PNG
    fs.writeFileSync(filepath, 'PLACEHOLDER_ICON');
}