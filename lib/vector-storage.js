// Removed @xenova/transformers - not needed
import fs from 'fs';
import path from 'path';

export class VectorStorage {
  constructor() {
    this.embedder = null;
    this.initialized = false;
    this.vectorsPath = path.join(process.cwd(), 'vectors');
    this.memoryIndex = new Map(); // Simple in-memory vector index
    this.taskIndex = new Map();
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
      // Initialize the embedding model
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      
      // Load existing vectors if available
      await this.loadVectorIndex();
      
      this.initialized = true;
      console.log('Vector storage initialized successfully with local embeddings');
    } catch (error) {
      console.error('Failed to initialize vector storage:', error);
      // Continue without vector storage rather than failing
      this.initialized = false;
    }
  }

  async generateEmbedding(text) {
    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }
    
    const result = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    
    return Array.from(result.data);
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
    if (!this.initialized) return; // Skip if initialization failed
    
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
  }

  async addTask(task) {
    await this.initialize();
    if (!this.initialized) return; // Skip if initialization failed
    
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
  }

  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async searchSimilar(query, type = null, limit = 10) {
    await this.initialize();
    if (!this.initialized) return [];
    
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
    if (!this.initialized) return;
    
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
    
    console.log(`Rebuilt vector index with ${memories.length} memories and ${tasks.length} tasks`);
  }
}