/**
 * Graphiti Knowledge Graph Client
 * TypeScript client for interfacing with the Python Graphiti service
 */

export interface Memory {
  id: string
  content: string
  tags?: string[]
  category?: string
  project?: string
  timestamp: string
}

export interface GraphQuery {
  query: string
  limit?: number
  filters?: Record<string, any>
}

export interface GraphResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface GraphStats {
  nodes: number
  relationships: number
  episodes: number
  last_updated: string
  status: string
}

export interface QueryResult {
  query: string
  results: any[]
  count: number
  timestamp: string
}

export class GraphitiClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl = 'http://localhost:8000', timeout = 30000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  /**
   * Check if the Graphiti service is available and healthy
   */
  async healthCheck(): Promise<GraphResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Graphiti health check failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Graphiti service unavailable'
      }
    }
  }

  /**
   * Add a single memory to the knowledge graph
   */
  async addMemory(memory: Memory): Promise<GraphResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/memories/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to add memory to knowledge graph:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to add memory to knowledge graph'
      }
    }
  }

  /**
   * Add multiple memories in batch
   */
  async addMemoriesBatch(memories: Memory[]): Promise<GraphResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/memories/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memories }),
        signal: AbortSignal.timeout(this.timeout * 2) // Longer timeout for batch operations
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to add memory batch to knowledge graph:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to add memory batch to knowledge graph'
      }
    }
  }

  /**
   * Query the knowledge graph
   */
  async queryGraph(query: GraphQuery): Promise<GraphResponse<QueryResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to query knowledge graph:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to query knowledge graph'
      }
    }
  }

  /**
   * Get knowledge graph statistics
   */
  async getGraphStats(): Promise<GraphResponse<GraphStats>> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get graph statistics:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get graph statistics'
      }
    }
  }

  /**
   * Create mock data for testing (development only) - DISABLED
   */
  async createMockData(): Promise<GraphResponse> {
    // Safeguard: Disable mock data creation to ensure only real memories
    console.warn('Mock data creation is disabled to ensure only real memories are stored')
    return {
      success: false,
      error: 'Mock data creation disabled',
      message: 'Mock data creation is disabled to ensure only real memories are stored'
    }
  }

  /**
   * Search memories using natural language queries
   */
  async searchMemories(searchQuery: string, limit = 10): Promise<GraphResponse<QueryResult>> {
    return this.queryGraph({
      query: searchQuery,
      limit,
      filters: {}
    })
  }

  /**
   * Find related memories for a given memory ID
   */
  async findRelatedMemories(memoryId: string, limit = 5): Promise<GraphResponse<QueryResult>> {
    return this.queryGraph({
      query: `Find memories related to memory with ID: ${memoryId}`,
      limit,
      filters: { exclude_id: memoryId }
    })
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(category: string, limit = 20): Promise<GraphResponse<QueryResult>> {
    return this.queryGraph({
      query: `Find all memories in category: ${category}`,
      limit,
      filters: { category }
    })
  }

  /**
   * Get memories by project
   */
  async getMemoriesByProject(project: string, limit = 20): Promise<GraphResponse<QueryResult>> {
    return this.queryGraph({
      query: `Find all memories in project: ${project}`,
      limit,
      filters: { project }
    })
  }

  /**
   * Find memory clusters or groups
   */
  async findMemoryClusters(): Promise<GraphResponse<QueryResult>> {
    return this.queryGraph({
      query: 'Find clusters of related memories and concepts',
      limit: 50,
      filters: { cluster_analysis: true }
    })
  }

  /**
   * Get memory timeline for a specific time period
   */
  async getMemoryTimeline(startDate: string, endDate: string): Promise<GraphResponse<QueryResult>> {
    return this.queryGraph({
      query: `Find memories created between ${startDate} and ${endDate}`,
      limit: 100,
      filters: { 
        start_date: startDate,
        end_date: endDate 
      }
    })
  }
}

// Export a default instance
export const graphitiClient = new GraphitiClient()

// Export utility functions
export const GraphitiUtils = {
  /**
   * Check if Graphiti service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const health = await graphitiClient.healthCheck()
      return health.success && health.data?.graphiti_available === true
    } catch {
      return false
    }
  },

  /**
   * Convert memory objects to Graphiti format
   */
  convertMemoryToGraphitiFormat(memory: any): Memory {
    return {
      id: memory.id,
      content: memory.content,
      tags: memory.tags || [],
      category: memory.category || 'general',
      project: memory.project || null,
      timestamp: memory.timestamp || new Date().toISOString()
    }
  },

  /**
   * Batch process memories for knowledge graph
   */
  async batchProcessMemories(memories: any[], batchSize = 10): Promise<void> {
    const graphitiMemories = memories.map(this.convertMemoryToGraphitiFormat)
    
    for (let i = 0; i < graphitiMemories.length; i += batchSize) {
      const batch = graphitiMemories.slice(i, i + batchSize)
      await graphitiClient.addMemoriesBatch(batch)
      
      // Small delay between batches to avoid overwhelming the service
      if (i + batchSize < graphitiMemories.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
}