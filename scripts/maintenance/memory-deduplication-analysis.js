#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');

/**
 * Memory Deduplication Analysis Script - Phase 2 of Migration Plan
 * Analyzes memories to find exact and semantic duplicates
 */

async function analyzeDuplicates() {
    const memoriesPath = path.join(__dirname, '..', 'memories');
    const analysisPath = path.join(__dirname, '..', 'deduplication-analysis.json');
    
    console.log('🔍 Starting deduplication analysis...');
    
    try {
        // Collect all memory files
        const memories = await collectAllMemories(memoriesPath);
        console.log(`📁 Found ${memories.length} memory files`);
        
        // Analyze for duplicates
        const analysis = {
            timestamp: new Date().toISOString(),
            totalMemories: memories.length,
            exactDuplicates: await findExactDuplicates(memories),
            undefinedIds: await findUndefinedIds(memories),
            projectDistribution: await analyzeProjectDistribution(memories),
            contentPatterns: await analyzeContentPatterns(memories),
            recommendations: []
        };
        
        // Generate recommendations
        analysis.recommendations = generateRecommendations(analysis);
        
        // Save analysis
        await fs.writeJson(analysisPath, analysis, { spaces: 2 });
        
        // Print summary
        printAnalysisSummary(analysis);
        
        console.log(`\n📄 Full analysis saved to: ${analysisPath}`);
        
        return analysis;
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        throw error;
    }
}

async function collectAllMemories(memoriesPath) {
    const memories = [];
    
    async function walkDir(currentPath, project = '') {
        const items = await fs.readdir(currentPath);
        
        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
                // Directory name becomes the project name
                await walkDir(itemPath, item);
            } else if (item.endsWith('.md')) {
                memories.push({
                    path: itemPath,
                    filename: item,
                    project: project || 'root',
                    stats: stats
                });
            }
        }
    }
    
    await walkDir(memoriesPath);
    return memories;
}

async function findExactDuplicates(memories) {
    const contentHashes = new Map();
    const duplicates = [];
    
    for (const memory of memories) {
        try {
            const content = await fs.readFile(memory.path, 'utf-8');
            const { content: bodyContent, data: frontmatter } = matter(content);
            
            // Create hash of just the content (not metadata)
            const contentHash = crypto.createHash('md5').update(bodyContent).digest('hex');
            
            if (contentHashes.has(contentHash)) {
                const existing = contentHashes.get(contentHash);
                const dupGroup = duplicates.find(group => 
                    group.memories.some(m => m.path === existing.path)
                );
                
                if (dupGroup) {
                    dupGroup.memories.push(memory);
                } else {
                    duplicates.push({
                        contentHash,
                        memories: [existing, memory],
                        contentPreview: bodyContent.substring(0, 100) + '...'
                    });
                }
            } else {
                contentHashes.set(contentHash, memory);
            }
        } catch (error) {
            console.error(`Error reading ${memory.path}:`, error.message);
        }
    }
    
    return duplicates;
}

async function findUndefinedIds(memories) {
    const undefinedIds = [];
    
    for (const memory of memories) {
        try {
            const content = await fs.readFile(memory.path, 'utf-8');
            const { data: frontmatter } = matter(content);
            
            if (!frontmatter.id || frontmatter.id === 'undefined') {
                undefinedIds.push({
                    path: memory.path,
                    project: memory.project,
                    title: frontmatter.title || 'No title',
                    timestamp: frontmatter.timestamp
                });
            }
        } catch (error) {
            console.error(`Error reading ${memory.path}:`, error.message);
        }
    }
    
    return undefinedIds;
}

async function analyzeProjectDistribution(memories) {
    const distribution = {};
    
    for (const memory of memories) {
        if (!distribution[memory.project]) {
            distribution[memory.project] = {
                count: 0,
                totalSize: 0,
                files: []
            };
        }
        
        distribution[memory.project].count++;
        distribution[memory.project].totalSize += memory.stats.size;
        distribution[memory.project].files.push(memory.filename);
    }
    
    // Sort by count
    const sorted = Object.entries(distribution)
        .sort(([, a], [, b]) => b.count - a.count)
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
    
    return sorted;
}

async function analyzeContentPatterns(memories) {
    const patterns = {
        topicFrequency: new Map(),
        duplicateTopics: []
    };
    
    // Sample analysis - check first 100 memories for common patterns
    const sampleSize = Math.min(100, memories.length);
    const sampledMemories = memories.slice(0, sampleSize);
    
    for (const memory of sampledMemories) {
        try {
            const content = await fs.readFile(memory.path, 'utf-8');
            const { data: frontmatter } = matter(content);
            
            // Analyze title patterns
            if (frontmatter.title) {
                const normalizedTitle = frontmatter.title.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .trim();
                
                patterns.topicFrequency.set(
                    normalizedTitle, 
                    (patterns.topicFrequency.get(normalizedTitle) || 0) + 1
                );
            }
        } catch (error) {
            // Skip errors
        }
    }
    
    // Find duplicate topics
    for (const [topic, count] of patterns.topicFrequency) {
        if (count > 1) {
            patterns.duplicateTopics.push({ topic, count });
        }
    }
    
    // Sort by frequency
    patterns.duplicateTopics.sort((a, b) => b.count - a.count);
    
    return {
        sampledCount: sampleSize,
        topDuplicateTopics: patterns.duplicateTopics.slice(0, 10)
    };
}

function generateRecommendations(analysis) {
    const recommendations = [];
    
    // Recommendation 1: Handle exact duplicates
    if (analysis.exactDuplicates.length > 0) {
        const totalDuplicates = analysis.exactDuplicates.reduce(
            (sum, group) => sum + group.memories.length - 1, 0
        );
        recommendations.push({
            priority: 'HIGH',
            action: 'Remove exact duplicates',
            details: `Found ${analysis.exactDuplicates.length} groups of exact duplicates affecting ${totalDuplicates} files`,
            impact: `Will reduce memory count by ${totalDuplicates} files`
        });
    }
    
    // Recommendation 2: Fix undefined IDs
    if (analysis.undefinedIds.length > 0) {
        recommendations.push({
            priority: 'HIGH',
            action: 'Fix undefined IDs',
            details: `${analysis.undefinedIds.length} memories have undefined or missing IDs`,
            impact: 'Ensures all memories have proper unique identifiers'
        });
    }
    
    // Recommendation 3: Consolidate projects
    const projectCount = Object.keys(analysis.projectDistribution).length;
    if (projectCount > 5) {
        recommendations.push({
            priority: 'MEDIUM',
            action: 'Consolidate project folders',
            details: `Currently have ${projectCount} project folders, recommend consolidating to 3-4`,
            impact: 'Simplifies organization and reduces fragmentation'
        });
    }
    
    // Recommendation 4: Content deduplication
    if (analysis.contentPatterns.topDuplicateTopics.length > 0) {
        const topDup = analysis.contentPatterns.topDuplicateTopics[0];
        recommendations.push({
            priority: 'MEDIUM',
            action: 'Review semantic duplicates',
            details: `Topic "${topDup.topic}" appears ${topDup.count} times, likely containing similar content`,
            impact: 'Could further reduce memory count through intelligent merging'
        });
    }
    
    return recommendations;
}

function printAnalysisSummary(analysis) {
    console.log('\n📊 Deduplication Analysis Summary');
    console.log('================================');
    console.log(`Total memories analyzed: ${analysis.totalMemories}`);
    console.log(`Exact duplicate groups: ${analysis.exactDuplicates.length}`);
    console.log(`Memories with undefined IDs: ${analysis.undefinedIds.length}`);
    console.log(`Project folders: ${Object.keys(analysis.projectDistribution).length}`);
    
    console.log('\n📁 Project Distribution:');
    Object.entries(analysis.projectDistribution).slice(0, 5).forEach(([project, data]) => {
        console.log(`   ${project}: ${data.count} memories`);
    });
    
    console.log('\n💡 Top Recommendations:');
    analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   ${rec.details}`);
    });
}

// Run the analysis
if (require.main === module) {
    analyzeDuplicates()
        .then(() => {
            console.log('\n✅ Analysis completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Analysis failed:', error);
            process.exit(1);
        });
}

module.exports = { analyzeDuplicates };