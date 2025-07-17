import type { Memory } from '../types'

const API_BASE = '/api'

interface QualityValidation {
  score: number
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  issues: string[]
  suggestions: string[]
  meetsStandards: boolean
}

/**
 * API service for memory management
 */
export class MemoryAPI {
  /**
   * Validate memory quality
   */
  static async validateQuality(content: string): Promise<QualityValidation> {
    // Create a temporary memory object for validation
    const tempMemory: Memory = {
      id: 'temp',
      timestamp: new Date().toISOString(),
      content,
      tags: [],
      category: 'personal',
      complexity: 1,
      project: 'default',
      priority: 'medium',
      status: 'active',
      metadata: {}
    }
    
    try {
      const response = await fetch(`${API_BASE}/quality/validate/temp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempMemory)
      })
      
      if (!response.ok) {
        // Return default validation if endpoint fails
        return {
          score: 0,
          level: 'critical',
          issues: ['Could not validate quality'],
          suggestions: [],
          meetsStandards: false
        }
      }
      
      const data = await response.json()
      return data.quality
    } catch (error) {
      console.error('Quality validation failed:', error)
      // Return default validation if error
      return {
        score: 0,
        level: 'critical',
        issues: ['Could not validate quality'],
        suggestions: [],
        meetsStandards: false
      }
    }
  }
  /**
   * Load all memories
   */
  static async loadMemories(): Promise<Memory[]> {
    try {
      const response = await fetch(`${API_BASE}/memories`)
      if (!response.ok) {
        throw new Error(`Failed to load memories: ${response.status}`)
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Failed to load memories:', error)
      throw error
    }
  }

  /**
   * Add a new memory
   */
  static async addMemory(content: string, tags: string[]): Promise<void> {
    if (!content.trim()) {
      throw new Error('Memory content cannot be empty')
    }

    // Safeguard: Reject mock data patterns
    const mockDataPatterns = [
      /mock-\d+/i,
      /test.*data/i,
      /sample.*content/i,
      /lorem ipsum/i,
      /fake.*data/i,
      /placeholder/i
    ];
    
    const containsMockPattern = mockDataPatterns.some(pattern => 
      pattern.test(content) || 
      (Array.isArray(tags) && tags.some(tag => pattern.test(tag)))
    );
    
    if (containsMockPattern) {
      throw new Error('Invalid memory: Mock data patterns detected. Only real memories are allowed.');
    }

    // Safeguard: Validate real content requirements
    if (content.trim().length < 10) {
      throw new Error('Invalid memory: Content must be at least 10 characters long for real memories');
    }

    const memory = {
      content: content.trim(),
      tags: tags.filter(Boolean)
    }

    try {
      const response = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory)
      })

      if (!response.ok) {
        throw new Error(`Failed to add memory: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to add memory:', error)
      throw error
    }
  }

  /**
   * Update an existing memory
   */
  static async updateMemory(id: string, content: string, tags: string[]): Promise<void> {
    if (!content.trim()) {
      throw new Error('Memory content cannot be empty')
    }

    const memory = {
      content: content.trim(),
      tags: tags.filter(Boolean)
    }

    try {
      const response = await fetch(`${API_BASE}/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory)
      })

      if (!response.ok) {
        throw new Error(`Failed to update memory: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to update memory:', error)
      throw error
    }
  }

  /**
   * Delete a memory
   */
  static async deleteMemory(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/memories/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete memory: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      throw error
    }
  }
}