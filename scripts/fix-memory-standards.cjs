#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { MemoryTaskAnalyzer } = require('../lib/memory-task-analyzer.cjs');
const { MemoryDescriptionQualityScorer } = require('../lib/memory-description-quality-scorer.cjs');

/**
 * Memory Standards Fixer
 * Automatically fixes memories that don't meet quality standards
 */
class MemoryStandardsFixer {
    constructor() {
        this.analyzer = new MemoryTaskAnalyzer();
        this.scorer = new MemoryDescriptionQualityScorer();
    }

    /**
     * Fix a single memory file to meet standards
     */
    async fixMemoryFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const memory = this.scorer.parseMemoryContent(content);
            
            if (!memory) {
                return { success: false, error: 'Could not parse memory' };
            }

            const analysis = this.analyzer.analyzeMemoryQuality(memory, filePath);
            
            // Skip if already meets standards
            if (analysis.compliance.meetsStandards) {
                return { success: true, skipped: true, reason: 'Already meets standards' };
            }

            let improved = false;
            const changes = [];

            // Fix title if needed
            if (analysis.suggested.title && analysis.titleAnalysis.score < 70) {
                memory.metadata = memory.metadata || {};
                memory.metadata.title = analysis.suggested.title;
                improved = true;
                changes.push('Fixed title');
            }

            // Fix description if needed and suggestion exists
            if (analysis.suggested.description && analysis.descriptionAnalysis.score < 50) {
                memory.content = analysis.suggested.description;
                improved = true;
                changes.push('Enhanced description');
            }

            // Apply additional fixes based on specific violations
            const titleViolations = analysis.titleAnalysis.violations;
            
            // Fix specific title issues
            if (titleViolations.some(v => v.includes('forbidden pattern'))) {
                const fixedTitle = this.fixForbiddenPatterns(analysis.before.title);
                if (fixedTitle !== analysis.before.title) {
                    memory.metadata = memory.metadata || {};
                    memory.metadata.title = fixedTitle;
                    improved = true;
                    changes.push('Removed forbidden patterns');
                }
            }

            if (improved) {
                // Create backup
                const backupPath = filePath + '.backup.' + Date.now();
                fs.copyFileSync(filePath, backupPath);

                // Write improved version
                const newContent = this.formatMemoryContent(memory);
                fs.writeFileSync(filePath, newContent);

                // Verify improvement
                const newMemory = this.scorer.parseMemoryContent(newContent);
                const newAnalysis = this.analyzer.analyzeMemoryQuality(newMemory, filePath);

                return {
                    success: true,
                    improved: true,
                    changes,
                    scoreBefore: analysis.overallScore,
                    scoreAfter: newAnalysis.overallScore,
                    improvement: newAnalysis.overallScore - analysis.overallScore,
                    backupPath,
                    nowMeetsStandards: newAnalysis.compliance.meetsStandards
                };
            }

            return { success: true, improved: false, reason: 'No viable improvements found' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Fix forbidden patterns in titles
     */
    fixForbiddenPatterns(title) {
        if (!title) return title;

        let fixed = title;

        // Remove common problematic patterns
        fixed = fixed.replace(/^dashboard improvements?\s*/i, 'Enhance dashboard ');
        fixed = fixed.replace(/session\s*\([^)]*\)/gi, '');
        fixed = fixed.replace(/\s*\([^)]*\d{4}[^)]*\)/g, ''); // Remove date patterns
        fixed = fixed.replace(/^(major|complete|comprehensive)\s+/i, '');
        fixed = fixed.replace(/^(session|meeting|status|update|progress)\s+/i, '');
        fixed = fixed.replace(/\s*session\s*$/i, '');
        fixed = fixed.replace(/\s*-+\s*/g, ' ');
        fixed = fixed.replace(/^-----.*/, '');

        // Improve weak words
        fixed = fixed.replace(/\bimprovements?\b/gi, 'enhancements');
        fixed = fixed.replace(/\bupdates?\b/gi, 'modifications');
        fixed = fixed.replace(/\bchanges?\b/gi, 'modifications');

        // Add action word if missing
        if (!/^(implement|fix|add|create|configure|optimize|refactor|integrate|migrate|deploy|automate|establish|resolve|develop|design|build|enhance)/i.test(fixed)) {
            // Try to infer action from content
            if (/\bfix/i.test(fixed)) fixed = 'Fix ' + fixed;
            else if (/\badd/i.test(fixed)) fixed = 'Add ' + fixed;
            else if (/\bcreate/i.test(fixed)) fixed = 'Create ' + fixed;
            else if (/\bimplement/i.test(fixed)) fixed = 'Implement ' + fixed;
            else fixed = 'Implement ' + fixed;
        }

        // Clean up spacing and capitalization
        fixed = fixed.replace(/\s+/g, ' ').trim();
        fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);

        return fixed;
    }

    /**
     * Format memory content back to markdown
     */
    formatMemoryContent(memory) {
        if (!memory) return '';
        
        const frontmatter = [
            '---',
            memory.id ? `id: ${memory.id}` : null,
            memory.timestamp ? `timestamp: ${memory.timestamp}` : null,
            memory.complexity ? `complexity: ${memory.complexity}` : 'complexity: 2',
            memory.category ? `category: ${memory.category}` : 'category: work',
            memory.project ? `project: ${memory.project}` : null,
            memory.tags ? `tags: ${JSON.stringify(memory.tags)}` : 'tags: []',
            memory.priority ? `priority: ${memory.priority}` : 'priority: medium',
            memory.status ? `status: ${memory.status}` : 'status: active',
            memory.access_count !== undefined ? `access_count: ${memory.access_count}` : 'access_count: 0',
            memory.last_accessed ? `last_accessed: ${memory.last_accessed}` : null,
            memory.metadata ? 'metadata:' : null,
            memory.metadata ? `  content_type: ${memory.metadata.content_type || 'text'}` : null,
            memory.metadata ? `  size: ${memory.metadata.size || 0}` : null,
            memory.metadata ? `  mermaid_diagram: ${memory.metadata.mermaid_diagram || false}` : null,
            '---',
            ''
        ].filter(line => line !== null).join('\n');
        
        return frontmatter + (memory.content || '');
    }

    /**
     * Fix all memories that don't meet standards
     */
    async fixAllMemories(memoriesPath = 'memories') {
        const results = {
            totalProcessed: 0,
            improved: 0,
            skipped: 0,
            errors: 0,
            improvements: [],
            errorDetails: []
        };

        const processDirectory = async (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await processDirectory(fullPath);
                } else if (entry.name.endsWith('.md')) {
                    results.totalProcessed++;

                    const result = await this.fixMemoryFile(fullPath);

                    if (!result.success) {
                        results.errors++;
                        results.errorDetails.push({
                            path: fullPath,
                            error: result.error
                        });
                    } else if (result.improved) {
                        results.improved++;
                        results.improvements.push({
                            path: fullPath,
                            changes: result.changes,
                            scoreBefore: result.scoreBefore,
                            scoreAfter: result.scoreAfter,
                            improvement: result.improvement,
                            nowMeetsStandards: result.nowMeetsStandards
                        });
                    } else {
                        results.skipped++;
                    }

                    // Log progress
                    if (results.totalProcessed % 25 === 0) {
                        console.log(`Processed ${results.totalProcessed} files...`);
                    }
                }
            }
        };

        if (fs.existsSync(memoriesPath)) {
            await processDirectory(memoriesPath);
        }

        return results;
    }
}

/**
 * Main execution function
 */
async function main() {
    const fixer = new MemoryStandardsFixer();
    
    console.log('🔧 MEMORY STANDARDS FIXER');
    console.log('=' .repeat(50));
    
    try {
        console.log('\n🔍 Analyzing current compliance...');
        const analyzer = new MemoryTaskAnalyzer();
        const beforeReport = await analyzer.generateComplianceReport();
        
        console.log(`📊 BEFORE: ${beforeReport.compliance.percentage}% compliance`);
        console.log(`🚨 Critical issues: ${beforeReport.scores.critical} files`);
        
        console.log('\n🔧 Fixing non-compliant memories...');
        const results = await fixer.fixAllMemories();
        
        console.log('\n📊 FIXING RESULTS:');
        console.log(`• Total processed: ${results.totalProcessed}`);
        console.log(`• Files improved: ${results.improved}`);
        console.log(`• Files skipped: ${results.skipped}`);
        console.log(`• Errors: ${results.errors}`);
        
        if (results.improvements.length > 0) {
            console.log('\n✅ TOP IMPROVEMENTS:');
            const topImprovements = results.improvements
                .sort((a, b) => b.improvement - a.improvement)
                .slice(0, 5);
                
            topImprovements.forEach((item, i) => {
                const fileName = path.basename(item.path);
                console.log(`${i + 1}. ${fileName}`);
                console.log(`   Score: ${Math.round(item.scoreBefore)} → ${Math.round(item.scoreAfter)} (+${Math.round(item.improvement)})`);
                console.log(`   Changes: ${item.changes.join(', ')}`);
                console.log(`   Meets standards: ${item.nowMeetsStandards ? '✅' : '❌'}`);
                console.log('');
            });
        }
        
        console.log('\n🔍 Re-analyzing compliance...');
        const afterReport = await analyzer.generateComplianceReport();
        
        console.log('\n📈 COMPLIANCE IMPROVEMENT:');
        console.log(`• Before: ${beforeReport.compliance.percentage}%`);
        console.log(`• After: ${afterReport.compliance.percentage}%`);
        console.log(`• Improvement: +${afterReport.compliance.percentage - beforeReport.compliance.percentage}%`);
        
        console.log('\n📊 SCORE DISTRIBUTION CHANGES:');
        Object.keys(beforeReport.scores).forEach(level => {
            const before = beforeReport.scores[level];
            const after = afterReport.scores[level];
            const change = after - before;
            const changeStr = change > 0 ? `+${change}` : change.toString();
            console.log(`• ${level}: ${before} → ${after} (${changeStr})`);
        });
        
        // Save results
        const resultsPath = path.join(__dirname, '..', 'memory-standards-fix-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify({
            before: beforeReport,
            fixing: results,
            after: afterReport
        }, null, 2));
        
        console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
        
        const finalCompliance = afterReport.compliance.percentage >= 85 ? '🟢 EXCELLENT' :
                               afterReport.compliance.percentage >= 75 ? '🟡 GOOD' : '🔴 NEEDS MORE WORK';
        
        console.log(`\n🎯 FINAL COMPLIANCE: ${finalCompliance} (${afterReport.compliance.percentage}%)`);
        
    } catch (error) {
        console.error('❌ Error during standards fixing:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { MemoryStandardsFixer, main };