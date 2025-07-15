/**
 * TaskDiscovery - Finds relevant tasks for a given memory
 * 
 * This module reverses the task-memory linking logic to find existing tasks
 * that might be related to a newly created memory.
 */

import { VectorStorage } from './vector-storage.js';

class TaskDiscovery {
  constructor(memoryStorage, taskStorage) {
    this.memoryStorage = memoryStorage;
    this.taskStorage = taskStorage;
    this.vectorStorage = new VectorStorage();
    this.stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might'
    ]);
  }

  /**
   * Find tasks that might be relevant to a given memory
   * @param {Object} memory - The memory to find relevant tasks for
   * @param {Object} analyzer - The memory task analyzer with analysis results
   * @returns {Array} Array of relevant tasks with relevance scores
   */
  async findRelevantTasks(memory, analyzer) {
    console.error(`[TaskDiscovery] Finding relevant tasks for memory: ${memory.id}`);
    
    try {
      // Get candidates from multiple search methods
      const keywordCandidates = await this.findKeywordCandidates(memory);
      const semanticCandidates = await this.findSemanticCandidates(memory);
      const contextCandidates = await this.findContextCandidates(memory);
      
      // Combine and deduplicate candidates
      const allCandidates = this.combineAndDeduplicateCandidates(
        keywordCandidates, 
        semanticCandidates, 
        contextCandidates
      );
      
      // Rank by relevance
      const ranked = await this.rankTasksByRelevance(allCandidates, memory);
      
      // Filter and limit results
      const relevant = ranked.filter(task => task.relevance > 0.3).slice(0, 5);
      
      console.error(`[TaskDiscovery] Found ${allCandidates.length} candidates, ${relevant.length} relevant tasks`);
      
      return relevant;
    } catch (error) {
      console.error('[TaskDiscovery] Error finding relevant tasks:', error);
      return [];
    }
  }

  /**
   * Find tasks using keyword matching
   * @param {Object} memory - The memory to search for
   * @returns {Array} Array of candidate tasks
   */
  async findKeywordCandidates(memory) {
    const tasks = await this.taskStorage.listTasks();
    const terms = this.extractSearchTermsFromMemory(memory);
    
    console.error(`[TaskDiscovery] Extracted terms from memory:`, terms);
    
    const candidates = [];
    
    for (const task of tasks) {
      let isCandidate = false;
      const matchedTerms = [];
      
      // Project match
      if (task.project === memory.project) {
        isCandidate = true;
        matchedTerms.push(`project:${memory.project}`);
      }
      
      // Category match
      if (task.category === memory.category) {
        isCandidate = true;
        matchedTerms.push(`category:${memory.category}`);
      }
      
      // Tag matches
      const taskTags = task.tags || [];
      const memoryTags = memory.tags || [];
      const commonTags = taskTags.filter(tag => memoryTags.includes(tag));
      if (commonTags.length > 0) {
        isCandidate = true;
        matchedTerms.push(...commonTags.map(tag => `tag:${tag}`));
      }
      
      // Keyword matches in task title and description
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      for (const keyword of terms.keywords) {
        if (taskText.includes(keyword.toLowerCase())) {
          isCandidate = true;
          matchedTerms.push(keyword);
        }
      }
      
      // Technical term matches
      for (const tech of terms.technical) {
        if (taskText.includes(tech)) {
          isCandidate = true;
          matchedTerms.push(`tech:${tech}`);
        }
      }
      
      // Status filtering - only match active tasks
      if (task.status === 'done') {
        continue; // Skip completed tasks unless explicitly looking for completion
      }
      
      // Time proximity (within 30 days for task discovery)
      const memoryDate = new Date(memory.timestamp);
      const taskDate = new Date(task.created);
      const daysDiff = Math.abs(memoryDate - taskDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 30) {
        isCandidate = true;
        matchedTerms.push(`time:${Math.round(daysDiff)}d`);
      }
      
      if (isCandidate) {
        candidates.push({
          ...task,
          matched_terms: [...new Set(matchedTerms)],
          keyword_match: true
        });
      }
    }
    
    return candidates;
  }

  /**
   * Find tasks using semantic search
   * @param {Object} memory - The memory to search for
   * @returns {Array} Array of candidate tasks
   */
  async findSemanticCandidates(memory) {
    try {
      // Check if vector storage has findRelevantTasks method
      if (typeof this.vectorStorage.findRelevantTasks !== 'function') {
        console.error('[TaskDiscovery] Vector storage does not have findRelevantTasks method');
        return [];
      }
      
      // Use vector storage to find semantically similar tasks
      const semanticResults = await this.vectorStorage.findRelevantTasks(memory, 10);
      
      const candidates = [];
      for (const result of semanticResults) {
        const task = await this.taskStorage.getTask(result.id);
        if (task) {
          candidates.push({
            ...task,
            semantic_score: result.relevance,
            matched_terms: ['semantic_match'],
            semantic_match: true
          });
        }
      }
      
      return candidates;
    } catch (error) {
      console.error('[TaskDiscovery] Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Find tasks based on context (same project, recent, etc.)
   * @param {Object} memory - The memory to search for
   * @returns {Array} Array of candidate tasks
   */
  async findContextCandidates(memory) {
    const candidates = [];
    
    // Get tasks from the same project
    if (memory.project) {
      const projectTasks = await this.taskStorage.getTasksByProject(memory.project);
      for (const task of projectTasks) {
        if (task.status !== 'done') {
          candidates.push({
            ...task,
            matched_terms: ['same_project'],
            context_match: true
          });
        }
      }
    }
    
    // Get recent tasks (last 7 days)
    const recentTasks = await this.taskStorage.listTasks({
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    for (const task of recentTasks) {
      if (task.status !== 'done') {
        candidates.push({
          ...task,
          matched_terms: ['recent'],
          context_match: true
        });
      }
    }
    
    return candidates;
  }

  /**
   * Combine and deduplicate candidate tasks
   * @param {Array} keywordCandidates - Tasks from keyword search
   * @param {Array} semanticCandidates - Tasks from semantic search
   * @param {Array} contextCandidates - Tasks from context search
   * @returns {Array} Combined and deduplicated candidates
   */
  combineAndDeduplicateCandidates(keywordCandidates, semanticCandidates, contextCandidates) {
    const candidateMap = new Map();
    
    // Add keyword candidates
    for (const candidate of keywordCandidates) {
      candidateMap.set(candidate.id, {
        ...candidate,
        keyword_match: true,
        semantic_match: false,
        context_match: false
      });
    }
    
    // Add semantic candidates (merge if already exists)
    for (const candidate of semanticCandidates) {
      if (candidateMap.has(candidate.id)) {
        const existing = candidateMap.get(candidate.id);
        candidateMap.set(candidate.id, {
          ...existing,
          semantic_match: true,
          semantic_score: candidate.semantic_score,
          matched_terms: [...(existing.matched_terms || []), ...candidate.matched_terms]
        });
      } else {
        candidateMap.set(candidate.id, {
          ...candidate,
          keyword_match: false,
          semantic_match: true,
          context_match: false
        });
      }
    }
    
    // Add context candidates (merge if already exists)
    for (const candidate of contextCandidates) {
      if (candidateMap.has(candidate.id)) {
        const existing = candidateMap.get(candidate.id);
        candidateMap.set(candidate.id, {
          ...existing,
          context_match: true,
          matched_terms: [...(existing.matched_terms || []), ...candidate.matched_terms]
        });
      } else {
        candidateMap.set(candidate.id, {
          ...candidate,
          keyword_match: false,
          semantic_match: false,
          context_match: true
        });
      }
    }
    
    return Array.from(candidateMap.values());
  }

  /**
   * Extract search terms from memory content
   * @param {Object} memory - Memory object to extract terms from
   * @returns {Object} Extracted terms
   */
  extractSearchTermsFromMemory(memory) {
    const text = `${memory.content} ${(memory.tags || []).join(' ')}`;
    
    // Extract technical terms (CamelCase, UPPERCASE)
    const techTerms = [];
    const camelCase = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
    const upperCase = text.match(/\b[A-Z]{2,}\b/g) || [];
    techTerms.push(...camelCase, ...upperCase);
    
    // Extract quoted strings
    const quoted = [];
    const doubleQuoted = text.match(/"([^"]+)"/g) || [];
    const singleQuoted = text.match(/'([^']+)'/g) || [];
    quoted.push(
      ...doubleQuoted.map(q => q.replace(/"/g, '')),
      ...singleQuoted.map(q => q.replace(/'/g, ''))
    );
    
    // Extract keywords (remove stop words, short words)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.stopWords.has(word));
    
    const keywords = [...new Set(words)];
    
    // Extract specific patterns
    const patterns = {
      actions: text.match(/\b(implement|fix|create|debug|test|deploy|build|refactor)\b/gi) || [],
      objects: text.match(/\b(function|class|method|api|endpoint|database|server)\b/gi) || [],
      states: text.match(/\b(working|completed|started|finished|blocked|todo)\b/gi) || []
    };
    
    return {
      technical: [...new Set(techTerms)],
      quoted: [...new Set(quoted)],
      keywords: keywords,
      patterns: patterns,
      all: [...new Set([...techTerms, ...quoted, ...keywords])]
    };
  }

  /**
   * Rank tasks by relevance to the memory
   * @param {Array} tasks - Candidate tasks
   * @param {Object} memory - Memory object
   * @returns {Array} Ranked tasks with relevance scores
   */
  async rankTasksByRelevance(tasks, memory) {
    return tasks.map(task => {
      let score = 0;
      const factors = [];
      
      // Semantic similarity (highest weight if available)
      if (task.semantic_score) {
        score += task.semantic_score * 0.35;
        factors.push(`semantic: ${(task.semantic_score * 100).toFixed(1)}%`);
      }
      
      // Project match
      if (task.project === memory.project) {
        score += 0.25;
        factors.push('same project');
      }
      
      // Category match
      if (task.category === memory.category) {
        score += 0.15;
        factors.push('same category');
      }
      
      // Tag overlap
      const taskTags = task.tags || [];
      const memoryTags = memory.tags || [];
      if (taskTags.length > 0 && memoryTags.length > 0) {
        const overlap = taskTags.filter(tag => memoryTags.includes(tag)).length;
        const tagScore = overlap / Math.max(taskTags.length, memoryTags.length);
        score += tagScore * 0.15;
        if (overlap > 0) factors.push(`${overlap} common tags`);
      }
      
      // Keyword matches
      const terms = this.extractSearchTermsFromMemory(memory);
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      let keywordMatches = 0;
      
      for (const keyword of terms.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (taskText.match(regex) || []).length;
        keywordMatches += matches;
      }
      
      if (keywordMatches > 0) {
        const keywordScore = Math.min(keywordMatches / 5, 1) * 0.12;
        score += keywordScore;
        factors.push(`${keywordMatches} keyword matches`);
      }
      
      // Technical term matches
      let techMatches = 0;
      for (const tech of terms.technical) {
        if (taskText.includes(tech)) {
          techMatches++;
        }
      }
      
      if (techMatches > 0) {
        score += (techMatches / Math.max(terms.technical.length, 1)) * 0.10;
        factors.push(`${techMatches} technical terms`);
      }
      
      // Time proximity bonus
      const memoryDate = new Date(memory.timestamp);
      const taskDate = new Date(task.created);
      const daysDiff = Math.abs(memoryDate - taskDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 1) {
        score += 0.08;
        factors.push('same day');
      } else if (daysDiff <= 7) {
        score += 0.06;
        factors.push('same week');
      } else if (daysDiff <= 30) {
        score += 0.04;
        factors.push('within month');
      }
      
      // Task status bonus (prefer active tasks)
      if (task.status === 'in_progress') {
        score += 0.05;
        factors.push('in progress');
      } else if (task.status === 'todo') {
        score += 0.03;
        factors.push('todo');
      } else if (task.status === 'blocked') {
        score += 0.02;
        factors.push('blocked');
      }
      
      // Priority bonus
      if (task.priority === 'urgent') {
        score += 0.04;
        factors.push('urgent');
      } else if (task.priority === 'high') {
        score += 0.03;
        factors.push('high priority');
      }
      
      // Hybrid match bonus
      const matchTypes = [task.keyword_match, task.semantic_match, task.context_match].filter(Boolean).length;
      if (matchTypes > 1) {
        score += 0.05;
        factors.push(`${matchTypes} match types`);
      }
      
      // Memory complexity bonus (complex memories might relate to complex tasks)
      if (memory.complexity && memory.complexity >= 3) {
        score += 0.02;
        factors.push('complex memory');
      }
      
      return {
        ...task,
        relevance: Math.min(score, 1.0),
        match_factors: factors
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Find the best matching task for a specific action
   * @param {string} action - The action type ('update', 'complete', 'block')
   * @param {Object} memory - The memory object
   * @param {Array} relevantTasks - Array of relevant tasks
   * @returns {Object|null} Best matching task or null
   */
  findBestTaskForAction(action, memory, relevantTasks) {
    if (!relevantTasks || relevantTasks.length === 0) {
      return null;
    }
    
    // Filter tasks based on action type
    const actionFilters = {
      update: (task) => task.status === 'todo' || task.status === 'in_progress',
      complete: (task) => task.status === 'in_progress' || task.status === 'todo',
      block: (task) => task.status === 'todo' || task.status === 'in_progress'
    };
    
    const filter = actionFilters[action];
    if (!filter) {
      return relevantTasks[0]; // Return highest relevance task
    }
    
    const filteredTasks = relevantTasks.filter(filter);
    return filteredTasks.length > 0 ? filteredTasks[0] : null;
  }

  /**
   * Check if a task already has a memory connection
   * @param {Object} task - Task object
   * @param {string} memoryId - Memory ID to check
   * @returns {boolean} True if connection exists
   */
  hasMemoryConnection(task, memoryId) {
    const connections = task.memory_connections || [];
    return connections.some(conn => conn.memory_id === memoryId);
  }
}

export { TaskDiscovery };