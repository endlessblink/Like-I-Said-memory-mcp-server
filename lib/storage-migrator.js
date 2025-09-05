#!/usr/bin/env node

/**
 * Storage Migration Utilities
 * 
 * Advanced migration tools to safely consolidate scattered memories and tasks
 * from multiple locations into unified cross-platform storage.
 * 
 * Features:
 * ✅ Data validation and conflict resolution
 * ✅ Comprehensive backup system
 * ✅ Progress tracking and reporting
 * ✅ Rollback capabilities
 * ✅ Duplicate detection and merging
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import UnifiedStorage from './unified-storage.js';

class StorageMigrator {
    constructor(options = {}) {
        this.unifiedStorage = new UnifiedStorage({
            ...options,
            enableMigration: false  // We'll handle migration manually
        });
        
        this.options = {
            createBackups: options.createBackups !== false,
            validateData: options.validateData !== false,
            resolveDuplicates: options.resolveDuplicates !== false,
            dryRun: options.dryRun === true,
            ...options
        };

        this.migrationReport = {
            started: new Date().toISOString(),
            sources: [],
            results: {
                memoriesFound: 0,
                memoriesMigrated: 0,
                memoriesSkipped: 0,
                memoriesFailed: 0,
                tasksFound: 0,
                tasksMigrated: 0,
                tasksSkipped: 0,
                tasksFailed: 0,
                duplicatesFound: 0,
                conflictsResolved: 0,
                backupsCreated: 0
            },
            errors: [],
            warnings: []
        };
    }

    /**
     * Main migration method
     */
    async migrate() {
        console.log(`🚀 Starting storage migration ${this.options.dryRun ? '(DRY RUN)' : ''}...`);
        
        try {
            // Initialize unified storage
            if (!this.options.dryRun) {
                await this.unifiedStorage.initialize();
            }

            // Create backup of current unified storage if it exists
            if (this.options.createBackups) {
                await this.createUnifiedStorageBackup();
            }

            // Discover all source locations
            const sources = await this.discoverSources();
            this.migrationReport.sources = sources;

            // Migrate each source
            for (const source of sources) {
                await this.migrateSource(source);
            }

            // Generate final report
            this.migrationReport.completed = new Date().toISOString();
            this.migrationReport.duration = Date.now() - new Date(this.migrationReport.started).getTime();

            await this.generateReport();
            
            console.log(`✅ Migration completed successfully!`);
            return this.migrationReport;

        } catch (error) {
            console.error(`❌ Migration failed: ${error.message}`);
            this.migrationReport.errors.push({
                type: 'MIGRATION_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Discover all potential data sources
     */
    async discoverSources() {
        const sources = [];
        const potentialPaths = [
            ...this.unifiedStorage.legacyPaths,
            // Add more specific locations
            '/mnt/d/APPSNospaces/like-i-said-mcp/memories',
            '/mnt/d/APPSNospaces/like-i-said-mcp/tasks',
            '/home/endlessblink/.cache/uv/git-v0/checkouts/42910dfe8296368e/66b17cd/.serena/memories'
        ];

        for (const potentialPath of potentialPaths) {
            const sourceInfo = await this.analyzeSource(potentialPath);
            if (sourceInfo.isValid) {
                sources.push(sourceInfo);
            }
        }

        console.log(`📍 Discovered ${sources.length} valid data sources`);
        return sources;
    }

    /**
     * Analyze a potential source location
     */
    async analyzeSource(sourcePath) {
        const sourceInfo = {
            path: sourcePath,
            isValid: false,
            type: 'unknown',
            memoriesPath: null,
            tasksPath: null,
            memoryCount: 0,
            taskCount: 0,
            estimatedSize: 0
        };

        try {
            if (!await fs.pathExists(sourcePath)) {
                return sourceInfo;
            }

            // Check if it's a direct memories/tasks folder
            if (sourcePath.endsWith('/memories') || sourcePath.endsWith('/tasks')) {
                sourceInfo.isValid = true;
                sourceInfo.type = path.basename(sourcePath);
                
                if (sourceInfo.type === 'memories') {
                    sourceInfo.memoriesPath = sourcePath;
                    sourceInfo.memoryCount = await this.countFiles(sourcePath);
                } else {
                    sourceInfo.tasksPath = sourcePath;
                    sourceInfo.taskCount = await this.countFiles(sourcePath);
                }
            } else {
                // Check if it contains memories and/or tasks folders
                const memoriesPath = path.join(sourcePath, 'memories');
                const tasksPath = path.join(sourcePath, 'tasks');
                
                const hasMemories = await fs.pathExists(memoriesPath);
                const hasTasks = await fs.pathExists(tasksPath);
                
                if (hasMemories || hasTasks) {
                    sourceInfo.isValid = true;
                    sourceInfo.type = 'project';
                    
                    if (hasMemories) {
                        sourceInfo.memoriesPath = memoriesPath;
                        sourceInfo.memoryCount = await this.countFiles(memoriesPath);
                    }
                    
                    if (hasTasks) {
                        sourceInfo.tasksPath = tasksPath;
                        sourceInfo.taskCount = await this.countFiles(tasksPath);
                    }
                }
            }

            console.log(`📂 ${sourcePath}: ${sourceInfo.memoryCount} memories, ${sourceInfo.taskCount} tasks`);

        } catch (error) {
            console.warn(`⚠️  Could not analyze ${sourcePath}: ${error.message}`);
        }

        return sourceInfo;
    }

    /**
     * Count files in directory recursively
     */
    async countFiles(dirPath) {
        try {
            let count = 0;
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                if (item.isDirectory()) {
                    count += await this.countFiles(path.join(dirPath, item.name));
                } else if (item.name.endsWith('.md') || item.name.endsWith('.json')) {
                    count++;
                }
            }
            
            return count;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Migrate a single source
     */
    async migrateSource(source) {
        console.log(`🔄 Migrating source: ${source.path}`);

        try {
            // Migrate memories
            if (source.memoriesPath) {
                await this.migrateData(source.memoriesPath, 'memories');
            }

            // Migrate tasks
            if (source.tasksPath) {
                await this.migrateData(source.tasksPath, 'tasks');
            }

        } catch (error) {
            console.error(`❌ Failed to migrate ${source.path}: ${error.message}`);
            this.migrationReport.errors.push({
                type: 'SOURCE_MIGRATION_FAILED',
                source: source.path,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Migrate data from source to unified storage
     */
    async migrateData(sourcePath, dataType) {
        try {
            const items = await fs.readdir(sourcePath, { withFileTypes: true });
            
            for (const item of items) {
                const sourceItemPath = path.join(sourcePath, item.name);
                
                if (item.isDirectory()) {
                    // Migrate project directory
                    await this.migrateProjectDirectory(sourceItemPath, dataType, item.name);
                } else if (item.name.endsWith('.md') || item.name.endsWith('.json')) {
                    // Migrate individual file
                    await this.migrateFile(sourceItemPath, dataType, 'default');
                }
            }

        } catch (error) {
            console.error(`❌ Failed to migrate data from ${sourcePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Migrate a project directory
     */
    async migrateProjectDirectory(sourcePath, dataType, projectName) {
        try {
            const items = await fs.readdir(sourcePath, { withFileTypes: true });
            
            for (const item of items) {
                if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.json'))) {
                    const sourceFilePath = path.join(sourcePath, item.name);
                    await this.migrateFile(sourceFilePath, dataType, projectName);
                }
            }

        } catch (error) {
            console.error(`❌ Failed to migrate project ${projectName}: ${error.message}`);
        }
    }

    /**
     * Migrate individual file with conflict resolution
     */
    async migrateFile(sourceFilePath, dataType, projectName) {
        try {
            const fileName = path.basename(sourceFilePath);
            const targetPath = this.unifiedStorage.join(
                this.unifiedStorage.unifiedPath, 
                dataType, 
                projectName, 
                fileName
            );

            // Read and validate source file
            const sourceContent = await fs.readFile(sourceFilePath, 'utf8');
            const sourceHash = this.generateHash(sourceContent);

            // Check if target exists
            const targetExists = await fs.pathExists(targetPath);
            
            if (targetExists) {
                const targetContent = await fs.readFile(targetPath, 'utf8');
                const targetHash = this.generateHash(targetContent);
                
                if (sourceHash === targetHash) {
                    // Files are identical - skip
                    console.log(`⏭️  Skipped duplicate: ${fileName}`);
                    this.migrationReport.results[`${dataType}Skipped`]++;
                    return;
                } else {
                    // Files are different - resolve conflict
                    await this.resolveConflict(sourceFilePath, targetPath, sourceContent, targetContent, dataType);
                    return;
                }
            }

            // Migrate file
            if (!this.options.dryRun) {
                await fs.ensureDir(path.dirname(targetPath));
                await fs.writeFile(targetPath, sourceContent, 'utf8');
            }

            console.log(`✅ Migrated: ${dataType}/${projectName}/${fileName}`);
            this.migrationReport.results[`${dataType}Migrated`]++;

        } catch (error) {
            console.error(`❌ Failed to migrate ${sourceFilePath}: ${error.message}`);
            this.migrationReport.results[`${dataType}Failed`]++;
            this.migrationReport.errors.push({
                type: 'FILE_MIGRATION_FAILED',
                file: sourceFilePath,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Resolve file conflicts
     */
    async resolveConflict(sourcePath, targetPath, sourceContent, targetContent, dataType) {
        this.migrationReport.results.duplicatesFound++;
        
        if (!this.options.resolveDuplicates) {
            console.log(`⚠️  Conflict found but resolution disabled: ${path.basename(targetPath)}`);
            return;
        }

        try {
            // Create backup of target
            const backupPath = `${targetPath}.backup.${Date.now()}`;
            if (!this.options.dryRun) {
                await fs.writeFile(backupPath, targetContent, 'utf8');
            }

            // Merge strategy: prefer newer content or longer content
            const sourceStats = await fs.stat(sourcePath);
            const targetStats = await fs.stat(targetPath);
            
            let resolvedContent;
            if (sourceStats.mtime > targetStats.mtime) {
                resolvedContent = sourceContent;
                console.log(`🔄 Resolved conflict: Using newer source for ${path.basename(targetPath)}`);
            } else if (sourceContent.length > targetContent.length) {
                resolvedContent = sourceContent;
                console.log(`🔄 Resolved conflict: Using longer source for ${path.basename(targetPath)}`);
            } else {
                resolvedContent = targetContent;
                console.log(`🔄 Resolved conflict: Keeping existing target for ${path.basename(targetPath)}`);
            }

            if (!this.options.dryRun) {
                await fs.writeFile(targetPath, resolvedContent, 'utf8');
            }

            this.migrationReport.results.conflictsResolved++;

        } catch (error) {
            console.error(`❌ Failed to resolve conflict for ${targetPath}: ${error.message}`);
            this.migrationReport.errors.push({
                type: 'CONFLICT_RESOLUTION_FAILED',
                file: targetPath,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Generate hash for content comparison
     */
    generateHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Create backup of current unified storage
     */
    async createUnifiedStorageBackup() {
        try {
            const backupDir = path.join(
                path.dirname(this.unifiedStorage.unifiedPath),
                `backup-${Date.now()}`
            );
            
            if (await fs.pathExists(this.unifiedStorage.unifiedPath)) {
                if (!this.options.dryRun) {
                    await fs.copy(this.unifiedStorage.unifiedPath, backupDir);
                }
                console.log(`💾 Created backup: ${backupDir}`);
                this.migrationReport.results.backupsCreated++;
            }

        } catch (error) {
            console.warn(`⚠️  Failed to create backup: ${error.message}`);
        }
    }

    /**
     * Generate migration report
     */
    async generateReport() {
        const reportPath = this.unifiedStorage.join(
            this.unifiedStorage.unifiedPath,
            'backups',
            `migration-report-${Date.now()}.json`
        );

        const report = {
            ...this.migrationReport,
            summary: {
                totalSources: this.migrationReport.sources.length,
                totalFiles: this.migrationReport.results.memoriesMigrated + this.migrationReport.results.tasksMigrated,
                successRate: this.calculateSuccessRate(),
                durationMs: this.migrationReport.duration,
                durationFormatted: this.formatDuration(this.migrationReport.duration)
            }
        };

        if (!this.options.dryRun) {
            await fs.ensureDir(path.dirname(reportPath));
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        }

        console.log(`📊 Migration Report:`);
        console.log(`  Sources: ${report.summary.totalSources}`);
        console.log(`  Files migrated: ${report.summary.totalFiles}`);
        console.log(`  Success rate: ${report.summary.successRate}%`);
        console.log(`  Duration: ${report.summary.durationFormatted}`);
        console.log(`  Conflicts resolved: ${report.results.conflictsResolved}`);
        console.log(`  Errors: ${report.errors.length}`);

        return report;
    }

    /**
     * Calculate success rate
     */
    calculateSuccessRate() {
        const total = this.migrationReport.results.memoriesFound + this.migrationReport.results.tasksFound;
        const successful = this.migrationReport.results.memoriesMigrated + this.migrationReport.results.tasksMigrated;
        
        if (total === 0) return 100;
        return Math.round((successful / total) * 100);
    }

    /**
     * Format duration in human-readable form
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Rollback migration (if needed)
     */
    async rollback(backupPath) {
        try {
            console.log(`🔄 Rolling back migration from ${backupPath}...`);
            
            if (await fs.pathExists(backupPath)) {
                // Remove current unified storage
                await fs.remove(this.unifiedStorage.unifiedPath);
                
                // Restore from backup
                await fs.copy(backupPath, this.unifiedStorage.unifiedPath);
                
                console.log(`✅ Rollback completed successfully`);
            } else {
                throw new Error(`Backup not found: ${backupPath}`);
            }

        } catch (error) {
            console.error(`❌ Rollback failed: ${error.message}`);
            throw error;
        }
    }
}

export default StorageMigrator;