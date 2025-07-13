const fs = require('fs');
const path = require('path');
const { MemoryQualityStandards } = require('./memory-quality-standards.cjs');
const { MemoryDescriptionQualityScorer } = require('./memory-description-quality-scorer.cjs');

/**
 * Memory Task Analyzer
 * Analyzes memory quality against strict standards and provides detailed remediation
 */
class MemoryTaskAnalyzer {
    constructor() {
        this.standards = new MemoryQualityStandards();
        this.scorer = new MemoryDescriptionQualityScorer();
    }

    /**
     * Analyze a single memory against quality standards
     */
    analyzeMemoryQuality(memory, filePath) {
        const analysis = {
            filePath,
            overallScore: 0,
            titleAnalysis: null,
            descriptionAnalysis: null,
            compliance: {
                meetsStandards: false,
                criticalIssues: [],
                recommendations: []
            },
            before: {
                title: memory.metadata?.title || this.extractTitleFromFilename(filePath),
                description: memory.content || ''
            },
            suggested: {
                title: null,
                description: null
            }
        };

        // Analyze title
        const currentTitle = analysis.before.title;
        analysis.titleAnalysis = this.standards.validateTitle(currentTitle);
        
        // Generate better title if needed
        if (!analysis.titleAnalysis.isValid) {
            analysis.suggested.title = this.generateImprovedTitle(memory.content, currentTitle);
        }

        // Analyze description
        analysis.descriptionAnalysis = this.standards.validateDescription(
            analysis.before.description, 
            currentTitle
        );

        // Generate better description if needed
        if (!analysis.descriptionAnalysis.isValid) {
            analysis.suggested.description = this.generateImprovedDescription(
                memory.content, 
                analysis.suggested.title || currentTitle
            );
        }

        // Calculate overall score and compliance
        analysis.overallScore = (analysis.titleAnalysis.score + analysis.descriptionAnalysis.score) / 2;
        analysis.compliance.meetsStandards = analysis.overallScore >= 70;

        // Collect critical issues
        if (analysis.titleAnalysis.score < 50) {
            analysis.compliance.criticalIssues.push({
                type: 'title',
                severity: 'critical',
                issues: analysis.titleAnalysis.violations
            });
        }

        if (analysis.descriptionAnalysis.score < 50) {
            analysis.compliance.criticalIssues.push({
                type: 'description', 
                severity: 'critical',
                issues: analysis.descriptionAnalysis.violations
            });
        }

        // Generate recommendations
        analysis.compliance.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    /**
     * Extract title from filename as fallback
     */
    extractTitleFromFilename(filePath) {
        const basename = path.basename(filePath, '.md');
        // Remove date prefix and clean up
        let title = basename.replace(/^\d{4}-\d{2}-\d{2}--?/, '');
        title = title.replace(/-+/g, ' ');
        title = title.replace(/\d{6}$/, ''); // Remove trailing numbers
        return title.trim();
    }

    /**
     * Generate improved title using standards
     */
    generateImprovedTitle(content, currentTitle) {
        // First try to extract from content
        const extractedTitle = this.standards.extractTitleFromContent(content);
        if (extractedTitle) {
            const validation = this.standards.validateTitle(extractedTitle);
            if (validation.isValid) {
                return extractedTitle;
            }
        }

        // Try to improve current title
        if (currentTitle && currentTitle.trim().length > 0) {
            const improved = this.standards.improveTitle(currentTitle);
            const validation = this.standards.validateTitle(improved);
            if (validation.score > 50) {
                return improved;
            }
        }

        // Generate from content analysis
        return this.analyzeContentForTitle(content);
    }

    /**
     * Analyze content to generate a proper title
     */
    analyzeContentForTitle(content) {
        if (!content) return null;

        const lines = content.split('\n').filter(line => line.trim());
        
        // Look for implementation patterns
        const implementationPatterns = [
            { pattern: /implement(?:ed|s|ing)?\s+([^.]+)/i, prefix: 'Implement' },
            { pattern: /fix(?:ed|es|ing)?\s+([^.]+)/i, prefix: 'Fix' },
            { pattern: /add(?:ed|s|ing)?\s+([^.]+)/i, prefix: 'Add' },
            { pattern: /create(?:d|s|ing)?\s+([^.]+)/i, prefix: 'Create' },
            { pattern: /configure(?:d|s|ing)?\s+([^.]+)/i, prefix: 'Configure' },
            { pattern: /update(?:d|s|ing)?\s+([^.]+)/i, prefix: 'Update' }
        ];

        for (const line of lines.slice(0, 10)) {
            for (const { pattern, prefix } of implementationPatterns) {
                const match = line.match(pattern);
                if (match) {
                    let subject = match[1].trim();
                    subject = subject.split(/[.,:;]/)[0]; // Take first part
                    if (subject.length > 10 && subject.length < 60) {
                        const title = `${prefix} ${subject}`;
                        const validation = this.standards.validateTitle(title);
                        if (validation.score > 60) {
                            return title;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Generate improved description
     */
    generateImprovedDescription(content, title) {
        if (!content) return null;

        // Extract key information
        const sections = this.extractContentSections(content);
        
        let improved = '';

        // Add context if available
        if (sections.problem) {
            improved += `Problem: ${sections.problem}\n\n`;
        }

        // Add solution
        if (sections.solution) {
            improved += `Solution: ${sections.solution}\n\n`;
        }

        // Add technical details
        if (sections.technical.length > 0) {
            improved += `Technical details:\n${sections.technical.map(t => `- ${t}`).join('\n')}\n\n`;
        }

        // Add result if available
        if (sections.result) {
            improved += `Result: ${sections.result}`;
        }

        return improved.trim() || null;
    }

    /**
     * Extract structured sections from content
     */
    extractContentSections(content) {
        const sections = {
            problem: null,
            solution: null,
            technical: [],
            result: null
        };

        const lines = content.split('\n').filter(line => line.trim());

        // Pattern matching for different sections
        for (const line of lines) {
            const trimmed = line.trim();

            // Problem indicators
            if (/\b(problem|issue|bug|error|needed|required)\b/i.test(trimmed) && !sections.problem) {
                sections.problem = trimmed.substring(0, 100);
            }

            // Solution indicators
            if (/\b(solution|fix|implement|create|add|configure)\b/i.test(trimmed) && !sections.solution) {
                sections.solution = trimmed.substring(0, 100);
            }

            // Technical details
            if (/\.(js|ts|tsx|css|json|md|py)\b/i.test(trimmed) || 
                /\b(function|component|api|endpoint|database)\b/i.test(trimmed)) {
                sections.technical.push(trimmed.substring(0, 80));
            }

            // Result indicators
            if (/\b(result|completed|working|resolved|now|success)\b/i.test(trimmed) && !sections.result) {
                sections.result = trimmed.substring(0, 100);
            }
        }

        return sections;
    }

    /**
     * Generate specific recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        // Title recommendations
        if (analysis.titleAnalysis.score < 70) {
            recommendations.push({
                type: 'title',
                priority: 'high',
                current: analysis.before.title,
                suggested: analysis.suggested.title,
                reasons: analysis.titleAnalysis.violations,
                improvements: analysis.titleAnalysis.suggestions
            });
        }

        // Description recommendations
        if (analysis.descriptionAnalysis.score < 70) {
            recommendations.push({
                type: 'description',
                priority: analysis.descriptionAnalysis.score < 50 ? 'high' : 'medium',
                current: analysis.before.description.substring(0, 100) + '...',
                suggested: analysis.suggested.description ? 
                    analysis.suggested.description.substring(0, 100) + '...' : null,
                reasons: analysis.descriptionAnalysis.violations,
                improvements: analysis.descriptionAnalysis.suggestions
            });
        }

        return recommendations;
    }

    /**
     * Batch analyze all memories and generate compliance report
     */
    async generateComplianceReport(memoriesPath = 'memories') {
        const report = {
            timestamp: new Date().toISOString(),
            totalAnalyzed: 0,
            compliance: {
                meets: 0,
                fails: 0,
                percentage: 0
            },
            scores: {
                excellent: 0, // 90+
                good: 0,      // 70-89
                poor: 0,      // 50-69
                critical: 0   // <50
            },
            criticalIssues: [],
            recommendations: [],
            examples: {
                good: [],
                bad: []
            }
        };

        const analyzeDirectory = async (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    await analyzeDirectory(fullPath);
                } else if (entry.name.endsWith('.md')) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const memory = this.scorer.parseMemoryContent(content);
                        if (memory) {
                            const analysis = this.analyzeMemoryQuality(memory, fullPath);
                            
                            report.totalAnalyzed++;
                            
                            // Compliance tracking
                            if (analysis.compliance.meetsStandards) {
                                report.compliance.meets++;
                            } else {
                                report.compliance.fails++;
                            }
                            
                            // Score distribution
                            if (analysis.overallScore >= 90) report.scores.excellent++;
                            else if (analysis.overallScore >= 70) report.scores.good++;
                            else if (analysis.overallScore >= 50) report.scores.poor++;
                            else report.scores.critical++;
                            
                            // Collect critical issues
                            if (analysis.overallScore < 50) {
                                report.criticalIssues.push({
                                    file: path.basename(fullPath),
                                    score: analysis.overallScore,
                                    issues: analysis.compliance.criticalIssues
                                });
                            }
                            
                            // Collect recommendations for worst cases
                            if (analysis.overallScore < 30) {
                                report.recommendations.push({
                                    file: path.basename(fullPath),
                                    score: analysis.overallScore,
                                    recommendations: analysis.compliance.recommendations
                                });
                            }
                            
                            // Examples
                            if (analysis.overallScore >= 80 && report.examples.good.length < 5) {
                                report.examples.good.push({
                                    file: path.basename(fullPath),
                                    title: analysis.before.title,
                                    score: analysis.overallScore
                                });
                            }
                            
                            if (analysis.overallScore < 40 && report.examples.bad.length < 10) {
                                report.examples.bad.push({
                                    file: path.basename(fullPath),
                                    title: analysis.before.title,
                                    suggested: analysis.suggested.title,
                                    score: analysis.overallScore,
                                    issues: analysis.titleAnalysis.violations.slice(0, 3)
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error analyzing ${fullPath}:`, error.message);
                    }
                }
            }
        };

        if (fs.existsSync(memoriesPath)) {
            await analyzeDirectory(memoriesPath);
        }

        // Calculate percentages
        report.compliance.percentage = Math.round(
            (report.compliance.meets / report.totalAnalyzed) * 100
        );

        return report;
    }

    /**
     * Get quality standards summary for reference
     */
    getQualityStandards() {
        return this.standards.getStandardsSummary();
    }
}

module.exports = { MemoryTaskAnalyzer };