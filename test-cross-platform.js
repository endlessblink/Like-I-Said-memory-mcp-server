#!/usr/bin/env node

/**
 * Comprehensive Cross-Platform Testing Suite
 * 
 * Tests unified storage system across different scenarios and operations
 * to ensure it works reliably in production.
 */

import UnifiedStorage from './lib/unified-storage.js';
import fs from 'fs-extra';
import path from 'path';

class CrossPlatformTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runTest(testName, testFn) {
        console.log(`🧪 Running: ${testName}`);
        try {
            await testFn();
            console.log(`✅ PASS: ${testName}`);
            this.testResults.passed++;
            this.testResults.tests.push({ name: testName, status: 'PASS' });
        } catch (error) {
            console.error(`❌ FAIL: ${testName} - ${error.message}`);
            this.testResults.failed++;
            this.testResults.tests.push({ name: testName, status: 'FAIL', error: error.message });
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Cross-Platform Storage Tests...\n');

        // Test 1: Environment Detection
        await this.runTest('Environment Detection', async () => {
            const storage = new UnifiedStorage({ appName: 'cross-platform-test' });
            
            // Should detect WSL2 in our current environment
            if (storage.environment !== 'wsl2') {
                throw new Error(`Expected 'wsl2', got '${storage.environment}'`);
            }
            
            // Unified path should be correct
            const expectedPath = '/mnt/d/shared/cross-platform-test';
            if (storage.unifiedPath !== expectedPath) {
                throw new Error(`Expected '${expectedPath}', got '${storage.unifiedPath}'`);
            }
        });

        // Test 2: Path Resolution
        await this.runTest('Path Resolution', async () => {
            const storage = new UnifiedStorage({ appName: 'test-paths' });
            
            // Test Windows path conversion
            const unixPath = '/mnt/d/shared/test/file.json';
            const windowsPath = storage.toWindowsPath(unixPath);
            const expectedWindows = 'D:\\shared\\test\\file.json';
            
            if (windowsPath !== expectedWindows) {
                throw new Error(`Windows conversion failed: expected '${expectedWindows}', got '${windowsPath}'`);
            }
            
            // Test path joining
            const joined = storage.join('memories', 'test-project', 'test.md');
            if (!joined.includes('memories') || !joined.includes('test-project')) {
                throw new Error(`Path joining failed: ${joined}`);
            }
        });

        // Test 3: Storage Initialization
        await this.runTest('Storage Initialization', async () => {
            const storage = new UnifiedStorage({ 
                appName: 'init-test',
                enableMigration: false 
            });
            
            await storage.initialize();
            
            // Check that directories were created
            const memoriesPath = storage.join(storage.unifiedPath, 'memories');
            const tasksPath = storage.join(storage.unifiedPath, 'tasks');
            
            if (!await fs.pathExists(memoriesPath)) {
                throw new Error('Memories directory not created');
            }
            
            if (!await fs.pathExists(tasksPath)) {
                throw new Error('Tasks directory not created');
            }
        });

        // Test 4: File Operations
        await this.runTest('File Operations', async () => {
            const storage = new UnifiedStorage({ 
                appName: 'file-ops-test',
                createBackups: false 
            });
            
            await storage.initialize();
            
            const testData = {
                test: 'cross-platform file operations',
                timestamp: new Date().toISOString(),
                unicode: 'Test with unicode: 你好 🚀'
            };
            
            const fileName = 'memories/test-project/test-memory.json';
            
            // Write file
            await storage.writeFile(fileName, JSON.stringify(testData, null, 2));
            
            // Read file back
            const readData = await storage.readFile(fileName);
            const parsed = JSON.parse(readData);
            
            if (parsed.test !== testData.test) {
                throw new Error('File read/write failed - data mismatch');
            }
            
            if (parsed.unicode !== testData.unicode) {
                throw new Error('Unicode handling failed');
            }
        });

        // Test 5: Large File Handling
        await this.runTest('Large File Handling', async () => {
            const storage = new UnifiedStorage({ 
                appName: 'large-file-test',
                createBackups: false 
            });
            
            await storage.initialize();
            
            // Create a larger file (1MB of data)
            const largeContent = 'A'.repeat(1024 * 1024);
            const fileName = 'memories/test/large-file.txt';
            
            await storage.writeFile(fileName, largeContent);
            const readContent = await storage.readFile(fileName);
            
            if (readContent.length !== largeContent.length) {
                throw new Error(`Large file size mismatch: expected ${largeContent.length}, got ${readContent.length}`);
            }
        });

        // Test 6: Concurrent Operations
        await this.runTest('Concurrent Operations', async () => {
            const storage = new UnifiedStorage({ 
                appName: 'concurrent-test',
                createBackups: false 
            });
            
            await storage.initialize();
            
            // Write multiple files concurrently
            const promises = [];
            for (let i = 0; i < 10; i++) {
                const fileName = `memories/concurrent/file-${i}.json`;
                const data = { fileNumber: i, timestamp: Date.now() };
                promises.push(storage.writeFile(fileName, JSON.stringify(data)));
            }
            
            await Promise.all(promises);
            
            // Verify all files were written
            for (let i = 0; i < 10; i++) {
                const fileName = `memories/concurrent/file-${i}.json`;
                const exists = await storage.exists(fileName);
                if (!exists) {
                    throw new Error(`Concurrent file ${fileName} not found`);
                }
            }
        });

        // Test 7: Permission Handling
        await this.runTest('Permission Handling', async () => {
            const storage = new UnifiedStorage({ 
                appName: 'permission-test',
                createBackups: false 
            });
            
            await storage.initialize();
            
            const fileName = 'memories/permissions/test.json';
            const testData = { permissions: 'test' };
            
            await storage.writeFile(fileName, JSON.stringify(testData));
            
            // Check file exists and is readable
            const filePath = storage.join(storage.unifiedPath, fileName);
            const stats = await fs.stat(filePath);
            
            if (!stats.isFile()) {
                throw new Error('File not created properly');
            }
            
            // In WSL2, files should be readable
            const readData = await storage.readFile(fileName);
            const parsed = JSON.parse(readData);
            
            if (parsed.permissions !== testData.permissions) {
                throw new Error('Permission test failed - cannot read file');
            }
        });

        // Test 8: Storage Statistics
        await this.runTest('Storage Statistics', async () => {
            const storage = new UnifiedStorage({ 
                appName: 'stats-test',
                createBackups: false 
            });
            
            await storage.initialize();
            
            // Create some test files
            await storage.writeFile('memories/project1/mem1.md', '# Memory 1');
            await storage.writeFile('memories/project1/mem2.md', '# Memory 2');
            await storage.writeFile('tasks/project1/task1.json', '{"task": 1}');
            
            const stats = await storage.getStats();
            
            if (stats.environment !== 'wsl2') {
                throw new Error(`Stats environment wrong: ${stats.environment}`);
            }
            
            if (stats.memories < 2) {
                throw new Error(`Expected at least 2 memories, got ${stats.memories}`);
            }
            
            if (stats.tasks < 1) {
                throw new Error(`Expected at least 1 task, got ${stats.tasks}`);
            }
        });

        // Test 9: Cleanup Test
        await this.runTest('Cleanup Operations', async () => {
            const testAppNames = [
                'cross-platform-test',
                'test-paths', 
                'init-test',
                'file-ops-test',
                'large-file-test',
                'concurrent-test',
                'permission-test',
                'stats-test'
            ];
            
            let cleanedCount = 0;
            
            for (const appName of testAppNames) {
                const testPath = `/mnt/d/shared/${appName}`;
                if (await fs.pathExists(testPath)) {
                    await fs.remove(testPath);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount === 0) {
                throw new Error('No test directories found to clean up');
            }
            
            console.log(`    Cleaned up ${cleanedCount} test directories`);
        });

        // Final Results
        console.log('\n📊 Test Results Summary:');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`📈 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.tests
                .filter(t => t.status === 'FAIL')
                .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
        }

        return this.testResults.failed === 0;
    }
}

// Run tests
async function main() {
    const tester = new CrossPlatformTester();
    
    try {
        const success = await tester.runAllTests();
        
        if (success) {
            console.log('\n🎉 All cross-platform tests passed!');
            console.log('✅ Unified storage is ready for production use.');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed. Please fix issues before proceeding.');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});