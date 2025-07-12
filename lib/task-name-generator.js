/**
 * Task Name Generator
 * Generates intelligent, meaningful task names based on content and context
 */

export class TaskNameGenerator {
  /**
   * Task type prefixes with emojis
   */
  static TASK_PREFIXES = {
    bug: '🐛 Fix',
    bugfix: '🐛 Fix',
    fix: '🐛 Fix',
    feature: '✨ Feature',
    feat: '✨ Feature',
    new: '✨ New',
    add: '✨ Add',
    implement: '💡 Implement',
    design: '🎨 Design',
    ui: '🎨 UI',
    ux: '🎨 UX',
    refactor: '♻️ Refactor',
    optimize: '⚡ Optimize',
    perf: '⚡ Performance',
    test: '🧪 Test',
    tests: '🧪 Tests',
    docs: '📝 Docs',
    documentation: '📝 Docs',
    research: '🔍 Research',
    investigate: '🔍 Investigate',
    analysis: '📊 Analyze',
    meeting: '👥 Meeting',
    review: '👀 Review',
    deploy: '🚀 Deploy',
    release: '🚀 Release',
    config: '⚙️ Config',
    setup: '⚙️ Setup',
    update: '🔄 Update',
    security: '🔒 Security',
    database: '🗄️ Database',
    api: '🔌 API',
    integration: '🔗 Integration'
  };

  /**
   * Priority indicators
   */
  static PRIORITY_INDICATORS = {
    urgent: '🚨',
    high: '⚠️',
    medium: '📌',
    low: '💭'
  };

  /**
   * Generate an intelligent task name from description and metadata
   */
  static generateTaskName(task) {
    const { title, description, category, priority, tags = [] } = task;
    
    // If title is already well-formed, enhance it
    if (title && title.length > 20 && !this.isGenericTitle(title)) {
      return this.enhanceTitle(title, category, priority);
    }
    
    // Generate from description if available
    if (description) {
      return this.generateFromDescription(description, category, priority, tags);
    }
    
    // Fallback to enhanced title
    return this.enhanceTitle(title || 'New Task', category, priority);
  }

  /**
   * Check if title is generic
   */
  static isGenericTitle(title) {
    const genericPatterns = [
      /^task\s*\d*$/i,
      /^new\s+task$/i,
      /^todo$/i,
      /^untitled$/i,
      /^test$/i
    ];
    
    return genericPatterns.some(pattern => pattern.test(title.trim()));
  }

  /**
   * Check if title already has a prefix
   */
  static hasExistingPrefix(title) {
    // Check for emoji patterns that indicate existing prefixes
    const existingPrefixPatterns = [
      /^[🐛✨🎨♻️⚡🧪📝🔍📊👥👀🚀⚙️🔄🔒🗄️🔌🔗]/,
      /^(⚠️|🚨)\s*[🐛✨🎨♻️⚡🧪📝🔍📊👥👀🚀⚙️🔄🔒🗄️🔌🔗]/,
      /^[🐛✨🎨♻️⚡🧪📝🔍📊👥👀🚀⚙️🔄🔒🗄️🔌🔗].*?:/
    ];
    
    return existingPrefixPatterns.some(pattern => pattern.test(title));
  }

  /**
   * Enhance existing title with prefix and formatting (safe version)
   */
  static enhanceTitle(title, category, priority) {
    // If title already has a prefix, don't add another one
    if (this.hasExistingPrefix(title)) {
      return title;
    }
    
    // Extract task type from title
    const taskType = this.detectTaskType(title);
    const prefix = this.TASK_PREFIXES[taskType] || this.getCategoryPrefix(category);
    
    // Clean the title
    let cleanTitle = this.cleanTitle(title, taskType);
    
    // Add priority indicator for high/urgent tasks
    const priorityPrefix = (priority === 'urgent' || priority === 'high') 
      ? this.PRIORITY_INDICATORS[priority] + ' ' 
      : '';
    
    // Combine elements
    return `${priorityPrefix}${prefix}: ${cleanTitle}`;
  }

  /**
   * Generate title from description
   */
  static generateFromDescription(description, category, priority, tags) {
    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(description);
    
    // Detect task type from description
    const taskType = this.detectTaskType(description) || this.detectTaskTypeFromTags(tags);
    const prefix = this.TASK_PREFIXES[taskType] || this.getCategoryPrefix(category);
    
    // Build title from key phrases
    let title = this.buildTitleFromPhrases(keyPhrases, 50);
    
    // Add priority indicator
    const priorityPrefix = (priority === 'urgent' || priority === 'high') 
      ? this.PRIORITY_INDICATORS[priority] + ' ' 
      : '';
    
    return `${priorityPrefix}${prefix}: ${title}`;
  }

  /**
   * Detect task type from text
   */
  static detectTaskType(text) {
    const lowerText = text.toLowerCase();
    
    // Check for bug indicators
    if (/\b(bug|error|issue|problem|broken|crash|fail)/i.test(text)) {
      return 'bug';
    }
    
    // Check for feature indicators
    if (/\b(feature|new|add|create|implement)/i.test(text)) {
      return 'feature';
    }
    
    // Check for other types
    for (const [key, _] of Object.entries(this.TASK_PREFIXES)) {
      if (new RegExp(`\\b${key}\\b`, 'i').test(text)) {
        return key;
      }
    }
    
    return null;
  }

  /**
   * Detect task type from tags
   */
  static detectTaskTypeFromTags(tags) {
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      if (this.TASK_PREFIXES[lowerTag]) {
        return lowerTag;
      }
    }
    return null;
  }

  /**
   * Get category-based prefix
   */
  static getCategoryPrefix(category) {
    const categoryPrefixes = {
      code: '💻 Code',
      work: '💼 Work',
      personal: '👤 Personal',
      research: '🔍 Research'
    };
    
    return categoryPrefixes[category] || '📋 Task';
  }

  /**
   * Clean title by removing redundant task type words
   */
  static cleanTitle(title, detectedType) {
    if (!detectedType) return title;
    
    // Remove the detected type word from the beginning
    const typePattern = new RegExp(`^(${detectedType}:?\\s*|${this.TASK_PREFIXES[detectedType]}:?\\s*)`, 'i');
    let cleaned = title.replace(typePattern, '');
    
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    return cleaned.trim();
  }

  /**
   * Extract key phrases from description
   */
  static extractKeyPhrases(description) {
    // Remove common words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'need', 'needs'
    ]);
    
    // Split into sentences
    const sentences = description.split(/[.!?]+/);
    const firstSentence = sentences[0] || description;
    
    // Extract important words
    const words = firstSentence.split(/\s+/)
      .filter(word => {
        const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleaned.length > 2 && !stopWords.has(cleaned);
      });
    
    return words;
  }

  /**
   * Build title from key phrases
   */
  static buildTitleFromPhrases(phrases, maxLength) {
    if (phrases.length === 0) return 'New Task';
    
    // Take first few key phrases
    let title = phrases.slice(0, 5).join(' ');
    
    // Truncate if too long
    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }
    
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  /**
   * Generate a serial number with more meaning
   */
  static generateSerial(project, taskCount, category) {
    // Use project code (3 chars)
    const projectCode = project.substring(0, 3).toUpperCase();
    
    // Use category code (1 char)
    const categoryCode = (category || 'general').charAt(0).toUpperCase();
    
    // Pad task count
    const paddedCount = (taskCount + 1).toString().padStart(4, '0');
    
    return `${projectCode}-${categoryCode}${paddedCount}`;
  }
}