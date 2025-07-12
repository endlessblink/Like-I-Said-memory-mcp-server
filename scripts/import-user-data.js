#!/usr/bin/env node

/**
 * Import user data from previous Like-I-Said installation
 * Supports importing from export archives or direct directories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import unzipper from 'unzipper';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const fromIndex = args.findIndex(arg => arg === '--from');
const sourcePath = fromIndex !== -1 && args[fromIndex + 1] ? args[fromIndex + 1] : null;

if (!sourcePath) {
    console.error('Usage: npm run import:data -- --from <path-to-export-or-directory>');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('📥 Like-I-Said Data Import Tool');
console.log('================================');
console.log('');

// Check if source exists
if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source not found: ${sourcePath}`);
    process.exit(1);
}

const isZip = sourcePath.endsWith('.zip');
const tempExtractDir = path.join(ROOT_DIR, '.import-temp');

async function main() {
    try {
        let importSource = sourcePath;
        
        // Extract if it's a zip file
        if (isZip) {
            console.log('📦 Extracting archive...');
            await extractArchive(sourcePath, tempExtractDir);
            importSource = tempExtractDir;
        }

        // Analyze import data
        console.log('🔍 Analyzing import data...');
        const analysis = analyzeImportData(importSource);
        
        if (!analysis.hasData) {
            console.error('❌ No valid data found to import');
            cleanup();
            process.exit(1);
        }

        // Show analysis results
        console.log('');
        console.log('📊 Import Summary:');
        Object.entries(analysis.directories).forEach(([dir, stats]) => {
            if (stats.exists) {
                console.log(`   ${dir}: ${stats.fileCount} files (${formatSize(stats.totalSize)})`);
            }
        });

        // Check for existing data
        const existingData = checkExistingData();
        if (existingData.hasData) {
            console.log('');
            console.log('⚠️  Warning: Existing data detected!');
            console.log('   The following directories contain data:');
            Object.entries(existingData.directories).forEach(([dir, stats]) => {
                if (stats.fileCount > 0) {
                    console.log(`   - ${dir}: ${stats.fileCount} files`);
                }
            });
            
            const proceed = await askQuestion('\nDo you want to proceed? This will merge with existing data. (yes/no): ');
            if (proceed.toLowerCase() !== 'yes') {
                console.log('Import cancelled.');
                cleanup();
                process.exit(0);
            }
        }

        // Create backup of existing data
        if (existingData.hasData) {
            console.log('');
            console.log('💾 Creating backup of existing data...');
            await createBackup();
        }

        // Import data
        console.log('');
        console.log('📂 Importing data...');
        await importData(importSource, analysis);

        // Cleanup
        cleanup();

        console.log('');
        console.log('✅ Import completed successfully!');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('   1. Start the Like-I-Said server: npm start');
        console.log('   2. Access the dashboard: http://localhost:3001');
        console.log('   3. Verify your memories and tasks were imported');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        cleanup();
        process.exit(1);
    }
}

async function extractArchive(zipPath, extractTo) {
    if (fs.existsSync(extractTo)) {
        fs.rmSync(extractTo, { recursive: true, force: true });
    }
    fs.mkdirSync(extractTo, { recursive: true });

    return new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: extractTo }))
            .on('close', resolve)
            .on('error', reject);
    });
}

function analyzeImportData(sourcePath) {
    const analysis = {
        hasData: false,
        metadata: null,
        directories: {}
    };

    // Check for metadata
    const metadataPath = path.join(sourcePath, 'export-metadata.json');
    if (fs.existsSync(metadataPath)) {
        analysis.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }

    // Check directories
    const checkDirs = ['memories', 'tasks', 'data'];
    checkDirs.forEach(dir => {
        const dirPath = path.join(sourcePath, dir);
        if (fs.existsSync(dirPath)) {
            const stats = getDirectoryStats(dirPath);
            analysis.directories[dir] = { ...stats, exists: true };
            if (stats.fileCount > 0) {
                analysis.hasData = true;
            }
        } else {
            analysis.directories[dir] = { exists: false, fileCount: 0, totalSize: 0 };
        }
    });

    return analysis;
}

function checkExistingData() {
    const existing = {
        hasData: false,
        directories: {}
    };

    const checkDirs = ['memories', 'tasks', 'data'];
    checkDirs.forEach(dir => {
        const dirPath = path.join(ROOT_DIR, dir);
        if (fs.existsSync(dirPath)) {
            const stats = getDirectoryStats(dirPath);
            existing.directories[dir] = stats;
            if (stats.fileCount > 0) {
                existing.hasData = true;
            }
        } else {
            existing.directories[dir] = { fileCount: 0, totalSize: 0 };
        }
    });

    return existing;
}

async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(ROOT_DIR, 'data-backups', `pre-import-${timestamp}`);
    
    fs.mkdirSync(backupDir, { recursive: true });
    
    const dirsToBackup = ['memories', 'tasks', 'data'];
    dirsToBackup.forEach(dir => {
        const sourcePath = path.join(ROOT_DIR, dir);
        if (fs.existsSync(sourcePath)) {
            const destPath = path.join(backupDir, dir);
            copyDirectory(sourcePath, destPath);
        }
    });
    
    console.log(`   Backup saved to: ${backupDir}`);
}

async function importData(sourcePath, analysis) {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import each directory
    Object.entries(analysis.directories).forEach(([dir, stats]) => {
        if (stats.exists && stats.fileCount > 0) {
            console.log(`   Importing ${dir}...`);
            const sourceDir = path.join(sourcePath, dir);
            const destDir = path.join(ROOT_DIR, dir);
            
            try {
                const result = mergeDirectory(sourceDir, destDir);
                imported += result.imported;
                skipped += result.skipped;
                errors += result.errors;
            } catch (error) {
                console.error(`   ❌ Error importing ${dir}:`, error.message);
                errors++;
            }
        }
    });

    console.log('');
    console.log('📊 Import Results:');
    console.log(`   ✓ Imported: ${imported} files`);
    if (skipped > 0) console.log(`   ⚠️  Skipped: ${skipped} files (already exist)`);
    if (errors > 0) console.log(`   ❌ Errors: ${errors} files`);
}

function mergeDirectory(sourceDir, destDir) {
    const result = { imported: 0, skipped: 0, errors: 0 };
    
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    function walkAndCopy(source, dest) {
        const files = fs.readdirSync(source);
        
        files.forEach(file => {
            const sourcePath = path.join(source, file);
            const destPath = path.join(dest, file);
            const stat = fs.statSync(sourcePath);
            
            if (stat.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                walkAndCopy(sourcePath, destPath);
            } else {
                try {
                    if (fs.existsSync(destPath)) {
                        // Skip if file already exists (you could also implement merge logic here)
                        result.skipped++;
                    } else {
                        fs.copyFileSync(sourcePath, destPath);
                        result.imported++;
                    }
                } catch (error) {
                    console.error(`Error copying ${file}:`, error.message);
                    result.errors++;
                }
            }
        });
    }

    walkAndCopy(sourceDir, destDir);
    return result;
}

function copyDirectory(source, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(dest, file);
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    });
}

function getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;

    function walkDir(dir) {
        try {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        walkDir(filePath);
                    } else {
                        fileCount++;
                        totalSize += stat.size;
                    }
                } catch (err) {
                    // Skip files we can't access
                }
            });
        } catch (err) {
            // Skip directories we can't access
        }
    }

    walkDir(dirPath);
    return { fileCount, totalSize };
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

function cleanup() {
    rl.close();
    if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
}

// Run the import
main();