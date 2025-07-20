/**
 * Analytics Integration for MCP Server
 * 
 * Integrates privacy-first analytics into the MCP server workflow
 * Tracks usage patterns while respecting user privacy
 */

import analytics, { 
    trackManualInstallation,
    trackToolUsage,
    trackMemoryOperation,
    trackTaskOperation,
    trackError,
    isAnalyticsEnabled,
    getPrivacyNotice
} from './analytics-telemetry.js';

class AnalyticsIntegration {
    constructor() {
        this.sessionStats = {
            startTime: Date.now(),
            toolsUsed: new Set(),
            memoriesAccessed: 0,
            tasksModified: 0,
            errorsEncountered: 0
        };

        // Track installation type on first run
        this.trackInstallationType();
    }

    /**
     * Track installation type based on environment
     */
    async trackInstallationType() {
        try {
            await trackManualInstallation();
        } catch (error) {
            // Fail silently
        }
    }

    /**
     * Track MCP tool execution
     */
    async onToolExecution(toolName, params = {}, success = true) {
        if (!isAnalyticsEnabled()) return;

        try {
            this.sessionStats.toolsUsed.add(toolName);

            await trackToolUsage(toolName, {
                success,
                param_count: Object.keys(params).length,
                execution_time: Date.now()
            });

            // Track specific operations
            if (toolName.includes('memory')) {
                this.sessionStats.memoriesAccessed++;
                
                let operation = 'unknown';
                if (toolName.includes('add')) operation = 'add';
                else if (toolName.includes('search')) operation = 'search';
                else if (toolName.includes('list')) operation = 'list';
                else if (toolName.includes('get')) operation = 'get';
                else if (toolName.includes('delete')) operation = 'delete';
                else if (toolName.includes('deduplicate')) operation = 'deduplicate';

                await trackMemoryOperation(operation, {
                    has_project: !!params.project,
                    has_tags: !!params.tags,
                    has_category: !!params.category
                });
            }

            if (toolName.includes('task')) {
                this.sessionStats.tasksModified++;

                let operation = 'unknown';
                if (toolName.includes('create')) operation = 'create';
                else if (toolName.includes('update')) operation = 'update';
                else if (toolName.includes('list')) operation = 'list';
                else if (toolName.includes('get')) operation = 'get';
                else if (toolName.includes('delete')) operation = 'delete';

                await trackTaskOperation(operation, {
                    has_project: !!params.project,
                    has_priority: !!params.priority,
                    has_parent: !!params.parent_task
                });
            }
        } catch (error) {
            // Analytics should never break the main application
        }
    }

    /**
     * Track errors
     */
    async onError(errorType, errorDetails = {}) {
        if (!isAnalyticsEnabled()) return;

        try {
            this.sessionStats.errorsEncountered++;
            
            await trackError(errorType, {
                has_details: Object.keys(errorDetails).length > 0,
                error_time: Date.now()
            });
        } catch (error) {
            // Fail silently
        }
    }

    /**
     * Track session end
     */
    async onSessionEnd() {
        if (!isAnalyticsEnabled()) return;

        try {
            const sessionDuration = Date.now() - this.sessionStats.startTime;
            
            await analytics.trackSessionSummary({
                duration: sessionDuration,
                toolsUsed: this.sessionStats.toolsUsed.size,
                memoriesAccessed: this.sessionStats.memoriesAccessed,
                tasksModified: this.sessionStats.tasksModified,
                errorsEncountered: this.sessionStats.errorsEncountered
            });
        } catch (error) {
            // Fail silently
        }
    }

    /**
     * Get analytics opt-in tool for MCP
     */
    getAnalyticsOptInTool() {
        return {
            name: "configure_analytics",
            description: "Configure anonymous usage analytics settings",
            inputSchema: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        enum: ["enable", "disable", "status", "privacy"],
                        description: "Action to perform: enable, disable, check status, or view privacy policy"
                    }
                },
                required: ["action"]
            }
        };
    }

    /**
     * Handle analytics configuration requests
     */
    async handleAnalyticsConfiguration(params) {
        const { action } = params;

        try {
            switch (action) {
                case "enable":
                    analytics.enableAnalytics();
                    return {
                        content: [{
                            type: "text",
                            text: "✅ Anonymous analytics enabled. Thank you for helping improve Like-I-Said!\n\nWe collect anonymous usage patterns to understand which tools are most useful and identify areas for improvement. No personal data or content is ever collected."
                        }]
                    };

                case "disable":
                    analytics.disableAnalytics();
                    return {
                        content: [{
                            type: "text", 
                            text: "🔒 Analytics disabled. Your privacy is protected and no usage data will be collected."
                        }]
                    };

                case "status":
                    const status = analytics.getStatus();
                    return {
                        content: [{
                            type: "text",
                            text: `📊 Analytics Status:
• Enabled: ${status.enabled ? 'Yes' : 'No'}
• Installation ID: ${status.installationId}
• First Run: ${status.firstRun}
• Opt-in Date: ${status.optInDate || 'Not opted in'}
• Version: ${status.version}

${status.enabled ? 
    'Analytics is collecting anonymous usage data to help improve Like-I-Said.' : 
    'Analytics is disabled. No usage data is being collected.'}`
                        }]
                    };

                case "privacy":
                    const notice = analytics.getPrivacyNotice();
                    return {
                        content: [{
                            type: "text",
                            text: `🔒 ${notice.title}

${notice.message}

Current Status: ${isAnalyticsEnabled() ? 'Enabled' : 'Disabled'}

To change settings, use:
• "configure_analytics enable" - Enable anonymous analytics
• "configure_analytics disable" - Disable analytics
• "configure_analytics status" - Check current status`
                        }]
                    };

                default:
                    return {
                        content: [{
                            type: "text",
                            text: "❌ Invalid action. Use: enable, disable, status, or privacy"
                        }]
                    };
            }
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `❌ Analytics configuration failed: ${error.message}`
                }]
            };
        }
    }

    /**
     * Show privacy notice on first run
     */
    async showFirstRunNotice() {
        const status = analytics.getStatus();
        
        // Only show on first run and if not already configured
        if (status.optInDate === null && this.isFirstRun()) {
            const notice = analytics.getPrivacyNotice();
            
            return {
                content: [{
                    type: "text",
                    text: `🎉 Welcome to Like-I-Said Memory Server v2.4.0!

${notice.message}

Use the "configure_analytics" tool to:
• configure_analytics enable - Help improve Like-I-Said
• configure_analytics disable - Keep everything private
• configure_analytics privacy - Learn more about our privacy policy

You can change this setting anytime.`
                }]
            };
        }

        return null;
    }

    /**
     * Check if this is first run
     */
    isFirstRun() {
        const status = analytics.getStatus();
        const firstRunTime = new Date(status.firstRun);
        const now = new Date();
        const minutesSinceFirstRun = (now - firstRunTime) / (1000 * 60);
        
        // Consider it first run if within 5 minutes
        return minutesSinceFirstRun < 5;
    }

    /**
     * Get usage statistics for dashboard
     */
    getUsageStatistics() {
        if (!isAnalyticsEnabled()) {
            return null;
        }

        return {
            sessionDuration: Date.now() - this.sessionStats.startTime,
            toolsUsed: this.sessionStats.toolsUsed.size,
            memoriesAccessed: this.sessionStats.memoriesAccessed,
            tasksModified: this.sessionStats.tasksModified,
            errorsEncountered: this.sessionStats.errorsEncountered
        };
    }
}

// Export singleton instance
export default new AnalyticsIntegration();

// Export individual functions for convenience
export {
    isAnalyticsEnabled,
    getPrivacyNotice
};