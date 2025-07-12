#!/usr/bin/env node

/**
 * Export user data for migration to DXT version
 * Exports memories, tasks, and settings to a portable format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const exportDir = path.join(ROOT_DIR, 'exports');
const exportFile = path.join(exportDir, `like-i-said-export-${timestamp}.zip`);

console.log('📦 Like-I-Said Data Export Tool');
console.log('================================');
console.log('');

// Create exports directory
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
}

// Directories to export
const dataDirectories = [
    { source: 'memories', description: 'Memory files' },
    { source: 'tasks', description: 'Task files' },
    { source: 'data', description: 'Settings and configuration' },
    { source: 'data-backups', description: 'Backup files', optional: true }
];

// Check what data exists
console.log('🔍 Checking for data to export...');
let hasData = false;

dataDirectories.forEach(dir => {
    const dirPath = path.join(ROOT_DIR, dir.source);
    if (fs.existsSync(dirPath)) {
        const stats = getDirectoryStats(dirPath);
        if (stats.fileCount > 0) {
            console.log(`✓ ${dir.description}: ${stats.fileCount} files (${formatSize(stats.totalSize)})`);
            hasData = true;
        } else if (!dir.optional) {
            console.log(`⚠️  ${dir.description}: Empty directory`);
        }
    } else if (!dir.optional) {
        console.log(`❌ ${dir.description}: Directory not found`);
    }
});

if (!hasData) {
    console.log('');
    console.log('❌ No data found to export');
    process.exit(1);
}

// Create export metadata
const metadata = {
    version: '2.3.7',
    exportDate: new Date().toISOString(),
    exportedFrom: process.platform,
    directories: {}
};

// Export data
console.log('');
console.log('📁 Creating export archive...');

const output = fs.createWriteStream(exportFile);
const archive = archiver('zip', {
    zlib: { level: 9 }
});

output.on('close', () => {
    const size = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log('');
    console.log('✅ Export completed successfully!');
    console.log(`📦 File: ${exportFile}`);
    console.log(`📏 Size: ${size} MB`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Install the DXT version of Like-I-Said');
    console.log('   2. Run: npm run import:data -- --from ' + exportFile);
    console.log('   3. Verify your data was imported correctly');
    
    // Save metadata
    const metadataFile = exportFile.replace('.zip', '-metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log('');
    console.log(`📋 Metadata saved to: ${metadataFile}`);
});

archive.on('error', (err) => {
    console.error('❌ Export failed:', err);
    process.exit(1);
});

archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn('⚠️  Warning:', err);
    } else {
        throw err;
    }
});

// Start archiving
archive.pipe(output);

// Add directories to archive
dataDirectories.forEach(dir => {
    const dirPath = path.join(ROOT_DIR, dir.source);
    if (fs.existsSync(dirPath)) {
        const stats = getDirectoryStats(dirPath);
        if (stats.fileCount > 0) {
            archive.directory(dirPath, dir.source);
            metadata.directories[dir.source] = stats;
        }
    }
});

// Add export metadata
archive.append(JSON.stringify(metadata, null, 2), { name: 'export-metadata.json' });

// Add migration guide
const migrationGuide = `# Like-I-Said Data Migration Guide

This archive contains your exported Like-I-Said data.

## Contents
- memories/: Your saved memories organized by project
- tasks/: Your task management data
- data/: Configuration and settings
- data-backups/: Automatic backup files (if any)

## Import Instructions

1. Install the DXT version of Like-I-Said in Claude Desktop
2. Open a terminal in the Like-I-Said directory
3. Run: npm run import:data -- --from "${exportFile}"
4. Follow the prompts to complete the import

## Manual Import (if needed)

If automatic import fails:
1. Extract this archive
2. Copy the contents to your new Like-I-Said data directory
3. Restart the Like-I-Said server

## Support

If you encounter issues:
- GitHub: https://github.com/endlessblink/Like-I-Said-Memory-V2/issues
`;

archive.append(migrationGuide, { name: 'README.md' });

// Finalize archive
archive.finalize();

// Helper functions
function getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;

    function walkDir(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walkDir(filePath);
            } else {
                fileCount++;
                totalSize += stat.size;
            }
        });
    }

    walkDir(dirPath);
    return { fileCount, totalSize };
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}