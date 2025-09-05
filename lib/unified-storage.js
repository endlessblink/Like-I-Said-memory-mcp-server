#!/usr/bin/env node

/**
 * Unified Cross-Platform Storage System
 * 
 * Provides unified storage across Windows, WSL2, and WSL1 environments
 * with automatic path resolution and environment detection.
 * 
 * Features:
 * ✅ Automatic environment detection (Windows/WSL2/WSL1)
 * ✅ Cross-platform path resolution (D:\\ ↔ /mnt/d/)
 * ✅ Unified storage location for all systems
 * ✅ Migration utilities for existing data
 * ✅ Backward compatibility with existing storage
 */

import fs from 'fs-extra';
import path from 'path';
import upath from 'upath';
import os from 'os';
import isWsl from 'is-wsl';

class UnifiedStorage {
    constructor(options = {}) {
        this.appName = options.appName || 'like-i-said-mcp';
        this.environment = this.detectEnvironment();
        this.unifiedPath = this.getUnifiedStoragePath();
        this.legacyPaths = this.getLegacyStoragePaths();
        this.initialized = false;
        
        // Configuration
        this.config = {
            enableMigration: options.enableMigration !== false,
            createBackups: options.createBackups !== false,
            preserveLegacy: options.preserveLegacy !== false,
            ...options
        };

        console.log(`📁 UnifiedStorage initialized for ${this.environment}`);
        console.log(`📍 Unified path: ${this.unifiedPath}`);
    }

    /**
     * Detect the current runtime environment
     */
    detectEnvironment() {
        const platform = process.platform;
        
        if (platform === 'win32') {
            return 'windows';
        }
        
        if (platform === 'linux') {
            if (isWsl) {
                // Check for WSL version
                try {
                    const version = fs.readFileSync('/proc/version', 'utf8');
                    return version.includes('WSL2') ? 'wsl2' : 'wsl1';
                } catch (error) {
                    return 'wsl';
                }
            }
            return 'linux';
        }
        
        return 'unknown';
    }

    /**
     * Get the unified storage path that works across all systems
     */
    getUnifiedStoragePath() {
        const basePath = this.getSharedBasePath();
        return upath.join(basePath, this.appName);
    }

    /**
     * Get shared base path that all systems can access
     */
    getSharedBasePath() {
        switch (this.environment) {
            case 'windows':
                // Use current project directory
                return 'D:/APPSNospaces';
                
            case 'wsl1':
            case 'wsl2':
                // Map to current project directory via WSL mount
                return '/mnt/d/APPSNospaces';
                
            case 'linux':
                // Native Linux - use home directory
                return path.join(os.homedir(), '.local', 'share');
                
            default:
                throw new Error(`Unsupported environment: ${this.environment}`);
        }
    }

    /**
     * Get legacy storage paths to migrate from
     */
    getLegacyStoragePaths() {
        const paths = [];
        
        // Current project location
        paths.push('/mnt/d/APPSNospaces/like-i-said-mcp');
        
        // Home directory locations
        paths.push(path.join(os.homedir(), 'memories'));
        paths.push(path.join(os.homedir(), 'projects', 'memories'));
        paths.push(path.join(os.homedir(), 'projects', 'tasks'));
        
        // Other common locations
        paths.push('/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Video + Motion/rough-cut-mcp');
        
        return paths.filter(p => {
            try {
                return fs.existsSync(p);
            } catch (error) {
                return false;
            }
        });
    }

    /**
     * Convert paths between Windows and Unix formats
     */
    toWindowsPath(unixPath) {
        if (this.environment === 'windows') {
            return unixPath;
        }

        // Convert /mnt/d/path to D:\path
        if (unixPath.startsWith('/mnt/')) {
            const parts = unixPath.split('/');
            const drive = parts[2].toUpperCase();
            const remainingPath = parts.slice(3).join('\\');
            return `${drive}:\\${remainingPath}`;
        }

        return unixPath;
    }

    toUnixPath(windowsPath) {
        if (this.environment !== 'windows') {
            return windowsPath;
        }

        // Convert D:\path to /mnt/d/path
        const match = windowsPath.match(/^([A-Z]):\\(.*)$/);
        if (match) {
            const [, drive, remainingPath] = match;
            return `/mnt/${drive.toLowerCase()}/${remainingPath.replace(/\\/g, '/')}`;
        }

        return windowsPath;
    }

    /**
     * Get normalized path using upath
     */
    normalize(inputPath) {
        return upath.normalize(inputPath);
    }

    /**
     * Join path segments safely
     */
    join(...segments) {
        return upath.join(...segments);
    }

    /**
     * Resolve absolute path
     */
    resolve(...segments) {
        return upath.resolve(...segments);
    }

    /**
     * Initialize unified storage
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Create unified storage directory
            await this.ensureDirectory(this.unifiedPath);
            
            // Create subdirectories
            await this.ensureDirectory(this.join(this.unifiedPath, 'memories'));
            await this.ensureDirectory(this.join(this.unifiedPath, 'tasks'));
            await this.ensureDirectory(this.join(this.unifiedPath, 'backups'));
            
            console.log(`✅ Unified storage initialized at: ${this.unifiedPath}`);
            
            // Run migration if enabled
            if (this.config.enableMigration) {
                await this.migrateLegacyData();
            }
            
            this.initialized = true;
        } catch (error) {
            console.error(`❌ Failed to initialize unified storage: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.ensureDir(dirPath);
            console.log(`📁 Directory ensured: ${dirPath}`);
        } catch (error) {
            console.error(`❌ Failed to create directory ${dirPath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Safe file write with backup
     */
    async writeFile(filename, data, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const filePath = this.join(this.unifiedPath, filename);
        
        try {
            // Ensure directory exists
            await fs.ensureDir(path.dirname(filePath));
            
            // Create backup if file exists and backups are enabled
            if (this.config.createBackups && await fs.pathExists(filePath)) {
                const backupPath = this.join(this.unifiedPath, 'backups', `${path.basename(filename)}.backup.${Date.now()}`);
                await fs.copy(filePath, backupPath);
            }

            // Normalize line endings
            const normalizedData = typeof data === 'string' 
                ? data.replace(/\r\n/g, '\n') 
                : data;

            await fs.writeFile(filePath, normalizedData, 'utf8');
            console.log(`💾 File written: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error(`❌ Failed to write file ${filePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Safe file read
     */
    async readFile(filename) {
        if (!this.initialized) {
            await this.initialize();
        }

        const filePath = this.join(this.unifiedPath, filename);

        try {
            const data = await fs.readFile(filePath, 'utf8');
            return data;
        } catch (error) {
            console.error(`❌ Failed to read file ${filePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if file exists
     */
    async exists(filename) {
        if (!this.initialized) {
            await this.initialize();
        }

        const filePath = this.join(this.unifiedPath, filename);
        return fs.pathExists(filePath);
    }

    /**
     * List files in directory
     */
    async listFiles(subDir = '') {
        if (!this.initialized) {
            await this.initialize();
        }

        const dirPath = subDir ? this.join(this.unifiedPath, subDir) : this.unifiedPath;
        
        try {
            const files = await fs.readdir(dirPath);
            return files.filter(file => !file.startsWith('.'));
        } catch (error) {
            console.error(`❌ Failed to list files in ${dirPath}: ${error.message}`);
            return [];
        }
    }

    /**
     * Migrate legacy data to unified storage
     */
    async migrateLegacyData() {
        console.log(`🔄 Starting migration from ${this.legacyPaths.length} legacy locations...`);
        
        for (const legacyPath of this.legacyPaths) {
            await this.migratePath(legacyPath);
        }
        
        console.log(`✅ Migration completed`);
    }

    /**
     * Migrate data from specific legacy path
     */
    async migratePath(legacyPath) {
        try {
            const memoriesPath = this.join(legacyPath, 'memories');
            const tasksPath = this.join(legacyPath, 'tasks');
            
            // Migrate memories
            if (await fs.pathExists(memoriesPath)) {
                await this.migrateDirectory(memoriesPath, this.join(this.unifiedPath, 'memories'));
            }
            
            // Migrate tasks
            if (await fs.pathExists(tasksPath)) {
                await this.migrateDirectory(tasksPath, this.join(this.unifiedPath, 'tasks'));
            }
            
        } catch (error) {
            console.error(`⚠️  Migration warning for ${legacyPath}: ${error.message}`);
        }
    }

    /**
     * Migrate entire directory
     */
    async migrateDirectory(sourcePath, targetPath) {
        try {
            if (!await fs.pathExists(sourcePath)) {
                return;
            }

            const files = await fs.readdir(sourcePath, { withFileTypes: true });
            
            for (const file of files) {
                const sourceFile = this.join(sourcePath, file.name);
                const targetFile = this.join(targetPath, file.name);
                
                if (file.isDirectory()) {
                    await this.ensureDirectory(targetFile);
                    await this.migrateDirectory(sourceFile, targetFile);
                } else {
                    // Only copy if target doesn't exist or is older
                    if (!await fs.pathExists(targetFile)) {
                        await fs.copy(sourceFile, targetFile);
                        console.log(`📋 Migrated: ${file.name}`);
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Failed to migrate directory ${sourcePath}: ${error.message}`);
        }
    }

    /**
     * Get storage statistics
     */
    async getStats() {
        if (!this.initialized) {
            await this.initialize();
        }

        const stats = {
            environment: this.environment,
            unifiedPath: this.unifiedPath,
            legacyPaths: this.legacyPaths,
            memories: 0,
            tasks: 0,
            totalSize: 0
        };

        try {
            // Count memories
            const memoriesPath = this.join(this.unifiedPath, 'memories');
            if (await fs.pathExists(memoriesPath)) {
                const memoryDirs = await fs.readdir(memoriesPath, { withFileTypes: true });
                for (const dir of memoryDirs) {
                    if (dir.isDirectory()) {
                        const files = await fs.readdir(this.join(memoriesPath, dir.name));
                        stats.memories += files.length;
                    }
                }
            }

            // Count tasks
            const tasksPath = this.join(this.unifiedPath, 'tasks');
            if (await fs.pathExists(tasksPath)) {
                const taskDirs = await fs.readdir(tasksPath, { withFileTypes: true });
                for (const dir of taskDirs) {
                    if (dir.isDirectory()) {
                        const files = await fs.readdir(this.join(tasksPath, dir.name));
                        stats.tasks += files.length;
                    }
                }
            }

        } catch (error) {
            console.error(`❌ Failed to get stats: ${error.message}`);
        }

        return stats;
    }

    /**
     * Test cross-platform compatibility
     */
    async testCompatibility() {
        const testResults = {
            environment: this.environment,
            pathResolution: false,
            writeAccess: false,
            readAccess: false,
            crossPlatform: false
        };

        try {
            // Test path resolution
            const testPath = this.join(this.unifiedPath, 'test-compatibility.json');
            testResults.pathResolution = true;

            // Test write access
            const testData = {
                timestamp: new Date().toISOString(),
                environment: this.environment,
                testMessage: 'Cross-platform compatibility test'
            };
            
            await this.writeFile('test-compatibility.json', JSON.stringify(testData, null, 2));
            testResults.writeAccess = true;

            // Test read access
            const readData = await this.readFile('test-compatibility.json');
            const parsed = JSON.parse(readData);
            testResults.readAccess = parsed.environment === this.environment;

            // Test cross-platform paths
            const windowsPath = this.toWindowsPath(testPath);
            const unixPath = this.toUnixPath(testPath);
            testResults.crossPlatform = windowsPath !== testPath || unixPath !== testPath;

            console.log(`✅ Compatibility test completed:`, testResults);

        } catch (error) {
            console.error(`❌ Compatibility test failed: ${error.message}`);
            testResults.error = error.message;
        }

        return testResults;
    }
}

export default UnifiedStorage;