import { Memory } from '@/types';

export interface PriorityScore {
  total: number;
  recency: number;
  relevance: number;
  interaction: number;
  importance: number;
  breakdown: {
    recencyWeight: number;
    relevanceWeight: number;
    interactionWeight: number;
    importanceWeight: number;
  };
}

export interface PriorityFactors {
  recencyWeight: number;
  relevanceWeight: number;
  interactionWeight: number;
  importanceWeight: number;
}

// Default priority weights - can be customized per user
export const DEFAULT_PRIORITY_WEIGHTS: PriorityFactors = {
  recencyWeight: 0.3,
  relevanceWeight: 0.25,
  interactionWeight: 0.25,
  importanceWeight: 0.2,
};

/**
 * Calculate recency score based on when memory was last accessed or created
 */
export function calculateRecencyScore(memory: Memory): number {
  const now = Date.now();
  const lastAccessed = memory.last_accessed ? new Date(memory.last_accessed).getTime() : 0;
  const created = new Date(memory.timestamp).getTime();
  const mostRecentTime = Math.max(lastAccessed, created);
  
  // Time decay function - newer items score higher
  const daysSinceAccess = (now - mostRecentTime) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: score = e^(-days/30) 
  // Items from today = ~1.0, 1 week = ~0.8, 1 month = ~0.37
  return Math.exp(-daysSinceAccess / 30);
}

/**
 * Calculate relevance score based on content analysis and tags
 */
export function calculateRelevanceScore(memory: Memory, searchQuery?: string, userContext?: string[]): number {
  let score = 0.5; // Base relevance score
  
  // Boost for search query relevance
  if (searchQuery && searchQuery.trim()) {
    const queryTerms = searchQuery.toLowerCase().split(/\s+/);
    const content = memory.content.toLowerCase();
    const title = memory.title?.toLowerCase() || '';
    
    queryTerms.forEach(term => {
      if (title.includes(term)) score += 0.3; // Title matches are highly relevant
      if (content.includes(term)) score += 0.1; // Content matches are moderately relevant
    });
  }
  
  // Boost for high-value content types
  const tags = memory.tags || [];
  if (tags.some(tag => ['important', 'critical', 'urgent'].includes(tag.toLowerCase()))) {
    score += 0.3;
  }
  
  if (tags.some(tag => ['solution', 'fix', 'working', 'complete'].includes(tag.toLowerCase()))) {
    score += 0.2;
  }
  
  // Code-related content often has high relevance
  if (memory.content.includes('```') || tags.some(tag => ['code', 'programming', 'dev'].includes(tag.toLowerCase()))) {
    score += 0.15;
  }
  
  // Clamp score to 0-1 range
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Calculate interaction score based on access frequency and user engagement
 */
export function calculateInteractionScore(memory: Memory): number {
  const accessCount = memory.access_count || 0;
  
  // Logarithmic scaling for access count
  // 1 access = 0.1, 5 accesses = 0.35, 10 accesses = 0.5, 50+ accesses = 0.8+
  const accessScore = Math.min(Math.log(accessCount + 1) / Math.log(50), 1);
  
  // Boost for recent interactions
  const lastAccessed = memory.last_accessed ? new Date(memory.last_accessed).getTime() : 0;
  const daysSinceAccess = (Date.now() - lastAccessed) / (1000 * 60 * 60 * 24);
  const recentInteractionBoost = daysSinceAccess < 7 ? 0.2 : 0;
  
  return Math.min(accessScore + recentInteractionBoost, 1);
}

/**
 * Calculate importance score based on content analysis and metadata
 */
export function calculateImportanceScore(memory: Memory): number {
  let score = 0.5; // Base importance
  
  const content = memory.content.toLowerCase();
  const tags = memory.tags || [];
  
  // High importance indicators
  const highImportanceTerms = [
    'important', 'critical', 'urgent', 'key', 'essential', 'vital',
    'remember', 'note', 'warning', 'error', 'bug', 'fix',
    'solution', 'breakthrough', 'discovery', 'insight'
  ];
  
  highImportanceTerms.forEach(term => {
    if (content.includes(term) || tags.some(tag => tag.toLowerCase().includes(term))) {
      score += 0.1;
    }
  });
  
  // Content length often correlates with importance
  const wordCount = memory.content.split(/\s+/).length;
  if (wordCount > 500) score += 0.1; // Detailed content
  if (wordCount > 1000) score += 0.1; // Very detailed content
  
  // Structured content (code, lists, etc.) often important
  if (memory.content.includes('```') || memory.content.includes('- ') || memory.content.includes('1. ')) {
    score += 0.15;
  }
  
  // Priority tag explicit importance
  if (memory.priority === 'high') score += 0.3;
  if (memory.priority === 'urgent') score += 0.4;
  
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Calculate comprehensive priority score for a memory
 */
export function calculatePriorityScore(
  memory: Memory, 
  weights: PriorityFactors = DEFAULT_PRIORITY_WEIGHTS,
  searchQuery?: string,
  userContext?: string[]
): PriorityScore {
  const recency = calculateRecencyScore(memory);
  const relevance = calculateRelevanceScore(memory, searchQuery, userContext);
  const interaction = calculateInteractionScore(memory);
  const importance = calculateImportanceScore(memory);
  
  const total = (
    recency * weights.recencyWeight +
    relevance * weights.relevanceWeight +
    interaction * weights.interactionWeight +
    importance * weights.importanceWeight
  );
  
  return {
    total,
    recency,
    relevance,
    interaction,
    importance,
    breakdown: weights
  };
}

/**
 * Sort memories by priority score
 */
export function sortMemoriesByPriority(
  memories: Memory[],
  weights?: PriorityFactors,
  searchQuery?: string,
  userContext?: string[]
): Memory[] {
  const memoriesWithScores = memories.map(memory => ({
    memory,
    score: calculatePriorityScore(memory, weights, searchQuery, userContext)
  }));
  
  // Sort by total score (descending)
  memoriesWithScores.sort((a, b) => b.score.total - a.score.total);
  
  return memoriesWithScores.map(item => item.memory);
}

/**
 * Get priority level based on score
 */
export function getPriorityLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Get priority color based on level
 */
export function getPriorityColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'critical': return 'text-red-500 bg-red-100 border-red-200';
    case 'high': return 'text-orange-500 bg-orange-100 border-orange-200';
    case 'medium': return 'text-yellow-500 bg-yellow-100 border-yellow-200';
    case 'low': return 'text-gray-500 bg-gray-100 border-gray-200';
    default: return 'text-gray-500 bg-gray-100 border-gray-200';
  }
}