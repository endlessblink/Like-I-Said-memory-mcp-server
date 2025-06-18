import type { Memory } from '../types'

const API_BASE = '/api'

/**
 * API service for memory management
 */
export class MemoryAPI {
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