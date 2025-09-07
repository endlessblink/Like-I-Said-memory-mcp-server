#!/usr/bin/env node

/**
 * Test script for UnifiedStorage environment detection and basic functionality
 */

import UnifiedStorage from './lib/unified-storage.js';

async function testUnifiedStorage() {
    console.log('🧪 Testing Unified Storage System...\n');
    
    try {
        // Create UnifiedStorage instance
        const storage = new UnifiedStorage({
            appName: 'like-i-said-mcp-test',
            enableMigration: false, // Don't migrate during testing
            createBackups: false    // Don't create backups during testing
        });

        console.log('📊 Environment Detection Results:');
        console.log(`Environment: ${storage.environment}`);
        console.log(`Unified Path: ${storage.unifiedPath}`);
        console.log(`Legacy Paths Found: ${storage.legacyPaths.length}`);
        
        if (storage.legacyPaths.length > 0) {
            console.log('Legacy paths:');
            storage.legacyPaths.forEach(p => console.log(`  - ${p}`));
        }
        console.log();

        // Test initialization
        console.log('🏗️  Testing Initialization...');
        await storage.initialize();
        console.log();

        // Test path conversion
        console.log('🔄 Testing Path Conversion...');
        const testPaths = [
            '/mnt/d/shared/test/file.json',
            'D:\\shared\\test\\file.json',
            '/home/user/test.txt'
        ];

        for (const testPath of testPaths) {
            console.log(`Original: ${testPath}`);
            console.log(`→ Windows: ${storage.toWindowsPath(testPath)}`);
            console.log(`→ Unix: ${storage.toUnixPath(testPath)}`);
            console.log(`→ Normalized: ${storage.normalize(testPath)}`);
            console.log();
        }

        // Test file operations
        console.log('📁 Testing File Operations...');
        const testData = {
            timestamp: new Date().toISOString(),
            environment: storage.environment,
            message: 'Test data from unified storage'
        };

        await storage.writeFile('test.json', JSON.stringify(testData, null, 2));
        const readData = await storage.readFile('test.json');
        const parsed = JSON.parse(readData);
        
        console.log('Write/Read test:', parsed.message === testData.message ? '✅ SUCCESS' : '❌ FAILED');
        console.log();

        // Test compatibility
        console.log('🔧 Testing Cross-Platform Compatibility...');
        const compatResults = await storage.testCompatibility();
        console.log('Compatibility Results:');
        Object.entries(compatResults).forEach(([key, value]) => {
            const status = value === true ? '✅' : value === false ? '❌' : '📄';
            console.log(`  ${key}: ${status} ${value}`);
        });
        console.log();

        // Get storage stats
        console.log('📈 Storage Statistics...');
        const stats = await storage.getStats();
        console.log(`Environment: ${stats.environment}`);
        console.log(`Unified Path: ${stats.unifiedPath}`);
        console.log(`Memories: ${stats.memories}`);
        console.log(`Tasks: ${stats.tasks}`);
        console.log(`Legacy Locations: ${stats.legacyPaths.length}`);
        console.log();

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
testUnifiedStorage().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});