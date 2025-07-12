# RAG Implementation Plan for Task-Memory Connections

## Overview
Implement a Retrieval-Augmented Generation (RAG) system to enable semantic search for memory-task connections.

## Architecture

### 1. Vector Database Options (Choose One)

#### Option A: ChromaDB (Recommended for simplicity)
```bash
npm install chromadb
```

```javascript
// lib/vector-store.js
import { ChromaClient } from 'chromadb';

class VectorStore {
  constructor() {
    this.client = new ChromaClient();
    this.collection = null;
  }

  async initialize() {
    this.collection = await this.client.getOrCreateCollection({
      name: "memories",
      metadata: { "hnsw:space": "cosine" }
    });
  }

  async addMemory(memory) {
    await this.collection.add({
      ids: [memory.id],
      documents: [memory.content],
      metadatas: [{
        project: memory.project,
        category: memory.category,
        tags: JSON.stringify(memory.tags),
        timestamp: memory.timestamp
      }]
    });
  }

  async searchSimilar(query, k = 5) {
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: k
    });
    return results;
  }
}
```

#### Option B: Pinecone (Cloud-based, more scalable)
```bash
npm install @pinecone-database/pinecone
```

#### Option C: Weaviate (Self-hosted, full-featured)
```bash
npm install weaviate-ts-client
```

### 2. Embedding Generation

#### Using OpenAI Embeddings
```javascript
// lib/embeddings.js
import { OpenAI } from 'openai';

class EmbeddingService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

#### Using Local Embeddings (No API needed)
```javascript
// lib/local-embeddings.js
import { pipeline } from '@xenova/transformers';

class LocalEmbeddingService {
  constructor() {
    this.pipe = null;
  }

  async initialize() {
    // Uses Hugging Face models locally
    this.pipe = await pipeline('feature-extraction', 
      'Xenova/all-MiniLM-L6-v2');
  }

  async generateEmbedding(text) {
    const output = await this.pipe(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }
}
```

### 3. Enhanced Task-Memory Linker

```javascript
// lib/enhanced-task-memory-linker.js
import { VectorStore } from './vector-store.js';
import { LocalEmbeddingService } from './local-embeddings.js';

export class EnhancedTaskMemoryLinker {
  constructor(storage, taskStorage) {
    this.storage = storage;
    this.taskStorage = taskStorage;
    this.vectorStore = new VectorStore();
    this.embeddings = new LocalEmbeddingService();
    this.initialized = false;
  }

  async initialize() {
    await this.vectorStore.initialize();
    await this.embeddings.initialize();
    
    // Index existing memories
    const memories = await this.storage.listMemories();
    for (const memory of memories) {
      await this.indexMemory(memory);
    }
    
    this.initialized = true;
  }

  async indexMemory(memory) {
    const embedding = await this.embeddings.generateEmbedding(
      `${memory.content} ${memory.tags?.join(' ') || ''}`
    );
    
    await this.vectorStore.addMemory({
      ...memory,
      embedding
    });
  }

  async autoLinkMemories(task) {
    if (!this.initialized) await this.initialize();
    
    // Generate query from task
    const query = `${task.title} ${task.description || ''} ${task.tags?.join(' ') || ''}`;
    
    // Semantic search
    const semanticResults = await this.vectorStore.searchSimilar(query, 10);
    
    // Combine with keyword matching for hybrid approach
    const keywordResults = await this.findCandidateMemories(task);
    
    // Merge and rank results
    const merged = this.mergeResults(semanticResults, keywordResults);
    
    return merged.slice(0, 5);
  }

  mergeResults(semantic, keyword) {
    const results = new Map();
    
    // Add semantic results with higher weight
    semantic.forEach((result, index) => {
      const score = (1 - index / semantic.length) * 0.7; // 70% weight
      results.set(result.id, {
        ...result,
        score,
        type: 'semantic'
      });
    });
    
    // Add keyword results
    keyword.forEach((result, index) => {
      const existing = results.get(result.id);
      const score = (1 - index / keyword.length) * 0.3; // 30% weight
      
      if (existing) {
        existing.score += score;
        existing.type = 'hybrid';
      } else {
        results.set(result.id, {
          ...result,
          score,
          type: 'keyword'
        });
      }
    });
    
    // Sort by combined score
    return Array.from(results.values())
      .sort((a, b) => b.score - a.score);
  }
}
```

### 4. Integration Steps

1. **Install Dependencies**
```bash
npm install chromadb @xenova/transformers
```

2. **Update server-markdown.js**
```javascript
import { EnhancedTaskMemoryLinker } from './lib/enhanced-task-memory-linker.js';

// Replace current linker
const taskMemoryLinker = new EnhancedTaskMemoryLinker(storage, taskStorage);

// Initialize on startup
await taskMemoryLinker.initialize();
```

3. **Update Memory Creation**
```javascript
// In add_memory handler
const memory = await storage.saveMemory(memoryData);
await taskMemoryLinker.indexMemory(memory);
```

### 5. Benefits & Examples

**Before (Keyword Matching):**
- Task: "Fix authentication issues"
- Finds: Memories with exact word "authentication"
- Misses: "login system broken", "JWT token problems"

**After (RAG System):**
- Task: "Fix authentication issues"
- Finds: 
  - "login system broken" (semantic: auth ≈ login)
  - "JWT token validation fails" (semantic: auth method)
  - "user session management" (semantic: auth concept)
  - "OAuth integration bugs" (semantic: auth type)

### 6. Performance Considerations

1. **Indexing Strategy**
   - Index memories on creation
   - Batch index existing memories
   - Background re-indexing for updates

2. **Caching**
   - Cache embeddings for common queries
   - Cache search results for repeated tasks

3. **Hybrid Approach**
   - Use semantic search for discovery
   - Use keyword search for precision
   - Combine scores for best results

### 7. Testing the Implementation

```javascript
// test-rag-search.js
const linker = new EnhancedTaskMemoryLinker(storage, taskStorage);
await linker.initialize();

// Test semantic understanding
const task = {
  title: "Implement user login",
  description: "Add authentication to the dashboard"
};

const memories = await linker.autoLinkMemories(task);
console.log('Found memories:', memories);
// Should find memories about auth, JWT, sessions, etc.
```

## Next Steps

1. Choose vector database (ChromaDB recommended for start)
2. Implement local embeddings (no API costs)
3. Create hybrid search system
4. Test with existing memories
5. Monitor performance and accuracy
6. Fine-tune weights and thresholds