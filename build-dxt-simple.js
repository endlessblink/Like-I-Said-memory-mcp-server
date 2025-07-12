#!/usr/bin/env node

/**
 * Simple DXT builder for Like-I-Said MCP Server v2
 * Creates a proper Desktop Extension package
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);

console.log('🏗️  Building Like-I-Said MCP Server v2 DXT Package (Simple)');

// Clean previous builds
const distDir = path.join(ROOT_DIR, 'dist-dxt');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);

// Create DXT structure
const dxtDir = path.join(distDir, 'like-i-said-v2');
fs.mkdirSync(dxtDir);
fs.mkdirSync(path.join(dxtDir, 'server'));
fs.mkdirSync(path.join(dxtDir, 'server', 'lib'));
fs.mkdirSync(path.join(dxtDir, 'memories', 'default'), { recursive: true });
fs.mkdirSync(path.join(dxtDir, 'tasks', 'default'), { recursive: true });
fs.mkdirSync(path.join(dxtDir, 'assets', 'screenshots'), { recursive: true });

// Copy manifest
console.log('📄 Copying manifest.json...');
fs.copyFileSync(
    path.join(ROOT_DIR, 'manifest.json'),
    path.join(dxtDir, 'manifest.json')
);

// Copy icon
console.log('🎨 Creating icon...');
if (fs.existsSync(path.join(ROOT_DIR, 'public', 'cover.png'))) {
    fs.copyFileSync(
        path.join(ROOT_DIR, 'public', 'cover.png'),
        path.join(dxtDir, 'icon.png')
    );
}

// Copy server files
console.log('📦 Copying server files...');
fs.copyFileSync(
    path.join(ROOT_DIR, 'mcp-server-standalone.js'),
    path.join(dxtDir, 'server', 'mcp-server-standalone.js')
);

// Copy optimized DXT server if it exists
if (fs.existsSync(path.join(ROOT_DIR, 'mcp-server-dxt-optimized.js'))) {
    fs.copyFileSync(
        path.join(ROOT_DIR, 'mcp-server-dxt-optimized.js'),
        path.join(dxtDir, 'server', 'mcp-server-dxt-optimized.js')
    );
}

// Copy lib files
console.log('📚 Copying library files...');
const libFiles = fs.readdirSync(path.join(ROOT_DIR, 'lib'))
    .filter(f => f.endsWith('.js') || f.endsWith('.cjs'));

libFiles.forEach(file => {
    fs.copyFileSync(
        path.join(ROOT_DIR, 'lib', file),
        path.join(dxtDir, 'server', 'lib', file)
    );
});

// Create minimal package.json for the server
console.log('📝 Creating package.json...');
const packageJson = {
    name: "like-i-said-mcp-server",
    version: "2.3.7",
    type: "module",
    main: "mcp-server-standalone.js",
    dependencies: {
        "@modelcontextprotocol/sdk": "^1.0.4",
        "js-yaml": "^4.1.0",
        "uuid": "^9.0.1",
        "chokidar": "^3.5.3"
    }
};

fs.writeFileSync(
    path.join(dxtDir, 'server', 'package.json'),
    JSON.stringify(packageJson, null, 2)
);

// Install dependencies
console.log('📦 Installing dependencies...');
try {
    execSync('npm install --production', {
        cwd: path.join(dxtDir, 'server'),
        stdio: 'inherit'
    });
} catch (error) {
    console.error('Failed to install dependencies');
}

// Create the DXT zip file
console.log('🗜️  Creating DXT archive...');
const outputPath = path.join(distDir, 'like-i-said-memory-v2.dxt');
const output = createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);
archive.directory(dxtDir, false);

output.on('close', () => {
    const size = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log('\n✅ DXT package created successfully!');
    console.log(`📦 File: ${outputPath}`);
    console.log(`📏 Size: ${size} MB`);
    
    // Test the package
    console.log('\n🧪 Testing package structure...');
    testDxtPackage(outputPath);
});

archive.finalize();

function testDxtPackage(dxtPath) {
    try {
        // Check file exists
        if (!fs.existsSync(dxtPath)) {
            console.error('❌ DXT file not found');
            return;
        }
        
        // Check file size
        const stats = fs.statSync(dxtPath);
        const sizeMB = stats.size / 1024 / 1024;
        console.log(`✅ File size: ${sizeMB.toFixed(2)} MB`);
        
        // Verify it's a valid zip
        try {
            execSync(`unzip -t "${dxtPath}"`, { stdio: 'pipe' });
            console.log('✅ Valid ZIP archive');
        } catch (e) {
            console.error('❌ Invalid ZIP archive');
        }
        
        console.log('\n🎉 DXT package is ready for testing!');
        console.log('📋 Next steps:');
        console.log('1. Install in Claude Desktop by dragging the .dxt file');
        console.log('2. Configure settings in Claude Desktop UI');
        console.log('3. Test with "Test Like-I-Said memory tools"');
        
    } catch (error) {
        console.error('❌ Error testing package:', error.message);
    }
}