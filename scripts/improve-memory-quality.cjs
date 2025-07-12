#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { MemoryTaskAutomator } = require('../lib/memory-task-automator.cjs');

/**
 * Memory Quality Improvement Script
 * Automatically improves memory descriptions and quality
 */
async function main() {
    const automator = new MemoryTaskAutomator();
    
    console.log('🔍 Starting memory quality improvement process...');
    console.log('=' .repeat(60));
    
    try {
        // Generate improvement report
        const report = await automator.generateImprovementReport();
        
        // Display results
        console.log('\n📊 MEMORY QUALITY IMPROVEMENT REPORT');
        console.log('=' .repeat(60));
        
        console.log('\n📈 BEFORE IMPROVEMENTS:');
        console.log(`Total memories: ${report.before.totalMemories}`);
        console.log(`Average quality score: ${report.summary.scoreImprovement.averageBefore}/100`);
        console.log('Quality distribution:');
        Object.entries(report.before.qualityDistribution).forEach(([level, count]) => {
            console.log(`  ${level}: ${count} (${Math.round(count/report.before.totalMemories*100)}%)`);
        });
        
        console.log('\n⚙️ PROCESSING RESULTS:');
        console.log(`Files processed: ${report.processing.totalProcessed}`);
        console.log(`Files improved: ${report.processing.improved}`);
        console.log(`Files skipped: ${report.processing.skipped}`);
        console.log(`Errors: ${report.processing.errors}`);
        
        console.log('\n📈 AFTER IMPROVEMENTS:');
        console.log(`Average quality score: ${report.summary.scoreImprovement.averageAfter}/100`);
        console.log(`Score improvement: +${report.summary.scoreImprovement.improvement} points`);
        console.log('Quality distribution:');
        Object.entries(report.after.qualityDistribution).forEach(([level, count]) => {
            console.log(`  ${level}: ${count} (${Math.round(count/report.after.totalMemories*100)}%)`);
        });
        
        // Show detailed improvements
        if (report.processing.improvements.length > 0) {
            console.log('\n✅ DETAILED IMPROVEMENTS:');
            report.processing.improvements.slice(0, 10).forEach(improvement => {
                console.log(`\n📝 ${path.basename(improvement.path)}`);
                console.log(`   Score: ${improvement.originalScore} → ${improvement.newScore} (+${improvement.newScore - improvement.originalScore})`);
                console.log(`   Changes: ${improvement.improvements.join(', ')}`);
            });
            
            if (report.processing.improvements.length > 10) {
                console.log(`\n... and ${report.processing.improvements.length - 10} more files improved`);
            }
        }
        
        // Show errors if any
        if (report.processing.errorDetails.length > 0) {
            console.log('\n❌ ERRORS:');
            report.processing.errorDetails.forEach(error => {
                console.log(`  ${path.basename(error.path)}: ${error.error}`);
            });
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', 'memory-quality-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        console.log('\n🎉 Memory quality improvement complete!');
        
    } catch (error) {
        console.error('❌ Error during memory quality improvement:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}