#!/usr/bin/env node

/**
 * Storage Migration CLI Tool
 * 
 * Command-line interface for migrating scattered memories and tasks
 * to unified cross-platform storage.
 */

import StorageMigrator from './lib/storage-migrator.js';

async function main() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run') || args.includes('-n'),
        createBackups: !args.includes('--no-backup'),
        resolveDuplicates: !args.includes('--no-resolve'),
        validateData: !args.includes('--no-validate')
    };

    console.log('🔧 Like-I-Said MCP Storage Migration Tool\n');

    if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    try {
        const migrator = new StorageMigrator(options);
        const report = await migrator.migrate();
        
        console.log('\n✅ Migration completed successfully!');
        
        if (report.errors.length > 0) {
            console.log(`\n⚠️  ${report.errors.length} errors occurred during migration:`);
            report.errors.slice(0, 5).forEach(error => {
                console.log(`  - ${error.type}: ${error.message}`);
            });
            
            if (report.errors.length > 5) {
                console.log(`  ... and ${report.errors.length - 5} more errors`);
            }
        }
        
        console.log('\n📍 Your unified storage is now at:');
        console.log(`   ${report.sources[0]?.targetPath || '/mnt/d/shared/like-i-said-mcp'}`);
        
        if (!options.dryRun) {
            console.log('\n🎯 Next steps:');
            console.log('   1. Update MCP server to use unified storage');
            console.log('   2. Test that all data is accessible');
            console.log('   3. Update dashboard configuration');
        }

    } catch (error) {
        console.error(`\n❌ Migration failed: ${error.message}`);
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
🔧 Like-I-Said MCP Storage Migration Tool

Usage: node migrate-storage.js [options]

Options:
  --dry-run, -n       Run migration without making changes
  --no-backup         Skip creating backups
  --no-resolve        Skip duplicate resolution
  --no-validate       Skip data validation
  --help, -h          Show this help

Examples:
  node migrate-storage.js --dry-run    # Preview migration
  node migrate-storage.js              # Run full migration
`);
}

// Check for help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Run migration
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});