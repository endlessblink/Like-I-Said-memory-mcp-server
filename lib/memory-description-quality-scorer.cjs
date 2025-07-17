const fs = require('fs');
const path = require('path');
// const { MemoryFormat } = require('./memory-format');

/**
 * Memory Description Quality Scorer
 * Evaluates the quality of memory descriptions and provides improvement suggestions
 */
class MemoryDescriptionQualityScorer {
    constructor() {
        // this.memoryFormat = new MemoryFormat();
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
     * Score a title's quality with detailed breakdown
     * @param {string} title - The title to score
     * @param {string} content - The related content for context
     * @returns {Object} Score breakdown with issues and quality level
     */
    scoreTitle(title, content) {
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return {
                score: 0,
                qualityLevel: 'very_poor',
                breakdown: {
                    specificity: 0,
                    informativeness: 0,
                    clarity: 0,
                    conciseness: 0
                },
                issues: ['Missing or invalid title']
            };
        }

        const titleTrimmed = title.trim();
        const issues = [];
        const breakdown = {
            specificity: 1.0,
            informativeness: 1.0,
            clarity: 1.0,
            conciseness: 1.0
        };

        // Specificity scoring
        const genericPatterns = [
            /^title:/i, /^memory/i, /^note/i, /^temp/i, /^test/i,
            /^-----/, /\$\(date/, /^id-\d+/, /^untitled/i
        ];
        
        for (const pattern of genericPatterns) {
            if (pattern.test(titleTrimmed)) {
                breakdown.specificity = 0.1;
                breakdown.informativeness = 0.2;
                issues.push('Title is too generic');
                break;
            }
        }

        // Check for very generic titles like "Memory 123"
        if (/^(memory|note|title)\s*\d+$/i.test(titleTrimmed)) {
            breakdown.specificity = 0.02;
            breakdown.informativeness = 0.05;
            breakdown.clarity = 0.1;
            breakdown.conciseness = 0.1;
            issues.push('Title is too generic');
        }

        // Informativeness scoring
        const words = titleTrimmed.toLowerCase().split(/\s+/);
        if (words.length < 3) {
            breakdown.informativeness *= 0.7;
            issues.push('Title lacks detail');
        }
        
        // Technical terms boost informativeness
        const technicalTerms = ['implement', 'fix', 'add', 'update', 'create', 'configure', 'api', 'database', 'function'];
        const hasTechnicalTerms = words.some(word => technicalTerms.includes(word));
        if (hasTechnicalTerms) {
            breakdown.informativeness = Math.min(1.0, breakdown.informativeness * 1.2);
        }

        // Clarity scoring  
        if (titleTrimmed.includes('...') || titleTrimmed.endsWith('..')) {
            breakdown.clarity = 0.4;
            issues.push('Title appears truncated');
        }

        // Check for truncation patterns like plan-task-relationship-data-mo-626534
        if (titleTrimmed.includes('-') && titleTrimmed.length > 30 && /\d{6}$/.test(titleTrimmed)) {
            breakdown.clarity = 0.1;
            breakdown.specificity = 0.05;
            breakdown.informativeness = 0.1;
            breakdown.conciseness = 0.2;
            issues.push('Title appears truncated');
        }

        const repetitiveWords = words.length > 3 && (new Set(words).size / words.length < 0.6);
        if (repetitiveWords) {
            breakdown.clarity *= 0.6;
            issues.push('Title has repetitive words');
        }

        // Conciseness scoring
        if (titleTrimmed.length > 80) {
            breakdown.conciseness = 0.4;
            issues.push('Title is too long');
        } else if (titleTrimmed.length < 10) {
            breakdown.conciseness = 0.6;
            issues.push('Title is too brief');
        }

        const score = (breakdown.specificity + breakdown.informativeness + breakdown.clarity + breakdown.conciseness) / 4;
        
        return {
            score: score,
            qualityLevel: this.getQualityLevel(score * 100),
            breakdown,
            issues
        };
    }

    /**
     * Score a summary's quality with detailed breakdown
     * @param {string} summary - The summary to score
     * @param {string} content - The related content for context
     * @returns {Object} Score breakdown with issues and quality level
     */
    scoreSummary(summary, content) {
        if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
            return {
                score: 0,
                qualityLevel: 'very_poor',
                breakdown: {
                    specificity: 0,
                    completeness: 0,
                    conciseness: 0,
                    informativeness: 0
                },
                issues: ['Missing or invalid summary']
            };
        }

        const summaryTrimmed = summary.trim();
        const issues = [];
        const breakdown = {
            specificity: 1.0,
            completeness: 1.0,
            conciseness: 1.0,
            informativeness: 1.0
        };

        // Specificity scoring
        const genericPhrases = ['various aspects', 'different things', 'information about', 'details of', 'stuff'];
        const hasGenericPhrases = genericPhrases.some(phrase => summaryTrimmed.toLowerCase().includes(phrase));
        if (hasGenericPhrases) {
            breakdown.specificity = 0.3;
            issues.push('Summary uses too many generic phrases');
        }

        // Completeness scoring
        const words = summaryTrimmed.split(/\s+/);
        const contentWords = content ? content.split(/\s+/).length : 0;
        
        if (words.length < 10 && contentWords > 50) {
            breakdown.completeness = 0.4;
            issues.push('Summary needs more detail');
        } else if (words.length < 5) {
            breakdown.completeness = 0.2;
            issues.push('Summary is too brief');
        }

        // Conciseness scoring
        if (summaryTrimmed.length > 300) {
            breakdown.conciseness = 0.3;
            issues.push('Summary is too verbose');
        } else if (summaryTrimmed.length > 200) {
            breakdown.conciseness = 0.5;
            issues.push('Summary is too verbose');
        }

        // Check for run-on sentences
        const sentences = summaryTrimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 1 && words.length > 25) {
            breakdown.conciseness = 0.3;
            issues.push('Summary is too verbose');
        } else if (sentences.length === 1 && words.length > 20) {
            breakdown.conciseness = 0.4;
            issues.push('Summary is too verbose');
        }

        // Informativeness scoring
        const technicalTerms = ['implement', 'configure', 'optimize', 'integrate', 'authentication', 'api', 'database'];
        const hasTechnicalTerms = words.some(word => technicalTerms.some(term => word.toLowerCase().includes(term)));
        if (hasTechnicalTerms) {
            breakdown.informativeness = Math.min(1.0, breakdown.informativeness * 1.1);
        }

        const score = (breakdown.specificity + breakdown.completeness + breakdown.conciseness + breakdown.informativeness) / 4;
        
        return {
            score: score,
            qualityLevel: this.getQualityLevel(score * 100),
            breakdown,
            issues
        };
    }

    /**
     * Generate a comprehensive quality report for a memory
     * @param {Object} memory - Memory object with title, summary, content
     * @returns {Object} Complete quality assessment with recommendations
     */
    generateQualityReport(memory) {
        const titleResult = this.scoreTitle(memory.title || '', memory.content || '');
        const summaryResult = this.scoreSummary(memory.summary || '', memory.content || '');
        
        const overallScore = (titleResult.score + summaryResult.score) / 2;
        const overallQuality = this.getQualityLevel(overallScore * 100);
        
        const recommendations = [];
        
        // High priority recommendations
        if (titleResult.score < 0.5) {
            recommendations.push({
                type: 'title',
                priority: 'high',
                message: 'Title needs significant improvement',
                suggestions: titleResult.issues
            });
        }
        
        if (summaryResult.score < 0.5) {
            recommendations.push({
                type: 'summary', 
                priority: 'high',
                message: 'Summary needs significant improvement',
                suggestions: summaryResult.issues
            });
        }
        
        // Medium priority recommendations
        if (titleResult.score < 0.7 && titleResult.score >= 0.5) {
            recommendations.push({
                type: 'title',
                priority: 'medium',
                message: 'Title could be improved',
                suggestions: titleResult.issues
            });
        }
        
        if (summaryResult.score < 0.7 && summaryResult.score >= 0.5) {
            recommendations.push({
                type: 'summary',
                priority: 'medium', 
                message: 'Summary could be improved',
                suggestions: summaryResult.issues
            });
        }

        return {
            overallScore: overallScore,
            overallQuality: overallQuality,
            title: titleResult,
            summary: summaryResult,
            recommendations: recommendations
        };
    }

    /**
     * Score a memory's overall quality (0-100)
     * @param {Object} memory - Parsed memory object
     * @returns {Object} Quality score and breakdown
     */
    scoreMemoryQuality(memory) {
        const scores = {
            title: this.scoreTitleQuality(memory.metadata?.title || ''),
            description: this.scoreDescriptionQuality(memory.content || ''),
            metadata: this.scoreMetadataQuality(memory.metadata || {}),
            structure: this.scoreStructureQuality(memory),
            content: this.scoreContentQuality(memory.content || '')
        };

        // Weighted scoring (title and description are most important)
        const weights = {
            title: 0.25,
            description: 0.30,
            metadata: 0.20,
            structure: 0.15,
            content: 0.10
        };

        const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
            return sum + (score * weights[key]);
        }, 0);

        const issues = this.identifyIssues(memory, scores);
        const improvements = this.generateImprovements(memory, scores, issues);

        return {
            totalScore: Math.round(totalScore),
            scores,
            issues,
            improvements,
            qualityLevel: this.getQualityLevel(totalScore)
        };
    }

    /**
     * Score title quality (0-100)
     */
    scoreTitleQuality(title) {
        if (!title || title.trim().length === 0) return 0;
        
        let score = 100;
        const titleTrimmed = title.trim();

        // Length penalties
        if (titleTrimmed.length < 10) score -= 30;
        if (titleTrimmed.length > 100) score -= 15;

        // Generic title penalties
        const genericPatterns = [
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

        for (const pattern of genericPatterns) {
            if (pattern.test(titleTrimmed)) {
                score -= 40;
                break;
            }
        }

        // Repetitive words penalty
        const words = titleTrimmed.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        if (words.length > 3 && uniqueWords.size / words.length < 0.6) {
            score -= 25;
        }

        // Truncation indicators
        if (titleTrimmed.endsWith('...') || titleTrimmed.endsWith('..')) {
            score -= 30;
        }

        // Case issues
        if (titleTrimmed === titleTrimmed.toUpperCase() && titleTrimmed.length > 5) {
            score -= 15;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score description/content quality (0-100)
     */
    scoreDescriptionQuality(content) {
        if (!content || content.trim().length === 0) return 0;
        
        let score = 100;
        const contentTrimmed = content.trim();

        // Length scoring
        if (contentTrimmed.length < 20) score -= 40;
        else if (contentTrimmed.length < 50) score -= 20;
        else if (contentTrimmed.length < 100) score -= 10;

        // Word count
        const wordCount = contentTrimmed.split(/\s+/).length;
        if (wordCount < 5) score -= 30;
        else if (wordCount < 10) score -= 15;

        // Sentence structure
        const sentences = contentTrimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 1 && wordCount > 20) score -= 15; // Run-on sentence
        if (sentences.length === 0) score -= 25; // No proper sentences

        // Repetitive content
        const words = contentTrimmed.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        if (words.length > 10 && uniqueWords.size / words.length < 0.5) {
            score -= 20;
        }

        // Truncation indicators
        if (contentTrimmed.endsWith('...') || contentTrimmed.endsWith('..')) {
            score -= 25;
        }

        // Poor quality indicators
        const poorQualityPatterns = [
            /^testing/i,
            /^temp/i,
            /^todo/i,
            /^fixme/i,
            /^placeholder/i,
            /lorem ipsum/i,
            /^just a/i,
            /^this is a/i
        ];

        for (const pattern of poorQualityPatterns) {
            if (pattern.test(contentTrimmed)) {
                score -= 30;
                break;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score metadata quality (0-100)
     */
    scoreMetadataQuality(metadata) {
        let score = 100;
        const required = ['id', 'timestamp', 'category', 'project'];
        const recommended = ['tags', 'priority', 'complexity', 'status'];

        // Check required fields
        for (const field of required) {
            if (!metadata[field]) {
                score -= 20;
            }
        }

        // Check recommended fields
        for (const field of recommended) {
            if (!metadata[field]) {
                score -= 10;
            }
        }

        // Validate field values
        if (metadata.category && !['personal', 'work', 'code', 'research', 'conversations', 'preferences'].includes(metadata.category)) {
            score -= 15;
        }

        if (metadata.priority && !['low', 'medium', 'high'].includes(metadata.priority)) {
            score -= 10;
        }

        if (metadata.complexity && (metadata.complexity < 1 || metadata.complexity > 4)) {
            score -= 15;
        }

        // Tags quality
        if (metadata.tags) {
            if (!Array.isArray(metadata.tags)) {
                score -= 15;
            } else if (metadata.tags.length === 0) {
                score -= 10;
            } else if (metadata.tags.length > 10) {
                score -= 5;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score structure quality (0-100)
     */
    scoreStructureQuality(memory) {
        let score = 100;

        // Check if frontmatter exists
        if (!memory.metadata) {
            score -= 50;
        }

        // Check content structure
        if (!memory.content) {
            score -= 40;
        }

        // Check for proper markdown structure
        if (memory.content) {
            const hasHeaders = /^#{1,6}\s+/m.test(memory.content);
            const hasLists = /^[\s]*[-*+]\s+/m.test(memory.content);
            const hasCodeBlocks = /```/.test(memory.content);
            
            if (memory.content.length > 200) {
                if (!hasHeaders) score -= 10;
                if (!hasLists && !hasCodeBlocks) score -= 5;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score content quality (0-100)
     */
    scoreContentQuality(content) {
        if (!content) return 0;
        
        let score = 100;

        // Check for useful content patterns
        const usefulPatterns = [
            /https?:\/\/\S+/,  // URLs
            /```[\s\S]*?```/,  // Code blocks
            /`[^`]+`/,         // Inline code
            /\b\d{4}-\d{2}-\d{2}\b/, // Dates
            /\b[A-Z][a-z]+\.[a-z]+\b/ // File extensions
        ];

        let hasUsefulContent = false;
        for (const pattern of usefulPatterns) {
            if (pattern.test(content)) {
                hasUsefulContent = true;
                break;
            }
        }

        if (hasUsefulContent) score += 10;

        // Check for poor content indicators
        const poorIndicators = [
            /^(testing|temp|todo|fixme|placeholder)/i,
            /\$\(date/,
            /lorem ipsum/i,
            /^just testing/i,
            /^quick test/i
        ];

        for (const indicator of poorIndicators) {
            if (indicator.test(content)) {
                score -= 25;
                break;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Identify specific issues with a memory
     */
    identifyIssues(memory, scores) {
        const issues = [];

        if (scores.title < 50) {
            issues.push({
                type: 'title',
                severity: 'high',
                message: 'Poor title quality - generic, truncated, or malformed'
            });
        }

        if (scores.description < 40) {
            issues.push({
                type: 'description',
                severity: 'high',
                message: 'Poor description quality - too short, unclear, or repetitive'
            });
        }

        if (scores.metadata < 60) {
            issues.push({
                type: 'metadata',
                severity: 'medium',
                message: 'Incomplete or invalid metadata'
            });
        }

        if (scores.structure < 70) {
            issues.push({
                type: 'structure',
                severity: 'medium',
                message: 'Poor structure - missing frontmatter or content organization'
            });
        }

        if (scores.content < 50) {
            issues.push({
                type: 'content',
                severity: 'low',
                message: 'Content lacks useful information or has quality issues'
            });
        }

        return issues;
    }

    /**
     * Generate improvement suggestions
     */
    generateImprovements(memory, scores, issues) {
        const improvements = [];

        for (const issue of issues) {
            switch (issue.type) {
                case 'title':
                    improvements.push({
                        type: 'title',
                        action: 'Generate descriptive title from content',
                        priority: 'high'
                    });
                    break;
                case 'description':
                    improvements.push({
                        type: 'description',
                        action: 'Expand description with more detail and context',
                        priority: 'high'
                    });
                    break;
                case 'metadata':
                    improvements.push({
                        type: 'metadata',
                        action: 'Complete missing metadata fields',
                        priority: 'medium'
                    });
                    break;
                case 'structure':
                    improvements.push({
                        type: 'structure',
                        action: 'Improve markdown structure and organization',
                        priority: 'medium'
                    });
                    break;
                case 'content':
                    improvements.push({
                        type: 'content',
                        action: 'Enhance content with more useful information',
                        priority: 'low'
                    });
                    break;
            }
        }

        return improvements;
    }

    /**
     * Get quality level description
     */
    getQualityLevel(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        if (score >= 40) return 'poor';
        return 'very_poor';
    }

    /**
     * Scan all memories and generate quality report
     */
    async generateBulkQualityReport(memoriesPath = 'memories') {
        const report = {
            totalMemories: 0,
            qualityDistribution: {
                excellent: 0,
                good: 0,
                fair: 0,
                poor: 0,
                very_poor: 0
            },
            issues: {
                title: 0,
                description: 0,
                metadata: 0,
                structure: 0,
                content: 0
            },
            needsImprovement: []
        };

        const scanDirectory = async (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.name.endsWith('.md')) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const parsed = this.parseMemoryContent(content);
                        const quality = this.scoreMemoryQuality(parsed);
                        
                        report.totalMemories++;
                        report.qualityDistribution[quality.qualityLevel]++;
                        
                        // Count issues
                        for (const issue of quality.issues) {
                            report.issues[issue.type]++;
                        }
                        
                        // Track memories that need improvement
                        if (quality.totalScore < 70) {
                            report.needsImprovement.push({
                                path: fullPath,
                                score: quality.totalScore,
                                issues: quality.issues,
                                improvements: quality.improvements
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing ${fullPath}:`, error);
                    }
                }
            }
        };

        if (fs.existsSync(memoriesPath)) {
            await scanDirectory(memoriesPath);
        }

        return report;
    }
}

module.exports = { MemoryDescriptionQualityScorer };