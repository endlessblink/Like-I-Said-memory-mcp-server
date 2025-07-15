/**
 * Memory Quality Standards and Validation
 * Defines specific quality criteria and standards for memory titles and descriptions
 */

class MemoryQualityStandards {
    constructor() {
        this.titleStandards = this.defineTitleStandards();
        this.descriptionStandards = this.defineDescriptionStandards();
    }

    /**
     * Define strict title quality standards
     */
    defineTitleStandards() {
        return {
            // Length requirements
            minLength: 15,
            maxLength: 80,
            optimalLength: { min: 20, max: 60 },

            // Required characteristics
            mustHave: {
                specificAction: true,        // Must indicate what was done (fix, add, create, etc.)
                specificSubject: true,       // Must specify what component/feature
                noGenericWords: true,       // No "dashboard improvements", "session", etc.
                noTimestamps: true,         // No dates in titles
                noTruncation: true,         // No "..." or cut-off words
                properCapitalization: true  // Title case or sentence case
            },

            // Forbidden patterns
            forbiddenPatterns: [
                /^dashboard improvements?/i,
                /session\s*\(/i,
                /\(\s*\w+\s+\d{1,2},?\s+\d{4}\s*\)/,  // (June 16, 2025)
                /^(major|complete|comprehensive)\s+/i,
                /^(session|meeting|call|discussion)/i,
                /^(status|update|progress)\s+/i,
                /\.\.\./,
                /^-----/,
                /^id-\d+/,
                /\$\(date/
            ],

            // Generic words that make titles weak
            weakWords: [
                'improvements', 'session', 'update', 'status', 'progress',
                'changes', 'modifications', 'enhancements', 'work',
                'stuff', 'things', 'various', 'multiple', 'general'
            ],

            // Strong action words that make good titles
            strongActions: [
                'implement', 'fix', 'add', 'create', 'configure', 'optimize',
                'refactor', 'integrate', 'migrate', 'deploy', 'automate',
                'establish', 'resolve', 'develop', 'design', 'build'
            ],

            // Technical specificity requirements
            specificity: {
                requiresComponent: true,     // Must mention specific component
                requiresContext: true,       // Must provide context
                avoidVague: true            // Avoid vague descriptions
            }
        };
    }

    /**
     * Define strict description quality standards
     */
    defineDescriptionStandards() {
        return {
            // Length requirements
            minLength: 50,
            maxLength: 300,
            optimalLength: { min: 80, max: 200 },

            // Structure requirements
            structure: {
                requiresContext: true,       // What was the problem/goal
                requiresActions: true,       // What specific actions were taken
                requiresOutcome: true,       // What was achieved/result
                requiresBulletPoints: false, // Optional but preferred for lists
                requiresCodeBlocks: false    // When relevant
            },

            // Content quality
            content: {
                specificDetails: true,       // Must have specific technical details
                noGenericPhrases: true,     // Avoid generic descriptions
                properTechnicalTerms: true, // Use correct technical terminology
                actionableInformation: true, // Information others can act on
                contextualRelevance: true   // Relevant to the project/system
            },

            // Forbidden phrases
            forbiddenPhrases: [
                'various things', 'different stuff', 'multiple improvements',
                'general enhancements', 'overall progress', 'status update',
                'session complete', 'work done', 'fixes applied'
            ],

            // Required elements for technical content
            technicalRequirements: {
                fileNames: true,            // Mention specific files modified
                technologies: true,         // Mention specific technologies used
                problemStatement: true,     // Clear problem description
                solutionDetails: true      // Specific solution implementation
            }
        };
    }

    /**
     * Validate title against quality standards
     */
    validateTitle(title) {
        const validation = {
            isValid: true,
            score: 100,
            violations: [],
            suggestions: []
        };

        if (!title || typeof title !== 'string') {
            validation.isValid = false;
            validation.score = 0;
            validation.violations.push('Title is missing or invalid');
            return validation;
        }

        const cleanTitle = title.trim();

        // Length validation
        if (cleanTitle.length < this.titleStandards.minLength) {
            validation.violations.push(`Title too short (${cleanTitle.length} < ${this.titleStandards.minLength})`);
            validation.score -= 20;
        }

        if (cleanTitle.length > this.titleStandards.maxLength) {
            validation.violations.push(`Title too long (${cleanTitle.length} > ${this.titleStandards.maxLength})`);
            validation.score -= 15;
        }

        // Forbidden patterns
        for (const pattern of this.titleStandards.forbiddenPatterns) {
            if (pattern.test(cleanTitle)) {
                validation.violations.push(`Contains forbidden pattern: ${pattern.source}`);
                validation.score -= 25;
            }
        }

        // Weak words check
        const titleLower = cleanTitle.toLowerCase();
        const foundWeakWords = this.titleStandards.weakWords.filter(word => 
            titleLower.includes(word)
        );
        if (foundWeakWords.length > 0) {
            validation.violations.push(`Contains weak words: ${foundWeakWords.join(', ')}`);
            validation.score -= 15 * foundWeakWords.length;
        }

        // Strong action words check
        const hasStrongAction = this.titleStandards.strongActions.some(action =>
            titleLower.includes(action)
        );
        if (!hasStrongAction) {
            validation.violations.push('Missing strong action word');
            validation.score -= 20;
            validation.suggestions.push(`Consider starting with: ${this.titleStandards.strongActions.slice(0, 5).join(', ')}`);
        }

        // Specificity checks
        if (this.isVagueTitle(cleanTitle)) {
            validation.violations.push('Title is too vague or generic');
            validation.score -= 25;
        }

        if (validation.score < 70) {
            validation.isValid = false;
        }

        return validation;
    }

    /**
     * Validate description against quality standards
     */
    validateDescription(description, title = '') {
        const validation = {
            isValid: true,
            score: 100,
            violations: [],
            suggestions: []
        };

        if (!description || typeof description !== 'string') {
            validation.isValid = false;
            validation.score = 0;
            validation.violations.push('Description is missing or invalid');
            return validation;
        }

        const cleanDesc = description.trim();

        // Length validation
        if (cleanDesc.length < this.descriptionStandards.minLength) {
            validation.violations.push(`Description too short (${cleanDesc.length} < ${this.descriptionStandards.minLength})`);
            validation.score -= 25;
        }

        if (cleanDesc.length > this.descriptionStandards.maxLength) {
            validation.violations.push(`Description too long (${cleanDesc.length} > ${this.descriptionStandards.maxLength})`);
            validation.score -= 15;
        }

        // Forbidden phrases
        const descLower = cleanDesc.toLowerCase();
        for (const phrase of this.descriptionStandards.forbiddenPhrases) {
            if (descLower.includes(phrase)) {
                validation.violations.push(`Contains forbidden phrase: "${phrase}"`);
                validation.score -= 20;
            }
        }

        // Structure validation
        if (!this.hasProperStructure(cleanDesc)) {
            validation.violations.push('Poor structure - lacks context, actions, or outcome');
            validation.score -= 20;
        }

        // Technical content validation
        if (!this.hasTechnicalSpecificity(cleanDesc)) {
            validation.violations.push('Lacks technical specificity');
            validation.score -= 25;
            validation.suggestions.push('Add specific file names, technologies, or implementation details');
        }

        // Redundancy with title
        if (this.isRedundantWithTitle(cleanDesc, title)) {
            validation.violations.push('Description is too similar to title');
            validation.score -= 15;
        }

        if (validation.score < 70) {
            validation.isValid = false;
        }

        return validation;
    }

    /**
     * Check if title is vague
     */
    isVagueTitle(title) {
        const vaguePatterns = [
            /^(dashboard|system|application|project)\s+(work|updates?|changes?|improvements?)/i,
            /^(major|minor|general|overall|complete)\s+/i,
            /^(session|meeting|call|discussion)\s+/i,
            /^(status|progress|update)\s+(on|for|of)/i
        ];

        return vaguePatterns.some(pattern => pattern.test(title));
    }

    /**
     * Check if description has proper structure
     */
    hasProperStructure(description) {
        // Should have some indication of problem/context, action, and result
        const hasContext = /\b(problem|issue|needed|required|goal|objective)\b/i.test(description);
        const hasAction = /\b(implemented|fixed|added|created|configured|modified|updated)\b/i.test(description);
        const hasOutcome = /\b(now|result|completed|working|resolved|achieved)\b/i.test(description);

        return hasContext || hasAction || hasOutcome;
    }

    /**
     * Check if description has technical specificity
     */
    hasTechnicalSpecificity(description) {
        // Should mention files, technologies, or specific implementations
        const hasFiles = /\.(js|ts|tsx|css|json|md|py|java|cpp)\b/i.test(description);
        const hasTech = /\b(react|node|express|api|database|docker|git|npm|webpack)\b/i.test(description);
        const hasSpecifics = /\b(function|component|endpoint|route|query|method|class)\b/i.test(description);

        return hasFiles || hasTech || hasSpecifics;
    }

    /**
     * Check if description is redundant with title
     */
    isRedundantWithTitle(description, title) {
        if (!title) return false;
        
        const titleWords = title.toLowerCase().split(/\s+/);
        const descWords = description.toLowerCase().split(/\s+/).slice(0, 10); // First 10 words
        
        const overlap = titleWords.filter(word => 
            word.length > 3 && descWords.includes(word)
        );
        
        return overlap.length > titleWords.length * 0.6; // More than 60% overlap
    }

    /**
     * Generate improvement suggestions for title
     */
    generateTitleSuggestions(title, content = '') {
        const suggestions = [];
        
        if (!title || this.isVagueTitle(title)) {
            // Extract potential title from content
            const extractedTitle = this.extractTitleFromContent(content);
            if (extractedTitle) {
                suggestions.push(`Suggested title: "${extractedTitle}"`);
            }
        }

        // Generic improvement suggestions
        suggestions.push('Use specific action words: implement, fix, add, create, configure');
        suggestions.push('Mention specific component/feature being modified');
        suggestions.push('Avoid generic words like "improvements", "session", "updates"');
        suggestions.push('Remove dates and timestamps from title');

        return suggestions;
    }

    /**
     * Extract a better title from content
     */
    extractTitleFromContent(content) {
        if (!content) return null;

        // Look for headers
        const headerMatch = content.match(/^#+\s+(.+)$/m);
        if (headerMatch) {
            const header = headerMatch[1].trim();
            if (header.length >= 15 && header.length <= 80) {
                return header;
            }
        }

        // Look for first meaningful sentence with action
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        for (const sentence of sentences.slice(0, 3)) {
            const trimmed = sentence.trim();
            const hasAction = this.titleStandards.strongActions.some(action =>
                trimmed.toLowerCase().includes(action)
            );
            if (hasAction && trimmed.length >= 15 && trimmed.length <= 80) {
                return this.improveTitle(trimmed);
            }
        }

        return null;
    }

    /**
     * Improve a title by applying standards
     */
    improveTitle(rawTitle) {
        let improved = rawTitle.trim();

        // Remove common prefixes
        improved = improved.replace(/^(this|that|here|we|i)\s+/i, '');
        improved = improved.replace(/^(is|are|was|were|will|would|should|could)\s+/i, '');

        // Capitalize properly
        improved = improved.charAt(0).toUpperCase() + improved.slice(1);

        // Remove timestamps and sessions
        improved = improved.replace(/\s*\([^)]*\d{4}[^)]*\)/g, '');
        improved = improved.replace(/\s*session\s*$/i, '');

        return improved;
    }

    /**
     * Get overall quality standards summary
     */
    getStandardsSummary() {
        return {
            title: {
                length: `${this.titleStandards.minLength}-${this.titleStandards.maxLength} chars`,
                required: 'Specific action + component/feature',
                forbidden: 'Generic words, dates, truncation',
                examples: {
                    good: [
                        'Implement WebSocket real-time memory synchronization',
                        'Fix React Flow node positioning calculation bug',
                        'Add Docker environment configuration for dashboard'
                    ],
                    bad: [
                        'Dashboard Improvements Session',
                        'Major UI/UX Fixes Completed',
                        'WSL Configuration Status Update'
                    ]
                }
            },
            description: {
                length: `${this.descriptionStandards.minLength}-${this.descriptionStandards.maxLength} chars`,
                required: 'Context + Actions + Technical details',
                structure: 'Problem → Solution → Result',
                forbidden: 'Generic phrases, redundancy with title'
            }
        };
    }
}

module.exports = { MemoryQualityStandards };