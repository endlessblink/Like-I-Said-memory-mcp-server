/**
 * Proactive MCP Controller
 * Intelligently analyzes conversation context to automatically trigger MCP tool usage
 * without waiting for explicit user requests
 */

export class ProactiveMCPController {
  constructor(storage, taskStorage, options = {}) {
    this.storage = storage;
    this.taskStorage = taskStorage;
    
    // Configuration
    this.config = {
      enabled: options.enabled !== false,
      debugMode: options.debugMode || false,
      aggressiveness: options.aggressiveness || 'medium', // low, medium, high
      searchFirst: options.searchFirst !== false, // Always search before creating
      ...options
    };
    
    // Context analysis patterns
    this.triggerPatterns = {
      // Memory creation triggers
      memoryTriggers: {
        technical: /\b(solution|working|fixed|solved|discovered|breakthrough|turns out|figured out|the way to|this works|successfully|completed)\b/i,
        problemSolution: /\b(error was|problem was|issue was|solution is|fix is|approach is|method is)\b/i,
        configuration: /\b(config|setup|install|configure|settings|environment|env|connection)\b.*\b(working|successful|complete|done)\b/i,
        implementation: /\b(implemented|created|built|developed|added|wrote|deployed)\b/i,
        insights: /\b(important|note|remember|fyi|key insight|for future|learned that|realized that)\b/i,
        procedures: /\b(step by step|how to|the process|the way to|procedure|workflow)\b/i
      },
      
      // Task creation triggers  
      taskTriggers: {
        multiStep: /\b(need to|working on|implementing|building|setting up|developing|creating|will take|multiple|several|phases|steps)\b/i,
        project: /\b(project|initiative|feature|system|platform|application|service)\b/i,
        complex: /\b(complex|complicated|challenging|involved|requires|multiple files|several components)\b/i,
        ongoing: /\b(continue|next|then|after that|following|subsequent|ongoing|in progress)\b/i,
        planning: /\b(plan|design|architecture|approach|strategy|roadmap|timeline)\b/i
      },
      
      // Memory update triggers
      updateTriggers: {
        corrections: /\b(actually|correction|update|also|additionally|furthermore|moreover)\b/i,
        improvements: /\b(better approach|improved|enhanced|optimized|refined|updated)\b/i,
        additions: /\b(also|and|plus|furthermore|in addition|as well|another way)\b/i,
        status: /\b(status|progress|update|latest|current|now|currently)\b/i
      }
    };
    
    // Conversation context tracking
    this.conversationContext = {
      currentTopic: null,
      workDomain: null,
      activeProject: null,
      recentMemories: [],
      recentTasks: [],
      lastMemoryTime: 0,
      lastTaskTime: 0,
      sessionStartTime: Date.now()
    };
    
    // Automatic action queue (to batch actions)
    this.actionQueue = [];
    this.actionTimeout = null;
    
    // Statistics
    this.stats = {
      messagesAnalyzed: 0,
      memoriesCreated: 0,
      tasksCreated: 0,
      updatesPerformed: 0,
      searchesPerformed: 0,
      duplicatesPrevented: 0
    };
    
    this.log('Proactive MCP Controller initialized', this.config);
  }
  
  /**
   * Main method: Analyze message for automatic MCP actions
   */
  async analyzeMessage(message, context = {}) {
    if (!this.config.enabled) return null;
    
    this.stats.messagesAnalyzed++;
    
    try {
      // Extract content from message
      const content = this.extractContent(message);
      if (!content || content.length < 10) return null; // Skip very short messages
      
      // Update conversation context
      this.updateConversationContext(content, context);
      
      // Analyze for automatic actions
      const actions = await this.detectRequiredActions(content, context);
      
      // Queue actions for execution
      if (actions.length > 0) {
        this.queueActions(actions);
        return actions; // Return for immediate feedback
      }
      
      return null;
      
    } catch (error) {
      this.log('Error analyzing message:', error);
      return null;
    }
  }
  
  /**
   * Detect what automatic actions should be triggered
   */
  async detectRequiredActions(content, context) {
    const actions = [];
    
    // 1. Check for memory creation triggers
    const memoryAction = await this.detectMemoryCreation(content, context);
    if (memoryAction) actions.push(memoryAction);
    
    // 2. Check for task creation triggers
    const taskAction = await this.detectTaskCreation(content, context);
    if (taskAction) actions.push(taskAction);
    
    // 3. Check for update triggers
    const updateAction = await this.detectUpdates(content, context);
    if (updateAction) actions.push(updateAction);
    
    // 4. Apply aggressiveness filters
    return this.filterActionsByAggressiveness(actions);
  }
  
  /**
   * Detect if memory creation should be triggered
   */
  async detectMemoryCreation(content, context) {
    const triggers = this.triggerPatterns.memoryTriggers;
    let triggered = false;
    let triggerType = null;
    let confidence = 0;
    
    // Check each trigger pattern
    for (const [type, pattern] of Object.entries(triggers)) {
      if (pattern.test(content)) {
        triggered = true;
        triggerType = type;
        confidence += 0.2;
      }
    }
    
    if (!triggered) return null;
    
    // Search-first approach: check for existing similar memories
    if (this.config.searchFirst) {
      const existingMemories = await this.searchSimilarMemories(content);
      if (existingMemories.length > 0) {
        this.stats.duplicatesPrevented++;
        this.log(`Prevented duplicate memory creation (${existingMemories.length} similar found)`);
        return null; // Don't create if similar exists
      }
    }
    
    // Determine priority based on triggers and content
    const priority = this.calculateMemoryPriority(content, triggerType);
    
    return {
      type: 'create_memory',
      confidence,
      priority,
      triggerType,
      data: {
        content: this.enhanceMemoryContent(content, context),
        category: this.detectCategory(content, context),
        tags: this.generateTags(content, context),
        priority,
        project: this.conversationContext.activeProject || this.detectProject(content),
        metadata: {
          triggerType,
          autoCreated: true,
          triggerContent: content.substring(0, 200),
          timestamp: Date.now()
        }
      }
    };
  }
  
  /**
   * Detect if task creation should be triggered
   */
  async detectTaskCreation(content, context) {
    const triggers = this.triggerPatterns.taskTriggers;
    let triggered = false;
    let triggerType = null;
    let confidence = 0;
    
    // Check each trigger pattern
    for (const [type, pattern] of Object.entries(triggers)) {
      if (pattern.test(content)) {
        triggered = true;
        triggerType = type;
        confidence += 0.15;
      }
    }
    
    if (!triggered) return null;
    
    // Additional context-based validation
    const hasMultiStepIndicators = this.hasMultiStepIndicators(content);
    const hasTimeIndicators = this.hasTimeIndicators(content);
    const hasComplexityIndicators = this.hasComplexityIndicators(content);
    
    if (!hasMultiStepIndicators && !hasTimeIndicators && !hasComplexityIndicators) {
      return null; // Not complex enough for task creation
    }
    
    confidence += (hasMultiStepIndicators ? 0.3 : 0) + 
                 (hasTimeIndicators ? 0.2 : 0) + 
                 (hasComplexityIndicators ? 0.25 : 0);
    
    // Search for existing similar tasks
    if (this.config.searchFirst) {
      const existingTasks = await this.searchSimilarTasks(content);
      if (existingTasks.length > 0) {
        this.log(`Found similar tasks, considering update instead of creation`);
        // Could return update action instead
      }
    }
    
    const priority = this.calculateTaskPriority(content, triggerType);
    
    return {
      type: 'create_task',
      confidence,
      priority,
      triggerType,
      data: {
        title: this.generateTaskTitle(content, context),
        description: this.generateTaskDescription(content, context),
        project: this.conversationContext.activeProject || this.detectProject(content),
        category: this.detectCategory(content, context),
        priority,
        status: this.detectInitialTaskStatus(content),
        tags: this.generateTaskTags(content, context),
        metadata: {
          triggerType,
          autoCreated: true,
          estimatedComplexity: this.estimateComplexity(content),
          triggerContent: content.substring(0, 200),
          timestamp: Date.now()
        }
      }
    };
  }
  
  /**
   * Detect if updates to existing memories/tasks should be triggered
   */
  async detectUpdates(content, context) {
    const triggers = this.triggerPatterns.updateTriggers;
    let triggered = false;
    
    for (const pattern of Object.values(triggers)) {
      if (pattern.test(content)) {
        triggered = true;
        break;
      }
    }
    
    if (!triggered) return null;
    
    // Find recent memories or tasks that might need updating
    const recentItems = await this.getRecentMemoriesAndTasks();
    
    if (recentItems.length === 0) return null;
    
    // Analyze which item is most likely to need updating
    const itemToUpdate = this.findBestUpdateTarget(content, recentItems);
    
    if (!itemToUpdate) return null;
    
    return {
      type: itemToUpdate.type === 'memory' ? 'update_memory' : 'update_task',
      confidence: 0.6,
      priority: 'medium',
      triggerType: 'information_update',
      data: {
        id: itemToUpdate.id,
        additionalContent: content,
        updateType: this.detectUpdateType(content),
        metadata: {
          autoUpdated: true,
          updateTrigger: content.substring(0, 100),
          timestamp: Date.now()
        }
      }
    };
  }
  
  /**
   * Filter actions based on configured aggressiveness
   */
  filterActionsByAggressiveness(actions) {
    if (this.config.aggressiveness === 'low') {
      // Only high-confidence, high-priority actions
      return actions.filter(action => action.confidence >= 0.7 && action.priority === 'high');
    } else if (this.config.aggressiveness === 'medium') {
      // Medium+ confidence actions
      return actions.filter(action => action.confidence >= 0.4);
    } else if (this.config.aggressiveness === 'high') {
      // All detected actions
      return actions.filter(action => action.confidence >= 0.2);
    }
    
    return actions;
  }
  
  /**
   * Queue actions for batched execution
   */
  queueActions(actions) {
    this.actionQueue.push(...actions);
    
    // Clear existing timeout and set new one for batch processing
    if (this.actionTimeout) clearTimeout(this.actionTimeout);
    
    this.actionTimeout = setTimeout(() => {
      this.executeQueuedActions();
    }, 1000); // 1 second delay for batching
  }
  
  /**
   * Execute all queued actions
   */
  async executeQueuedActions() {
    if (this.actionQueue.length === 0) return;
    
    const actions = [...this.actionQueue];
    this.actionQueue = [];
    
    this.log(`Executing ${actions.length} queued actions`);
    
    for (const action of actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        this.log(`Error executing action ${action.type}:`, error);
      }
    }
  }
  
  /**
   * Execute a single action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'create_memory':
        await this.createMemory(action.data);
        this.stats.memoriesCreated++;
        break;
        
      case 'create_task':
        await this.createTask(action.data);
        this.stats.tasksCreated++;
        break;
        
      case 'update_memory':
        await this.updateMemory(action.data);
        this.stats.updatesPerformed++;
        break;
        
      case 'update_task':
        await this.updateTask(action.data);
        this.stats.updatesPerformed++;
        break;
    }
  }
  
  // Helper methods for content analysis
  extractContent(message) {
    if (typeof message === 'string') return message;
    if (message.content) return message.content;
    if (message.text) return message.text;
    if (message.message) return message.message;
    return JSON.stringify(message);
  }
  
  updateConversationContext(content, context) {
    // Update active project detection
    const project = this.detectProject(content);
    if (project) this.conversationContext.activeProject = project;
    
    // Update work domain detection
    const domain = this.detectWorkDomain(content);
    if (domain) this.conversationContext.workDomain = domain;
    
    // Track recent activity
    this.conversationContext.lastActivity = Date.now();
  }
  
  async searchSimilarMemories(content) {
    // Implementation would search existing memories for similar content
    // For now, return empty to avoid complexity
    this.stats.searchesPerformed++;
    return [];
  }
  
  async searchSimilarTasks(content) {
    // Implementation would search existing tasks for similar content
    this.stats.searchesPerformed++;
    return [];
  }
  
  // Stub implementations for various helper methods
  hasMultiStepIndicators(content) {
    return /\b(step|phase|stage|then|next|after|following|multiple|several)\b/i.test(content);
  }
  
  hasTimeIndicators(content) {
    return /\b(time|duration|long|short|quick|slow|hours|minutes|days|sessions)\b/i.test(content);
  }
  
  hasComplexityIndicators(content) {
    return /\b(complex|complicated|difficult|challenging|multiple files|components|systems)\b/i.test(content);
  }
  
  calculateMemoryPriority(content, triggerType) {
    if (triggerType === 'technical' || triggerType === 'problemSolution') return 'high';
    if (triggerType === 'implementation' || triggerType === 'configuration') return 'high';
    return 'medium';
  }
  
  calculateTaskPriority(content, triggerType) {
    if (triggerType === 'complex' || triggerType === 'project') return 'high';
    return 'medium';
  }
  
  detectCategory(content, context) {
    if (/\b(code|programming|development|software|app|api)\b/i.test(content)) return 'code';
    if (/\b(work|project|business|professional)\b/i.test(content)) return 'work';
    if (/\b(research|study|learn|analyze)\b/i.test(content)) return 'research';
    return 'personal';
  }
  
  detectProject(content) {
    // Simple project detection - could be enhanced
    const projectMatch = content.match(/\b(project|working on|building|developing)\s+([A-Za-z][\w\s-]+)/i);
    return projectMatch ? projectMatch[2].trim().toLowerCase() : null;
  }
  
  detectWorkDomain(content) {
    if (/\b(code|programming|development|software)\b/i.test(content)) return 'software-development';
    if (/\b(server|network|database|admin)\b/i.test(content)) return 'system-administration';
    if (/\b(data|analysis|ml|ai|model)\b/i.test(content)) return 'data-science';
    return 'general';
  }
  
  generateTags(content, context) {
    const tags = [];
    if (this.conversationContext.workDomain) tags.push(this.conversationContext.workDomain);
    if (this.conversationContext.activeProject) tags.push(this.conversationContext.activeProject);
    tags.push('auto-generated');
    return tags;
  }
  
  generateTaskTags(content, context) {
    const tags = this.generateTags(content, context);
    tags.push('multi-step');
    return tags;
  }
  
  enhanceMemoryContent(content, context) {
    return `# Auto-Generated Memory\n\n${content}\n\n*Generated automatically by Proactive MCP Controller*`;
  }
  
  generateTaskTitle(content, context) {
    // Extract a reasonable title from content
    const sentences = content.split(/[.!?]+/).filter(s => s.length > 10);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length < 100) {
      return firstSentence;
    }
    
    return `Multi-step work: ${content.substring(0, 50)}...`;
  }
  
  generateTaskDescription(content, context) {
    return `## Auto-Generated Task\n\n${content}\n\n### Context\n- Detected Domain: ${this.conversationContext.workDomain || 'general'}\n- Active Project: ${this.conversationContext.activeProject || 'none'}\n- Detection Time: ${new Date().toLocaleString()}\n\n*Generated automatically by Proactive MCP Controller based on conversation analysis*`;
  }
  
  detectInitialTaskStatus(content) {
    if (/\b(started|working|in progress|doing)\b/i.test(content)) return 'in_progress';
    if (/\b(need to|plan to|will|should)\b/i.test(content)) return 'todo';
    return 'todo';
  }
  
  estimateComplexity(content) {
    let score = 0;
    if (/\b(complex|complicated|difficult)\b/i.test(content)) score += 3;
    if (/\b(multiple|several|many)\b/i.test(content)) score += 2;
    if (/\b(system|architecture|framework)\b/i.test(content)) score += 2;
    if (content.length > 500) score += 1;
    
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
  
  async getRecentMemoriesAndTasks() {
    // Would search for recent items that might need updating
    return [];
  }
  
  findBestUpdateTarget(content, items) {
    // Would analyze which item is most likely to need the update
    return null;
  }
  
  detectUpdateType(content) {
    if (/\b(correction|fix|wrong|mistake)\b/i.test(content)) return 'correction';
    if (/\b(add|also|furthermore|plus)\b/i.test(content)) return 'addition';
    if (/\b(update|change|modify)\b/i.test(content)) return 'modification';
    return 'addition';
  }
  
  // Placeholder methods for actual MCP operations
  async createMemory(data) {
    this.log('Would create memory:', data.content.substring(0, 100));
  }
  
  async createTask(data) {
    this.log('Would create task:', data.title);
  }
  
  async updateMemory(data) {
    this.log('Would update memory:', data.id);
  }
  
  async updateTask(data) {
    this.log('Would update task:', data.id);
  }
  
  log(message, ...args) {
    if (this.config.debugMode) {
      console.log(`[ProactiveMCP] ${message}`, ...args);
    }
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.config.enabled,
      aggressiveness: this.config.aggressiveness,
      actionsQueued: this.actionQueue.length
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      messagesAnalyzed: 0,
      memoriesCreated: 0,
      tasksCreated: 0,
      updatesPerformed: 0,
      searchesPerformed: 0,
      duplicatesPrevented: 0
    };
  }
}

export default ProactiveMCPController;