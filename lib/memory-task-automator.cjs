const fs = require('fs');
const path = require('path');
const { MemoryDescriptionQualityScorer } = require('./memory-description-quality-scorer.cjs');
// Skip MemoryFormat for now - implement simple parser
// const { MemoryFormat } = require('./memory-format');
// const { TitleSummaryGenerator } = require('./title-summary-generator');

/**
 * Memory Task Automator
 * Automated system for improving memory quality and descriptions
 */
class MemoryTaskAutomator {
    constructor(storage, taskStorage, options = {}) {
        this.storage = storage;
        this.taskStorage = taskStorage;
        this.options = {
            enabled: true,
            minConfidence: 0.5,
            autoExecuteThreshold: 0.8,
            logAutomatedActions: true,
            ...options
        };
        this.qualityScorer = new MemoryDescriptionQualityScorer();
        // this.memoryFormat = new MemoryFormat();
        // this.titleGenerator = new TitleSummaryGenerator();
    }

    /**
     * Simple memory content parser
     */
    parseMemoryContent(content) {
        if (!content || typeof content !== 'string') return null;
        
        // Try YAML frontmatter first
        const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
        if (frontmatterMatch) {
            return this.parseFrontmatter(frontmatterMatch[1], frontmatterMatch[2]);
        }
        
        // Try HTML comment metadata
        const htmlMatch = content.match(/<!-- Memory Metadata\s*([\s\S]*?)\s*-->/);
        if (htmlMatch) {
            return this.parseHtmlComment(content, htmlMatch[1]);
        }
        
        // No metadata found - create basic structure
        return {
            content: content.trim(),
            metadata: {
                content_type: 'text',
                size: content.length
            }
        };
    }
    
    /**
     * Parse YAML frontmatter
     */
    parseFrontmatter(frontmatter, bodyContent) {
        const memory = { 
            content: bodyContent.trim(), 
            metadata: {},
            format: 'yaml'
        };
        
        const lines = frontmatter.split(/\r?\n/);
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            
            // Handle arrays
            if (key === 'tags' || key === 'related_memories') {
                if (value.startsWith('[') && value.endsWith(']')) {
                    try {
                        memory[key] = JSON.parse(value);
                    } catch {
                        memory[key] = [];
                    }
                } else {
                    memory[key] = value.split(',').map(t => t.trim()).filter(Boolean);
                }
            } else {
                memory[key] = value;
            }
        });
        
        return memory;
    }
    
    /**
     * Parse HTML comment metadata
     */
    parseHtmlComment(fullContent, metadataContent) {
        const memory = {
            content: fullContent.replace(/<!-- Memory Metadata\s*([\s\S]*?)\s*-->/, '').trim(),
            metadata: {},
            format: 'html-comment'
        };
        
        const lines = metadataContent.trim().split(/\r?\n/);
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            
            if (key === 'tags') {
                memory[key] = value.split(',').map(t => t.trim()).filter(Boolean);
            } else {
                memory[key] = value;
            }
        });
        
        return memory;
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
            memory.complexity ? `complexity: ${memory.complexity}` : null,
            memory.category ? `category: ${memory.category}` : null,
            memory.project ? `project: ${memory.project}` : null,
            memory.tags ? `tags: ${JSON.stringify(memory.tags)}` : null,
            memory.priority ? `priority: ${memory.priority}` : null,
            memory.status ? `status: ${memory.status}` : null,
            '---',
            ''
        ].filter(line => line !== null).join('\n');
        
        return frontmatter + (memory.content || '');
    }

    /**
     * Process a single memory file for quality improvements
     * @param {string} filePath - Path to the memory file
     * @returns {Promise<Object>} Processing result
     */
    async processMemoryFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = this.parseMemoryContent(content);
            const quality = this.qualityScorer.scoreMemoryQuality(parsed);
            
            let improved = false;
            const improvements = [];
            
            // Skip if quality is already good
            if (quality.totalScore >= 70) {
                return {
                    path: filePath,
                    originalScore: quality.totalScore,
                    newScore: quality.totalScore,
                    improved: false,
                    skipped: true,
                    reason: 'Quality already good'
                };
            }
            
            // Make improvements based on identified issues
            const improvedMemory = { ...parsed };
            
            // Fix title issues
            if (quality.issues.some(issue => issue.type === 'title')) {
                const newTitle = await this.generateImprovedTitle(parsed.content, parsed.metadata?.title);
                if (newTitle && newTitle !== parsed.metadata?.title) {
                    improvedMemory.metadata = { ...improvedMemory.metadata, title: newTitle };
                    improvements.push('Fixed title');
                    improved = true;
                }
            }
            
            // Fix description issues
            if (quality.issues.some(issue => issue.type === 'description')) {
                const enhancedContent = await this.enhanceContent(parsed.content);
                if (enhancedContent && enhancedContent !== parsed.content) {
                    improvedMemory.content = enhancedContent;
                    improvements.push('Enhanced description');
                    improved = true;
                }
            }
            
            // Fix metadata issues
            if (quality.issues.some(issue => issue.type === 'metadata')) {
                const improvedMetadata = this.improveMetadata(parsed.metadata);
                if (improvedMetadata) {
                    improvedMemory.metadata = { ...improvedMemory.metadata, ...improvedMetadata };
                    improvements.push('Fixed metadata');
                    improved = true;
                }
            }
            
            // Fix structure issues
            if (quality.issues.some(issue => issue.type === 'structure')) {
                const improvedStructure = this.improveStructure(improvedMemory.content);
                if (improvedStructure !== improvedMemory.content) {
                    improvedMemory.content = improvedStructure;
                    improvements.push('Improved structure');
                    improved = true;
                }
            }
            
            // Save improved memory if changes were made
            if (improved) {
                const newContent = this.formatMemoryContent(improvedMemory);
                
                // Create backup before modifying
                const backupPath = filePath + '.backup';
                fs.copyFileSync(filePath, backupPath);
                
                // Write improved version
                fs.writeFileSync(filePath, newContent);
                
                // Calculate new quality score
                const newQuality = this.qualityScorer.scoreMemoryQuality(improvedMemory);
                
                return {
                    path: filePath,
                    originalScore: quality.totalScore,
                    newScore: newQuality.totalScore,
                    improved: true,
                    improvements,
                    backupPath
                };
            }
            
            return {
                path: filePath,
                originalScore: quality.totalScore,
                newScore: quality.totalScore,
                improved: false,
                skipped: false,
                reason: 'No improvements could be made'
            };
            
        } catch (error) {
            return {
                path: filePath,
                error: error.message,
                improved: false
            };
        }
    }

    /**
     * Generate an improved title from content
     */
    async generateImprovedTitle(content, currentTitle) {
        if (!content || content.trim().length < 10) {
            return currentTitle;
        }
        
        // Skip if current title is already good
        if (currentTitle && currentTitle.length > 10 && !this.isTitlePoor(currentTitle)) {
            return currentTitle;
        }
        
        try {
            // Extract first meaningful sentence or heading
            const lines = content.split('\n').filter(line => line.trim());
            
            // Look for markdown headers
            const headerMatch = lines.find(line => line.match(/^#{1,6}\s+(.+)/));
            if (headerMatch) {
                const title = headerMatch.replace(/^#{1,6}\s+/, '').trim();
                if (title.length > 5 && title.length < 80) {
                    return title;
                }
            }
            
            // Look for first meaningful sentence
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
            if (sentences.length > 0) {
                let title = sentences[0].trim();
                
                // Clean up common prefixes
                title = title.replace(/^(this|that|here|there|the|a|an)\s+/i, '');
                title = title.replace(/^(is|are|was|were|will|would|should|could)\s+/i, '');
                
                // Capitalize first letter
                title = title.charAt(0).toUpperCase() + title.slice(1);
                
                // Truncate if too long
                if (title.length > 80) {
                    title = title.substring(0, 77) + '...';
                }
                
                return title;
            }
            
            // Fallback to content summary
            if (content.length > 20) {
                const summary = content.substring(0, 77).trim();
                return summary.charAt(0).toUpperCase() + summary.slice(1) + '...';
            }
            
            return currentTitle;
            
        } catch (error) {
            console.error('Error generating improved title:', error);
            return currentTitle;
        }
    }

    /**
     * Check if a title is poor quality
     */
    isTitlePoor(title) {
        if (!title || title.trim().length < 5) return true;
        
        const poorPatterns = [
            /^title:/i,
            /^memory/i,
            /^note/i,
            /^temp/i,
            /^test/i,
            /^-----/,
            /\$\(date/,
            /^id-\d+/,
            /^untitled/i
        ];
        
        return poorPatterns.some(pattern => pattern.test(title));
    }

    /**
     * Enhance content quality
     */
    async enhanceContent(content) {
        if (!content || content.trim().length < 10) {
            return content;
        }
        
        let enhanced = content;
        
        // Fix common formatting issues
        enhanced = enhanced.replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines
        enhanced = enhanced.replace(/\s+\n/g, '\n'); // Remove trailing spaces
        enhanced = enhanced.replace(/\n\s+/g, '\n'); // Remove leading spaces after newlines
        
        // Ensure proper sentence structure
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 0) {
            enhanced = sentences.map(sentence => {
                const trimmed = sentence.trim();
                if (trimmed.length > 0) {
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                }
                return trimmed;
            }).join('. ');
            
            // Ensure proper ending
            if (!enhanced.match(/[.!?]$/)) {
                enhanced += '.';
            }
        }
        
        return enhanced;
    }

    /**
     * Improve metadata quality
     */
    improveMetadata(metadata) {
        if (!metadata) return null;
        
        const improvements = {};
        
        // Add missing required fields
        if (!metadata.category) {
            improvements.category = 'personal'; // Default category
        }
        
        if (!metadata.priority) {
            improvements.priority = 'medium'; // Default priority
        }
        
        if (!metadata.status) {
            improvements.status = 'active'; // Default status
        }
        
        if (!metadata.complexity) {
            improvements.complexity = 2; // Default complexity
        }
        
        // Fix invalid values
        if (metadata.category && !['personal', 'work', 'code', 'research', 'conversations', 'preferences'].includes(metadata.category)) {
            improvements.category = 'personal';
        }
        
        if (metadata.priority && !['low', 'medium', 'high'].includes(metadata.priority)) {
            improvements.priority = 'medium';
        }
        
        if (metadata.complexity && (metadata.complexity < 1 || metadata.complexity > 4)) {
            improvements.complexity = 2;
        }
        
        // Fix tags format
        if (metadata.tags && !Array.isArray(metadata.tags)) {
            if (typeof metadata.tags === 'string') {
                improvements.tags = metadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            } else {
                improvements.tags = [];
            }
        }
        
        return Object.keys(improvements).length > 0 ? improvements : null;
    }

    /**
     * Improve content structure
     */
    improveStructure(content) {
        if (!content || content.length < 100) {
            return content;
        }
        
        let improved = content;
        
        // Add headers for longer content without any
        if (content.length > 300 && !content.includes('#')) {
            const lines = content.split('\n');
            const firstLine = lines[0].trim();
            if (firstLine.length > 5 && firstLine.length < 80) {
                improved = `# ${firstLine}\n\n${lines.slice(1).join('\n')}`;
            }
        }
        
        // Format code blocks properly
        improved = improved.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || '';
            const cleanCode = code.trim();
            return `\`\`\`${language}\n${cleanCode}\n\`\`\``;
        });
        
        // Ensure proper list formatting
        improved = improved.replace(/^[\s]*[-*+]\s+/gm, '- ');
        
        return improved;
    }

    /**
     * Process all memory files in a directory
     */
    async processAllMemories(memoriesPath = 'memories') {
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
                    
                    const result = await this.processMemoryFile(fullPath);
                    
                    if (result.error) {
                        results.errors++;
                        results.errorDetails.push(result);
                    } else if (result.improved) {
                        results.improved++;
                        results.improvements.push(result);
                    } else {
                        results.skipped++;
                    }
                    
                    // Log progress
                    if (results.totalProcessed % 10 === 0) {
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

    /**
     * Generate a quality improvement report
     */
    async generateImprovementReport(memoriesPath = 'memories') {
        const beforeReport = await this.qualityScorer.generateBulkQualityReport(memoriesPath);
        const processingResults = await this.processAllMemories(memoriesPath);
        const afterReport = await this.qualityScorer.generateBulkQualityReport(memoriesPath);
        
        return {
            before: beforeReport,
            processing: processingResults,
            after: afterReport,
            summary: {
                totalMemories: beforeReport.totalMemories,
                processedCount: processingResults.totalProcessed,
                improvedCount: processingResults.improved,
                skippedCount: processingResults.skipped,
                errorCount: processingResults.errors,
                scoreImprovement: {
                    averageBefore: this.calculateAverageScore(beforeReport.qualityDistribution),
                    averageAfter: this.calculateAverageScore(afterReport.qualityDistribution),
                    improvement: this.calculateAverageScore(afterReport.qualityDistribution) - 
                                this.calculateAverageScore(beforeReport.qualityDistribution)
                }
            }
        };
    }

    /**
     * Calculate average quality score from distribution
     */
    calculateAverageScore(distribution) {
        const scoreMap = { excellent: 95, good: 80, fair: 65, poor: 50, very_poor: 25 };
        const totalItems = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        
        if (totalItems === 0) return 0;
        
        const totalScore = Object.entries(distribution).reduce((sum, [level, count]) => {
            return sum + (scoreMap[level] * count);
        }, 0);
        
        return Math.round(totalScore / totalItems);
    }
}

module.exports = { MemoryTaskAutomator };