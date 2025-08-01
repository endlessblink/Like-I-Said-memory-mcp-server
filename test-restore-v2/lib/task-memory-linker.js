import { VectorStorage } from './vector-storage.js';

export class TaskMemoryLinker {
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

  async autoLinkMemories(task) {
    console.error(`[TaskMemoryLinker] Auto-linking memories for task: ${task.title}`);
    
    // Get candidates from both keyword and semantic search
    const keywordCandidates = await this.findCandidateMemories(task);
    const semanticCandidates = await this.findSemanticCandidates(task);
    
    // Combine and deduplicate candidates
    const allCandidates = this.combineAndDeduplicateCandidates(keywordCandidates, semanticCandidates);
    
    // Rank using hybrid approach
    const ranked = await this.rankByRelevance(allCandidates, task);
    const selected = ranked.filter(m => m.relevance > 0.3).slice(0, 5);
    
    console.error(`[TaskMemoryLinker] Found ${allCandidates.length} candidates (${keywordCandidates.length} keyword, ${semanticCandidates.length} semantic), selected ${selected.length} with relevance > 0.3`);
    
    return selected.map(memory => ({
      memory_id: memory.id,
      memory_serial: memory.serial || `MEM-${memory.id.substring(0, 6)}`,
      connection_type: this.determineConnectionType(memory, task),
      relevance: memory.relevance,
      matched_terms: memory.matched_terms || []
    }));
  }

  async findCandidateMemories(task) {
    const memories = await this.memoryStorage.listMemories();
    const terms = this.extractSearchTerms(task);
    
    console.error(`[TaskMemoryLinker] Extracted terms:`, terms);
    
    // Filter memories by various criteria
    const candidates = [];
    
    for (const memory of memories) {
      let isCandidate = false;
      const matchedTerms = [];
      
      // Project match
      if (memory.project === task.project) {
        isCandidate = true;
        matchedTerms.push(`project:${task.project}`);
      }
      
      // Category match
      if (memory.category === task.category) {
        isCandidate = true;
        matchedTerms.push(`category:${task.category}`);
      }
      
      // Tag matches
      const memoryTags = memory.tags || [];
      const taskTags = task.tags || [];
      const commonTags = memoryTags.filter(tag => taskTags.includes(tag));
      if (commonTags.length > 0) {
        isCandidate = true;
        matchedTerms.push(...commonTags.map(tag => `tag:${tag}`));
      }
      
      // Keyword matches in content
      const contentLower = memory.content.toLowerCase();
      for (const keyword of terms.keywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          isCandidate = true;
          matchedTerms.push(keyword);
        }
      }
      
      // Technical term matches
      for (const tech of terms.technical) {
        if (memory.content.includes(tech)) {
          isCandidate = true;
          matchedTerms.push(`tech:${tech}`);
        }
      }
      
      // Time proximity (last 14 days)
      const memoryDate = new Date(memory.timestamp);
      const taskDate = new Date(task.created);
      const daysDiff = Math.abs(taskDate - memoryDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 14) {
        isCandidate = true;
        matchedTerms.push(`time:${Math.round(daysDiff)}d`);
      }
      
      if (isCandidate) {
        candidates.push({
          ...memory,
          matched_terms: [...new Set(matchedTerms)]
        });
      }
    }
    
    return candidates;
  }

  async findSemanticCandidates(task) {
    try {
      const semanticResults = await this.vectorStorage.findRelevantMemories(task, 10);
      
      // Get full memory objects for semantic results
      const candidates = [];
      for (const result of semanticResults) {
        const memory = await this.memoryStorage.getMemory(result.id);
        if (memory) {
          candidates.push({
            ...memory,
            semantic_score: result.relevance,
            matched_terms: ['semantic_match']
          });
        }
      }
      
      return candidates;
    } catch (error) {
      console.error('[TaskMemoryLinker] Semantic search failed:', error);
      return [];
    }
  }

  combineAndDeduplicateCandidates(keywordCandidates, semanticCandidates) {
    const candidateMap = new Map();
    
    // Add keyword candidates
    for (const candidate of keywordCandidates) {
      candidateMap.set(candidate.id, {
        ...candidate,
        keyword_match: true,
        semantic_match: false
      });
    }
    
    // Add semantic candidates (merge if already exists)
    for (const candidate of semanticCandidates) {
      if (candidateMap.has(candidate.id)) {
        // Merge with existing candidate
        const existing = candidateMap.get(candidate.id);
        candidateMap.set(candidate.id, {
          ...existing,
          semantic_match: true,
          semantic_score: candidate.semantic_score,
          matched_terms: [...(existing.matched_terms || []), ...candidate.matched_terms]
        });
      } else {
        // Add new semantic candidate
        candidateMap.set(candidate.id, {
          ...candidate,
          keyword_match: false,
          semantic_match: true
        });
      }
    }
    
    return Array.from(candidateMap.values());
  }

  extractSearchTerms(task) {
    const text = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`;
    
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
      bugs: text.match(/\b(bug|issue|error|problem|fix|broken)\b/gi) || [],
      features: text.match(/\b(feature|implement|add|create|build)\b/gi) || [],
      improvements: text.match(/\b(improve|enhance|optimize|refactor)\b/gi) || []
    };
    
    return {
      technical: [...new Set(techTerms)],
      quoted: [...new Set(quoted)],
      keywords: keywords,
      patterns: patterns,
      all: [...new Set([...techTerms, ...quoted, ...keywords])]
    };
  }

  async rankByRelevance(memories, task) {
    return memories.map(memory => {
      let score = 0;
      const factors = [];
      
      // Semantic similarity (highest weight if available)
      if (memory.semantic_score) {
        score += memory.semantic_score * 0.40;
        factors.push(`semantic: ${(memory.semantic_score * 100).toFixed(1)}%`);
      }
      
      // Project match (adjusted weight)
      if (memory.project === task.project) {
        score += 0.25;
        factors.push('same project');
      }
      
      // Category match
      if (memory.category === task.category) {
        score += 0.15;
        factors.push('same category');
      }
      
      // Tag overlap
      const memoryTags = memory.tags || [];
      const taskTags = task.tags || [];
      if (memoryTags.length > 0 && taskTags.length > 0) {
        const overlap = memoryTags.filter(tag => taskTags.includes(tag)).length;
        const tagScore = overlap / Math.max(memoryTags.length, taskTags.length);
        score += tagScore * 0.15;
        if (overlap > 0) factors.push(`${overlap} common tags`);
      }
      
      // Keyword density (reduced weight with semantic search)
      const terms = this.extractSearchTerms(task);
      const contentLower = memory.content.toLowerCase();
      let keywordMatches = 0;
      
      for (const keyword of terms.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (contentLower.match(regex) || []).length;
        keywordMatches += matches;
      }
      
      if (keywordMatches > 0) {
        const keywordScore = Math.min(keywordMatches / 10, 1) * 0.10;
        score += keywordScore;
        factors.push(`${keywordMatches} keyword matches`);
      }
      
      // Technical term matches
      let techMatches = 0;
      for (const tech of terms.technical) {
        if (memory.content.includes(tech)) {
          techMatches++;
        }
      }
      
      if (techMatches > 0) {
        score += (techMatches / Math.max(terms.technical.length, 1)) * 0.08;
        factors.push(`${techMatches} technical terms`);
      }
      
      // Time proximity
      const memoryDate = new Date(memory.timestamp);
      const taskDate = new Date(task.created);
      const daysDiff = Math.abs(taskDate - memoryDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 1) {
        score += 0.08;
        factors.push('same day');
      } else if (daysDiff <= 7) {
        score += 0.06;
        factors.push('same week');
      } else if (daysDiff <= 14) {
        score += 0.04;
        factors.push('within 2 weeks');
      }
      
      // Content length bonus (longer memories might have more context)
      if (memory.content.length > 500) {
        score += 0.02;
        factors.push('detailed content');
      }
      
      // Complexity bonus
      if (memory.complexity && memory.complexity >= 3) {
        score += 0.02;
        factors.push('high complexity');
      }
      
      // Hybrid match bonus (found by both keyword and semantic search)
      if (memory.keyword_match && memory.semantic_match) {
        score += 0.05;
        factors.push('hybrid match');
      }
      
      return {
        ...memory,
        relevance: Math.min(score, 1.0),
        match_factors: factors
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }

  determineConnectionType(memory, task) {
    const content = memory.content.toLowerCase();
    const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
    
    // Check for specific connection types
    if (content.includes('research') || content.includes('investigation') || 
        content.includes('analysis') || content.includes('study')) {
      return 'research';
    }
    
    if (content.includes('implement') || content.includes('code') || 
        content.includes('function') || content.includes('class')) {
      return 'implementation';
    }
    
    if (content.includes('bug') || content.includes('fix') || 
        content.includes('error') || content.includes('issue')) {
      return 'bug_fix';
    }
    
    if (content.includes('design') || content.includes('architecture') || 
        content.includes('structure') || content.includes('pattern')) {
      return 'design';
    }
    
    if (content.includes('todo') || content.includes('task') || 
        content.includes('plan')) {
      return 'planning';
    }
    
    if (memory.category === task.category) {
      return 'category_match';
    }
    
    if (memory.project === task.project) {
      return 'project_context';
    }
    
    return 'reference';
  }

  async updateMemoryWithTaskConnection(memoryId, taskConnection) {
    const memory = await this.memoryStorage.getMemory(memoryId);
    if (!memory) return;
    
    // Initialize task_connections if not present
    if (!memory.task_connections) {
      memory.task_connections = [];
    }
    
    // Avoid duplicate connections
    const exists = memory.task_connections.some(tc => tc.task_id === taskConnection.task_id);
    if (!exists) {
      memory.task_connections.push(taskConnection);
      await this.memoryStorage.updateMemory(memory.id, memory);
    }
  }

  async createTaskCompletionMemory(task) {
    const linkedMemories = task.memory_connections || [];
    const memoryRefs = linkedMemories.map(lm => `- ${lm.memory_id} (${lm.connection_type})`).join('\n');
    
    const completionMemory = {
      content: `# Task Completed: ${task.title}

## Task Details
- **ID**: ${task.id}
- **Serial**: ${task.serial}
- **Project**: ${task.project}
- **Category**: ${task.category || 'general'}
- **Priority**: ${task.priority}
- **Created**: ${new Date(task.created).toLocaleDateString()}
- **Completed**: ${new Date().toLocaleDateString()}

## Description
${task.description || 'No description provided'}

## Subtasks
${task.subtasks && task.subtasks.length > 0 ? 
  task.subtasks.map(st => `- ${st}`).join('\n') : 
  'No subtasks'}

## Connected Memories
${memoryRefs || 'No connected memories'}

## Lessons Learned
[Add any insights or lessons learned from completing this task]

## Future Improvements
[Note any follow-up tasks or improvements identified]`,
      tags: [...(task.tags || []), 'task-completion', 'documentation', task.project],
      category: task.category || 'work',
      project: task.project,
      task_connections: [{
        task_id: task.id,
        task_serial: task.serial,
        connection_type: 'completion_record',
        created: new Date().toISOString()
      }]
    };
    
    return this.memoryStorage.saveMemory(completionMemory);
  }

  async getTaskContext(taskId, depth = 'direct') {
    const task = await this.taskStorage.getTask(taskId);
    if (!task) return null;
    
    const context = {
      task: task,
      direct_memories: [],
      related_tasks: [],
      related_memories: []
    };
    
    // Get directly connected memories
    for (const conn of task.memory_connections || []) {
      const memory = await this.memoryStorage.getMemory(conn.memory_id);
      if (memory) {
        context.direct_memories.push({
          ...memory,
          connection: conn
        });
      }
    }
    
    // Get manually linked memories
    for (const memoryId of task.manual_memories || []) {
      const memory = await this.memoryStorage.getMemory(memoryId);
      if (memory) {
        context.direct_memories.push({
          ...memory,
          connection: { type: 'manual', relevance: 1.0 }
        });
      }
    }
    
    if (depth === 'deep') {
      // Find related tasks (same project, similar tags)
      const allTasks = await this.taskStorage.listTasks({ project: task.project });
      context.related_tasks = allTasks
        .filter(t => t.id !== task.id)
        .filter(t => {
          const taskTags = new Set(task.tags || []);
          const otherTags = new Set(t.tags || []);
          const overlap = [...taskTags].filter(tag => otherTags.has(tag));
          return overlap.length > 0;
        })
        .slice(0, 5);
      
      // Find memories from related tasks
      const relatedMemoryIds = new Set();
      for (const relatedTask of context.related_tasks) {
        for (const conn of relatedTask.memory_connections || []) {
          relatedMemoryIds.add(conn.memory_id);
        }
      }
      
      for (const memoryId of relatedMemoryIds) {
        const memory = await this.memoryStorage.getMemory(memoryId);
        if (memory && !context.direct_memories.some(dm => dm.id === memory.id)) {
          context.related_memories.push(memory);
        }
      }
    }
    
    return context;
  }
}