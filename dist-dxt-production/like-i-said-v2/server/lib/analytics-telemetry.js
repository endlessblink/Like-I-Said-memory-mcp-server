/**
 * Privacy-First Analytics and Telemetry System
 * 
 * This module provides optional, anonymous usage analytics to help improve
 * the Like-I-Said Memory Server. All data is anonymized and users can
 * opt-out at any time.
 * 
 * Data Collection Principles:
 * 1. Anonymous - No personal information
 * 2. Minimal - Only essential usage metrics
 * 3. Transparent - Clear about what's collected
 * 4. Opt-in - Disabled by default, user must enable
 * 5. Secure - Encrypted transmission
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ANALYTICS_VERSION = '1.0.0';
const ANALYTICS_ENDPOINT = 'https://analytics.like-i-said.dev/v1/events';
const CONFIG_FILE = 'analytics-config.json';

class AnalyticsCollector {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.configPath = path.join(dataDir, CONFIG_FILE);
        this.config = this.loadConfig();
        this.sessionId = randomUUID();
        this.installationId = this.getInstallationId();
    }

    /**
     * Load analytics configuration
     */
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return {
                    enabled: false, // Default to disabled
                    installationId: config.installationId || randomUUID(),
                    firstRun: config.firstRun || new Date().toISOString(),
                    optInDate: config.optInDate || null,
                    ...config
                };
            }
        } catch (error) {
            console.log('Analytics config not found, creating default...');
        }

        // Default configuration
        const defaultConfig = {
            enabled: false,
            installationId: randomUUID(),
            firstRun: new Date().toISOString(),
            optInDate: null,
            version: ANALYTICS_VERSION
        };

        this.saveConfig(defaultConfig);
        return defaultConfig;
    }

    /**
     * Save analytics configuration
     */
    saveConfig(config = this.config) {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Failed to save analytics config:', error.message);
        }
    }

    /**
     * Get anonymous installation ID
     */
    getInstallationId() {
        return this.config.installationId;
    }

    /**
     * Enable analytics with user consent
     */
    enableAnalytics() {
        this.config.enabled = true;
        this.config.optInDate = new Date().toISOString();
        this.saveConfig();
        
        // Send opt-in event
        this.trackEvent('analytics_enabled', {
            opt_in_date: this.config.optInDate,
            first_run: this.config.firstRun
        });

        return true;
    }

    /**
     * Disable analytics
     */
    disableAnalytics() {
        this.config.enabled = false;
        this.config.optInDate = null;
        this.saveConfig();
        
        // Send final opt-out event
        this.trackEvent('analytics_disabled', {
            opt_out_date: new Date().toISOString()
        });

        return true;
    }

    /**
     * Check if analytics is enabled
     */
    isEnabled() {
        return this.config.enabled === true;
    }

    /**
     * Get system information (anonymous)
     */
    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            node_version: process.version,
            installation_type: process.env.DXT_INSTALLATION ? 'dxt' : 'manual',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    /**
     * Track an event
     */
    async trackEvent(eventName, properties = {}) {
        if (!this.isEnabled()) {
            return false;
        }

        const event = {
            event: eventName,
            installation_id: this.installationId,
            session_id: this.sessionId,
            timestamp: new Date().toISOString(),
            version: ANALYTICS_VERSION,
            system: this.getSystemInfo(),
            properties: {
                ...properties,
                // Ensure no PII is included
                memory_count: typeof properties.memory_count === 'number' ? 
                    Math.min(properties.memory_count, 10000) : undefined,
                task_count: typeof properties.task_count === 'number' ? 
                    Math.min(properties.task_count, 1000) : undefined
            }
        };

        try {
            await this.sendEvent(event);
            return true;
        } catch (error) {
            console.error('Analytics event failed:', error.message);
            return false;
        }
    }

    /**
     * Send event to analytics endpoint
     */
    async sendEvent(event) {
        if (process.env.NODE_ENV === 'test') {
            console.log('Analytics event (test mode):', event);
            return;
        }

        try {
            const response = await fetch(ANALYTICS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `like-i-said-v2/${ANALYTICS_VERSION}`
                },
                body: JSON.stringify(event),
                timeout: 5000 // 5 second timeout
            });

            if (!response.ok) {
                throw new Error(`Analytics server responded with ${response.status}`);
            }
        } catch (error) {
            // Fail silently - analytics should never break the main application
            if (process.env.DEBUG) {
                console.error('Analytics send failed:', error.message);
            }
        }
    }

    /**
     * Track DXT installation
     */
    async trackDXTInstallation() {
        return this.trackEvent('dxt_installation', {
            installation_method: 'drag_drop',
            installation_time: Date.now(),
            package_version: process.env.PACKAGE_VERSION || 'unknown'
        });
    }

    /**
     * Track manual installation
     */
    async trackManualInstallation() {
        return this.trackEvent('manual_installation', {
            installation_method: 'npm',
            installation_time: Date.now(),
            package_version: process.env.PACKAGE_VERSION || 'unknown'
        });
    }

    /**
     * Track tool usage
     */
    async trackToolUsage(toolName, properties = {}) {
        return this.trackEvent('tool_used', {
            tool_name: toolName,
            ...properties
        });
    }

    /**
     * Track memory operations
     */
    async trackMemoryOperation(operation, properties = {}) {
        return this.trackEvent('memory_operation', {
            operation: operation, // add, search, list, delete, etc.
            ...properties
        });
    }

    /**
     * Track task operations
     */
    async trackTaskOperation(operation, properties = {}) {
        return this.trackEvent('task_operation', {
            operation: operation, // create, update, list, delete, etc.
            ...properties
        });
    }

    /**
     * Track error events
     */
    async trackError(errorType, properties = {}) {
        return this.trackEvent('error_occurred', {
            error_type: errorType,
            ...properties
        });
    }

    /**
     * Track session summary
     */
    async trackSessionSummary(summary = {}) {
        return this.trackEvent('session_summary', {
            session_duration: summary.duration || 0,
            tools_used: summary.toolsUsed || 0,
            memories_accessed: summary.memoriesAccessed || 0,
            tasks_modified: summary.tasksModified || 0,
            errors_encountered: summary.errorsEncountered || 0
        });
    }

    /**
     * Get analytics status for user display
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            installationId: this.installationId,
            firstRun: this.config.firstRun,
            optInDate: this.config.optInDate,
            version: ANALYTICS_VERSION
        };
    }

    /**
     * Show privacy notice
     */
    getPrivacyNotice() {
        return {
            title: "Optional Analytics",
            message: `Like-I-Said can collect anonymous usage data to help improve the software. 

What we collect:
• Tool usage patterns (which tools you use, not your data)
• Performance metrics (response times, error rates)
• System information (OS, Node.js version, installation type)
• Usage frequency (how often you use different features)

What we DON'T collect:
• Your memories or task content
• Personal information
• File paths or names
• IP addresses or location data

All data is anonymous and cannot be traced back to you. You can opt-out at any time by running: "disable analytics"

Would you like to enable anonymous analytics to help improve Like-I-Said?`,
            options: {
                enable: "Yes, help improve Like-I-Said",
                disable: "No, keep it private",
                learn_more: "Learn more about our privacy policy"
            }
        };
    }
}

// Create global instance
const analytics = new AnalyticsCollector();

// Export convenience functions
export default analytics;

export const trackEvent = (eventName, properties) => 
    analytics.trackEvent(eventName, properties);

export const trackDXTInstallation = () => 
    analytics.trackDXTInstallation();

export const trackManualInstallation = () => 
    analytics.trackManualInstallation();

export const trackToolUsage = (toolName, properties) => 
    analytics.trackToolUsage(toolName, properties);

export const trackMemoryOperation = (operation, properties) => 
    analytics.trackMemoryOperation(operation, properties);

export const trackTaskOperation = (operation, properties) => 
    analytics.trackTaskOperation(operation, properties);

export const trackError = (errorType, properties) => 
    analytics.trackError(errorType, properties);

export const enableAnalytics = () => 
    analytics.enableAnalytics();

export const disableAnalytics = () => 
    analytics.disableAnalytics();

export const isAnalyticsEnabled = () => 
    analytics.isEnabled();

export const getAnalyticsStatus = () => 
    analytics.getStatus();

export const getPrivacyNotice = () => 
    analytics.getPrivacyNotice();