/**
 * Ollama Embeddings Provider
 * Uses Ollama's embedding models for semantic search without native dependencies
 */

import { OllamaClient } from './ollama-client.js';

export class OllamaEmbeddings {
  constructor(options = {}) {
    this.client = new OllamaClient(options.baseUrl, {
      model: options.model || 'nomic-embed-text', // Popular embedding model
      ...options
    });
    this.available = false;
    this.embeddingDimension = 768; // Default for nomic-embed-text
  }

  async initialize() {
    try {
      // Check if Ollama is available
      const isAvailable = await this.client.isAvailable();
      if (!isAvailable) {
        console.error('[OllamaEmbeddings] Ollama server not available');
        return false;
      }

      // Check if embedding model is available
      const models = await this.client.listModels();
      const embeddingModels = ['nomic-embed-text', 'all-minilm', 'llama3.2'];
      
      this.availableModel = models.find(m => embeddingModels.includes(m.name));
      if (!this.availableModel) {
        console.error('[OllamaEmbeddings] No embedding models found. Install with: ollama pull nomic-embed-text');
        return false;
      }

      this.available = true;
      console.error(`[OllamaEmbeddings] Initialized with model: ${this.availableModel.name}`);
      return true;
    } catch (error) {
      console.error('[OllamaEmbeddings] Initialization failed:', error.message);
      return false;
    }
  }

  async embed(text) {
    if (!this.available) {
      throw new Error('Ollama embeddings not available');
    }

    try {
      const response = await fetch(`${this.client.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.availableModel.name,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('[OllamaEmbeddings] Embedding error:', error);
      throw error;
    }
  }

  async embedBatch(texts) {
    // Ollama doesn't support batch embeddings natively, so we process sequentially
    // This is still better than loading a huge model in-process
    const embeddings = [];
    for (const text of texts) {
      try {
        const embedding = await this.embed(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error('[OllamaEmbeddings] Failed to embed text:', error);
        embeddings.push(null);
      }
    }
    return embeddings;
  }

  isAvailable() {
    return this.available;
  }
}