#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { MemoryTaskAnalyzer } = require('../lib/memory-task-analyzer.cjs');

/**
 * Advanced Memory Quality Analysis Script
 * Analyzes memories against strict quality standards
 */
async function main() {
    const analyzer = new MemoryTaskAnalyzer();
    
    console.log('🔍 ADVANCED MEMORY QUALITY ANALYSIS');
    console.log('=' .repeat(60));
    
    try {
        // Show quality standards first
        const standards = analyzer.getQualityStandards();
        console.log('\n📋 QUALITY STANDARDS:');
        console.log('=' .repeat(40));
        
        console.log('\n📝 TITLE STANDARDS:');
        console.log(`• Length: ${standards.title.length}`);
        console.log(`• Required: ${standards.title.required}`);
        console.log(`• Forbidden: ${standards.title.forbidden}`);
        
        console.log('\n✅ GOOD TITLE EXAMPLES:');
        standards.title.examples.good.forEach(example => {
            console.log(`  • "${example}"`);
        });
        
        console.log('\n❌ BAD TITLE EXAMPLES:');
        standards.title.examples.bad.forEach(example => {
            console.log(`  • "${example}"`);
        });
        
        console.log('\n📄 DESCRIPTION STANDARDS:');
        console.log(`• Length: ${standards.description.length}`);
        console.log(`• Required: ${standards.description.required}`);
        console.log(`• Structure: ${standards.description.structure}`);
        console.log(`• Forbidden: ${standards.description.forbidden}`);
        
        // Generate compliance report
        console.log('\n🔍 ANALYZING ALL MEMORIES...');
        const report = await analyzer.generateComplianceReport();
        
        // Display results
        console.log('\n📊 COMPLIANCE REPORT');
        console.log('=' .repeat(40));
        
        console.log(`\n📈 OVERALL COMPLIANCE:`);
        console.log(`• Total analyzed: ${report.totalAnalyzed}`);
        console.log(`• Meets standards: ${report.compliance.meets} (${report.compliance.percentage}%)`);
        console.log(`• Fails standards: ${report.compliance.fails} (${100 - report.compliance.percentage}%)`);
        
        console.log(`\n📊 SCORE DISTRIBUTION:`);
        console.log(`• Excellent (90+): ${report.scores.excellent}`);
        console.log(`• Good (70-89): ${report.scores.good}`);
        console.log(`• Poor (50-69): ${report.scores.poor}`);
        console.log(`• Critical (<50): ${report.scores.critical}`);
        
        // Show worst examples
        if (report.examples.bad.length > 0) {
            console.log('\n❌ WORST QUALITY EXAMPLES:');
            report.examples.bad.slice(0, 5).forEach((example, i) => {
                console.log(`\n${i + 1}. ${example.file} (Score: ${Math.round(example.score)})`);
                console.log(`   BAD:  "${example.title}"`);
                if (example.suggested) {
                    console.log(`   GOOD: "${example.suggested}"`);
                }
                console.log(`   Issues: ${example.issues.slice(0, 2).join(', ')}`);
            });
        }
        
        // Show good examples
        if (report.examples.good.length > 0) {
            console.log('\n✅ GOOD QUALITY EXAMPLES:');
            report.examples.good.forEach((example, i) => {
                console.log(`${i + 1}. "${example.title}" (Score: ${Math.round(example.score)})`);
            });
        }
        
        // Critical issues summary
        if (report.criticalIssues.length > 0) {
            console.log(`\n🚨 CRITICAL ISSUES (${report.criticalIssues.length} files):`);
            const issueCounts = {};
            report.criticalIssues.forEach(item => {
                item.issues.forEach(issue => {
                    issue.issues.forEach(problemText => {
                        issueCounts[problemText] = (issueCounts[problemText] || 0) + 1;
                    });
                });
            });
            
            Object.entries(issueCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .forEach(([issue, count]) => {
                    console.log(`• ${issue}: ${count} files`);
                });
        }
        
        // Recommendations
        if (report.recommendations.length > 0) {
            console.log(`\n💡 TOP RECOMMENDATIONS:`);
            console.log('1. Focus on title improvements - most critical issue');
            console.log('2. Remove generic words like "improvements", "session"');
            console.log('3. Add specific action words: implement, fix, create, configure');
            console.log('4. Include specific component/feature names in titles');
            console.log('5. Remove timestamps and dates from titles');
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', 'memory-compliance-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed compliance report saved to: ${reportPath}`);
        
        // Final summary
        const complianceLevel = report.compliance.percentage >= 80 ? '🟢 GOOD' :
                               report.compliance.percentage >= 60 ? '🟡 NEEDS WORK' : '🔴 CRITICAL';
        
        console.log(`\n🎯 COMPLIANCE LEVEL: ${complianceLevel} (${report.compliance.percentage}%)`);
        
        if (report.compliance.percentage < 80) {
            console.log('\n⚠️  NEXT STEPS:');
            console.log('1. Run automated fixes on worst performing files');
            console.log('2. Implement quality gates for new memories');
            console.log('3. Create title/description templates');
            console.log('4. Set up continuous quality monitoring');
        }
        
    } catch (error) {
        console.error('❌ Error during quality analysis:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };