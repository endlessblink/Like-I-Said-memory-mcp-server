import fs from 'fs';
import path from 'path';
import { UniversalEmbeddings } from './universal-embeddings.js';
import { settingsManager } from './settings-manager.js';

export class VectorStorage {
  constructor() {
    this.embedder = null;
    this.initialized = false;
    this.available = false; // Track if vector functionality is available
    this.vectorsPath = path.join(process.cwd(), 'vectors');
    this.memoryIndex = new Map(); // Simple in-memory vector index
    this.taskIndex = new Map();
    this.provider = 'none'; // Track which provider is being used
    this.ensureVectorDirectory();
  }

  ensureVectorDirectory() {
    if (!fs.existsSync(this.vectorsPath)) {
      fs.mkdirSync(this.vectorsPath, { recursive: true });
    }
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize UniversalEmbeddings
      this.embedder = new UniversalEmbeddings();
      const embeddingsAvailable = await this.embedder.initialize();
      
      if (!embeddingsAvailable) {
        console.error('[VectorStorage] No embedding providers available');
        this.available = false;
        this.initialized = true;
        this.provider = 'none';
        return;
      }
      
      this.available = true;
      this.provider = this.embedder.getProviderName();
      
      // Load existing vectors if available
      await this.loadVectorIndex();
      
      this.initialized = true;
      // Use stderr for logging to avoid breaking JSON-RPC protocol
      console.error(`[VectorStorage] Initialized with provider: ${this.provider}, available: ${this.available}`);
    } catch (error) {
      console.error('[VectorStorage] Failed to initialize:', error.message);
      // Continue without vector storage rather than failing
      this.available = false;
      this.initialized = true;
      this.provider = 'none';
    }
  }

  async generateEmbedding(text) {
    if (!this.available || !this.embedder) {
      throw new Error('Vector embeddings not available');
    }
    
    return await this.embedder.embed(text);
  }

  async loadVectorIndex() {
    try {
      const memoryIndexPath = path.join(this.vectorsPath, 'memory-index.json');
      const taskIndexPath = path.join(this.vectorsPath, 'task-index.json');
      
      if (fs.existsSync(memoryIndexPath)) {
        const data = JSON.parse(fs.readFileSync(memoryIndexPath, 'utf8'));
        this.memoryIndex = new Map(Object.entries(data));
      }
      
      if (fs.existsSync(taskIndexPath)) {
        const data = JSON.parse(fs.readFileSync(taskIndexPath, 'utf8'));
        this.taskIndex = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load vector index:', error);
    }
  }

  async saveVectorIndex() {
    try {
      const memoryIndexPath = path.join(this.vectorsPath, 'memory-index.json');
      const taskIndexPath = path.join(this.vectorsPath, 'task-index.json');
      
      fs.writeFileSync(memoryIndexPath, JSON.stringify(Object.fromEntries(this.memoryIndex)));
      fs.writeFileSync(taskIndexPath, JSON.stringify(Object.fromEntries(this.taskIndex)));
    } catch (error) {
      console.error('Failed to save vector index:', error);
    }
  }

  async addMemory(memory) {
    await this.initialize();
    if (!this.available) return; // Skip if vector functionality not available
    
    try {
      // Combine content for better semantic search
      const searchText = [
        memory.content,
        memory.category || '',
        (memory.tags || []).join(' '),
        memory.project || ''
      ].filter(Boolean).join(' ');
      
      const embedding = await this.generateEmbedding(searchText);
      
      this.memoryIndex.set(memory.id, {
        embedding: Array.from(embedding),
        metadata: {
          type: 'memory',
          category: memory.category || '',
          project: memory.project || '',
          tags: (memory.tags || []).join(','),
          created: memory.created || new Date().toISOString()
        },
        content: memory.content
      });
      
      await this.saveVectorIndex();
    } catch (error) {
      console.error('[VectorStorage] Failed to add memory to vector index:', error.message);
    }
  }

  async addTask(task) {
    await this.initialize();
    if (!this.available) return; // Skip if vector functionality not available
    
    try {
      // Combine task content for embedding
      const searchText = [
        task.title,
        task.description || '',
        task.project || '',
        task.category || '',
        (task.tags || []).join(' ')
      ].filter(Boolean).join(' ');
      
      const embedding = await this.generateEmbedding(searchText);
      
      this.taskIndex.set(task.id, {
        embedding: Array.from(embedding),
        metadata: {
          type: 'task',
          project: task.project || '',
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          created: task.created || new Date().toISOString()
        },
        content: searchText
      });
      
      await this.saveVectorIndex();
    } catch (error) {
      console.error('[VectorStorage] Failed to add task to vector index:', error.message);
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (this.embedder && this.embedder.cosineSimilarity) {
      return this.embedder.cosineSimilarity(vecA, vecB);
    }
    // Fallback implementation
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async searchSimilar(query, type = null, limit = 10) {
    await this.initialize();
    if (!this.available) return []; // Return empty array if vector functionality not available
    
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const candidates = [];
      const targetIndex = type === 'memory' ? this.memoryIndex : 
                        type === 'task' ? this.taskIndex : 
                        new Map([...this.memoryIndex, ...this.taskIndex]);
      
      for (const [id, data] of targetIndex) {
        if (type && data.metadata.type !== type) continue;
        
        const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
        candidates.push({
          id,
          score: 1 - similarity, // Convert similarity to distance
          metadata: data.metadata,
          document: data.content
        });
      }
      
      return candidates
        .sort((a, b) => a.score - b.score) // Sort by distance (lower is better)
        .slice(0, limit);
    } catch (error) {
      console.error('[VectorStorage] Failed to search similar:', error.message);
      return [];
    }
  }

  async findRelevantMemories(task, limit = 5) {
    const query = [
      task.title,
      task.description || '',
      task.project || '',
      (task.tags || []).join(' ')
    ].filter(Boolean).join(' ');
    
    const results = await this.searchSimilar(query, 'memory', limit * 2);
    
    // Filter and score results
    return results
      .filter(result => {
        // Boost score for same project
        if (result.metadata.project === task.project) {
          result.score *= 0.8; // Lower distance = higher similarity
        }
        
        // Filter by relevance threshold
        return result.score < 0.7; // ChromaDB uses distance, lower is better
      })
      .slice(0, limit)
      .map(result => ({
        id: result.id,
        relevance: 1 - result.score, // Convert distance to similarity
        metadata: result.metadata
      }));
  }

  async updateMemory(memory) {
    await this.initialize();
    if (!this.initialized) return;
    
    // Remove existing entry if it exists
    this.memoryIndex.delete(memory.id);
    
    // Add updated memory
    await this.addMemory(memory);
  }

  async updateTask(task) {
    await this.initialize();
    if (!this.initialized) return;
    
    // Remove existing entry if it exists
    this.taskIndex.delete(task.id);
    
    // Add updated task
    await this.addTask(task);
  }

  async deleteMemory(memoryId) {
    await this.initialize();
    if (!this.initialized) return;
    
    this.memoryIndex.delete(memoryId);
    await this.saveVectorIndex();
  }

  async deleteTask(taskId) {
    await this.initialize();
    if (!this.initialized) return;
    
    this.taskIndex.delete(taskId);
    await this.saveVectorIndex();
  }

  async rebuildIndex(memories, tasks) {
    await this.initialize();
    if (!this.available) return;
    
    // Clear existing indices
    this.memoryIndex.clear();
    this.taskIndex.clear();
    
    // Add all memories
    for (const memory of memories) {
      await this.addMemory(memory);
    }
    
    // Add all tasks
    for (const task of tasks) {
      await this.addTask(task);
    }
    
    // Use stderr for logging to avoid breaking JSON-RPC protocol
    console.error(`[VectorStorage] Rebuilt vector index with ${memories.length} memories and ${tasks.length} tasks`);
  }

  /**
   * Check if vector storage functionality is available
   * @returns {boolean} True if vector embeddings can be generated
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Get status information about vector storage
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      available: this.available,
      provider: this.provider,
      memoryCount: this.memoryIndex.size,
      taskCount: this.taskIndex.size,
      embeddingsProvider: this.embedder ? this.embedder.getProviderName() : 'none',
      settings: {
        enabled: settingsManager.getSetting('features.enableSemanticSearch'),
        provider: settingsManager.getSetting('features.semanticSearchProvider'),
        blockOnWindows: settingsManager.getSetting('features.blockXenovaOnWindows')
      }
    };
  }
}