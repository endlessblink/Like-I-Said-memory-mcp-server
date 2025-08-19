#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Memory Backup Script - Phase 1 of Migration Plan
 * Creates a complete backup of the memories folder with verification
 */

async function createBackup() {
    const memoriesPath = path.join(__dirname, '..', 'memories');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(__dirname, '..', `memory-backup-${timestamp}`);
    
    console.log('🔄 Starting memory backup process...');
    console.log(`📁 Source: ${memoriesPath}`);
    console.log(`💾 Destination: ${backupPath}`);
    
    try {
        // Check if memories folder exists
        if (!await fs.pathExists(memoriesPath)) {
            throw new Error('Memories folder not found!');
        }
        
        // Get statistics
        const stats = await getDirectoryStats(memoriesPath);
        console.log(`\n📊 Backup Statistics:`);
        console.log(`   Total files: ${stats.fileCount}`);
        console.log(`   Total size: ${formatBytes(stats.totalSize)}`);
        console.log(`   Folders: ${stats.folderCount}`);
        
        // Create backup
        console.log('\n📋 Creating backup...');
        await fs.copy(memoriesPath, backupPath, {
            preserveTimestamps: true,
            errorOnExist: true
        });
        
        // Verify backup
        console.log('\n✅ Verifying backup integrity...');
        const backupStats = await getDirectoryStats(backupPath);
        
        if (backupStats.fileCount !== stats.fileCount) {
            throw new Error(`File count mismatch! Original: ${stats.fileCount}, Backup: ${backupStats.fileCount}`);
        }
        
        // Create backup manifest
        const manifest = {
            timestamp,
            originalPath: memoriesPath,
            backupPath,
            statistics: stats,
            files: await getFileList(memoriesPath)
        };
        
        await fs.writeJson(path.join(backupPath, 'backup-manifest.json'), manifest, { spaces: 2 });
        
        console.log('\n✅ Backup completed successfully!');
        console.log(`📄 Manifest created: ${path.join(backupPath, 'backup-manifest.json')}`);
        
        return backupPath;
        
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        // Clean up partial backup if it exists
        if (await fs.pathExists(backupPath)) {
            await fs.remove(backupPath);
        }
        throw error;
    }
}

async function getDirectoryStats(dirPath) {
    const stats = {
        fileCount: 0,
        folderCount: 0,
        totalSize: 0
    };
    
    async function walkDir(currentPath) {
        const items = await fs.readdir(currentPath);
        
        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const itemStats = await fs.stat(itemPath);
            
            if (itemStats.isDirectory()) {
                stats.folderCount++;
                await walkDir(itemPath);
            } else {
                stats.fileCount++;
                stats.totalSize += itemStats.size;
            }
        }
    }
    
    await walkDir(dirPath);
    return stats;
}

async function getFileList(dirPath) {
    const files = [];
    
    async function walkDir(currentPath, relativePath = '') {
        const items = await fs.readdir(currentPath);
        
        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const itemRelativePath = path.join(relativePath, item);
            const itemStats = await fs.stat(itemPath);
            
            if (itemStats.isDirectory()) {
                await walkDir(itemPath, itemRelativePath);
            } else {
                files.push({
                    path: itemRelativePath,
                    size: itemStats.size,
                    modified: itemStats.mtime
                });
            }
        }
    }
    
    await walkDir(dirPath);
    return files;
}

function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Run the backup
if (require.main === module) {
    createBackup()
        .then(backupPath => {
            console.log(`\n🎉 Backup location: ${backupPath}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Backup failed:', error);
            process.exit(1);
        });
}

module.exports = { createBackup };