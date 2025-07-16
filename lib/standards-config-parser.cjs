const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Standards Configuration Parser
 * Reads quality standards from markdown configuration file
 */
class StandardsConfigParser {
    constructor(configPath = null) {
        this.configPath = configPath || path.join(__dirname, '..', 'memory-quality-standards.md');
        this.config = null;
        this.lastModified = null;
    }

    /**
     * Load and parse the configuration file
     */
    loadConfig() {
        try {
            const content = fs.readFileSync(this.configPath, 'utf8');
            const stats = fs.statSync(this.configPath);
            
            // Check if file has been modified
            if (this.lastModified && stats.mtime.getTime() === this.lastModified) {
                return this.config; // Return cached config
            }
            
            this.lastModified = stats.mtime.getTime();
            this.config = this.parseMarkdownConfig(content);
            return this.config;
            
        } catch (error) {
            console.error('Error loading standards config:', error);
            return this.getDefaultConfig();
        }
    }

    /**
     * Parse markdown content to extract YAML blocks
     */
    parseMarkdownConfig(content) {
        const config = {
            title: {},
            description: {},
            scoring: {},
            compliance: {},
            validation: {},
            dashboard: {}
        };

        // Extract YAML blocks from markdown
        const yamlBlocks = content.match(/```yaml\n([\s\S]*?)```/g) || [];
        
        yamlBlocks.forEach(block => {
            // Remove markdown code block markers
            const yamlContent = block.replace(/```yaml\n|```/g, '');
            
            try {
                const parsed = yaml.load(yamlContent);
                
                // Determine which section this belongs to based on content
                if (parsed.min_length !== undefined && parsed.max_length !== undefined) {
                    // Length requirements
                    if (!config.title.length) {
                        config.title.length = parsed;
                    } else if (!config.description.length) {
                        config.description.length = parsed;
                    }
                } else if (parsed.strong_actions) {
                    config.title.strongActions = parsed.strong_actions;
                } else if (parsed.weak_words) {
                    config.title.weakWords = parsed.weak_words;
                } else if (parsed.forbidden_patterns) {
                    config.title.forbiddenPatterns = parsed.forbidden_patterns.map(p => ({
                        pattern: new RegExp(p.pattern, 'i'),
                        description: p.description
                    }));
                } else if (parsed.good_examples && parsed.good_examples[0]?.title) {
                    config.title.goodExamples = parsed.good_examples;
                } else if (parsed.bad_examples && parsed.bad_examples[0]?.title) {
                    config.title.badExamples = parsed.bad_examples;
                } else if (parsed.must_have) {
                    config.description.requirements = parsed.must_have;
                } else if (parsed.forbidden_phrases) {
                    config.description.forbiddenPhrases = parsed.forbidden_phrases;
                } else if (parsed.scoring_weights) {
                    config.scoring = parsed.scoring_weights;
                } else if (parsed.thresholds) {
                    config.compliance = parsed.thresholds;
                } else if (parsed.validation) {
                    config.validation = parsed.validation;
                } else if (parsed.dashboard_features) {
                    config.dashboard = parsed.dashboard_features;
                }
            } catch (e) {
                console.warn('Failed to parse YAML block:', e.message);
            }
        });

        // Extract required elements from markdown
        const requiredElements = this.extractRequiredElements(content);
        config.title.requiredElements = requiredElements;

        return config;
    }

    /**
     * Extract required elements from markdown text
     */
    extractRequiredElements(content) {
        const required = {
            mustHaveAction: true,
            mustHaveSubject: true,
            mustBeSpecific: true,
            properCapitalization: true
        };

        // Look for required elements section
        const requiredSection = content.match(/### Required Elements([\s\S]*?)###/);
        if (requiredSection) {
            const text = requiredSection[1];
            required.mustHaveAction = text.includes('must_have_action**: true');
            required.mustHaveSubject = text.includes('must_have_subject**: true');
            required.mustBeSpecific = text.includes('must_be_specific**: true');
            required.properCapitalization = text.includes('proper_capitalization**: true');
        }

        return required;
    }

    /**
     * Get title standards from config
     */
    getTitleStandards() {
        const config = this.loadConfig();
        
        return {
            minLength: config.title.length?.min_length || 15,
            maxLength: config.title.length?.max_length || 80,
            optimalLength: {
                min: config.title.length?.optimal_min || 20,
                max: config.title.length?.optimal_max || 60
            },
            mustHave: config.title.requiredElements || {
                specificAction: true,
                specificSubject: true,
                noGenericWords: true,
                noTimestamps: true,
                noTruncation: true,
                properCapitalization: true
            },
            forbiddenPatterns: config.title.forbiddenPatterns || [],
            weakWords: config.title.weakWords || [],
            strongActions: config.title.strongActions || [],
            goodExamples: config.title.goodExamples || [],
            badExamples: config.title.badExamples || []
        };
    }

    /**
     * Get description standards from config
     */
    getDescriptionStandards() {
        const config = this.loadConfig();
        
        return {
            minLength: config.description.length?.min_length || 50,
            maxLength: config.description.length?.max_length || 300,
            optimalLength: {
                min: config.description.length?.optimal_min || 80,
                max: config.description.length?.optimal_max || 200
            },
            requirements: config.description.requirements || {
                context: true,
                actions: true,
                technical_details: true,
                outcome: false
            },
            forbiddenPhrases: config.description.forbiddenPhrases || [],
            goodExamples: config.description.goodExamples || [],
            badExamples: config.description.badExamples || []
        };
    }

    /**
     * Get scoring configuration
     */
    getScoringConfig() {
        const config = this.loadConfig();
        return config.scoring || this.getDefaultScoring();
    }

    /**
     * Get compliance thresholds
     */
    getComplianceThresholds() {
        const config = this.loadConfig();
        return config.compliance || {
            excellent: 90,
            good: 70,
            fair: 60,
            poor: 40,
            critical: 0,
            passing_score: 70,
            target_compliance: 85
        };
    }

    /**
     * Get validation rules
     */
    getValidationRules() {
        const config = this.loadConfig();
        return config.validation || {
            strict_mode: true,
            auto_fix: {
                remove_dates: true,
                remove_session_words: true,
                add_action_words: true,
                fix_capitalization: true,
                remove_forbidden_patterns: true
            }
        };
    }

    /**
     * Get dashboard configuration
     */
    getDashboardConfig() {
        const config = this.loadConfig();
        return config.dashboard || {
            show_quality_score: true,
            show_compliance_badge: true,
            highlight_issues: true,
            suggest_improvements: true,
            quality_indicators: {
                excellent: '🟢',
                good: '🟡',
                poor: '🔴'
            }
        };
    }

    /**
     * Watch configuration file for changes
     */
    watchConfig(callback) {
        if (!fs.existsSync(this.configPath)) {
            console.warn('Standards config file not found');
            return;
        }

        fs.watchFile(this.configPath, (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
                console.log('Standards configuration updated');
                this.loadConfig(); // Reload config
                if (callback) callback(this.config);
            }
        });
    }

    /**
     * Get default configuration if file not found
     */
    getDefaultConfig() {
        return {
            title: {
                length: { min_length: 15, max_length: 80, optimal_min: 20, optimal_max: 60 },
                strongActions: ['implement', 'fix', 'add', 'create', 'configure'],
                weakWords: ['improvements', 'session', 'update', 'status'],
                forbiddenPatterns: [],
                requiredElements: {
                    mustHaveAction: true,
                    mustHaveSubject: true,
                    mustBeSpecific: true,
                    properCapitalization: true
                }
            },
            description: {
                length: { min_length: 50, max_length: 300, optimal_min: 80, optimal_max: 200 },
                requirements: {
                    context: true,
                    actions: true,
                    technical_details: true
                },
                forbiddenPhrases: ['various things', 'different stuff']
            },
            scoring: this.getDefaultScoring(),
            compliance: {
                excellent: 90,
                good: 70,
                fair: 60,
                poor: 40,
                critical: 0,
                passing_score: 70,
                target_compliance: 85
            }
        };
    }

    /**
     * Get default scoring weights
     */
    getDefaultScoring() {
        return {
            title: {
                weight: 0.4,
                components: {
                    specificity: 0.35,
                    action_word: 0.25,
                    length: 0.20,
                    clarity: 0.20
                }
            },
            description: {
                weight: 0.4,
                components: {
                    technical_detail: 0.30,
                    completeness: 0.25,
                    structure: 0.25,
                    length: 0.20
                }
            },
            metadata: {
                weight: 0.2,
                components: {
                    required_fields: 0.50,
                    field_validity: 0.30,
                    completeness: 0.20
                }
            }
        };
    }

    /**
     * Export configuration for dashboard
     */
    exportForDashboard() {
        const config = this.loadConfig();
        const dashboardConfig = this.getDashboardConfig();
        const thresholds = this.getComplianceThresholds();
        
        return {
            qualityThresholds: {
                excellent: thresholds.excellent,
                good: thresholds.good,
                fair: thresholds.fair,
                poor: thresholds.poor,
                critical: thresholds.critical,
                passing: thresholds.passing_score
            },
            indicators: dashboardConfig.quality_indicators,
            features: {
                showScore: dashboardConfig.show_quality_score,
                showBadge: dashboardConfig.show_compliance_badge,
                highlightIssues: dashboardConfig.highlight_issues,
                showSuggestions: dashboardConfig.suggest_improvements
            },
            validation: {
                titleMinLength: config.title.length?.min_length || 15,
                titleMaxLength: config.title.length?.max_length || 80,
                descriptionMinLength: config.description.length?.min_length || 50,
                descriptionMaxLength: config.description.length?.max_length || 300
            }
        };
    }
}

module.exports = { StandardsConfigParser };

// Also export a singleton instance
module.exports.standardsConfig = new StandardsConfigParser();