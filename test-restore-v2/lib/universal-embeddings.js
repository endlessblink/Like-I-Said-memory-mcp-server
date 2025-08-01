/**
 * Universal Embeddings Provider
 * Provides embeddings through multiple backends without native dependencies
 */

import { OllamaEmbeddings } from './ollama-embeddings.js';
import { optionalImport } from './optional-import.js';
import { settingsManager } from './settings-manager.js';

export class UniversalEmbeddings {
  constructor() {
    this.provider = null;
    this.providerName = 'none';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this.provider !== null;

    try {
      const semanticSearchEnabled = settingsManager.getSetting('features.enableSemanticSearch');
      if (!semanticSearchEnabled) {
        console.error('[UniversalEmbeddings] Semantic search disabled in settings');
        return false;
      }

      const preferredProvider = settingsManager.getSetting('features.semanticSearchProvider');
      
      // Try providers in order of preference
      const providers = this.getProviderOrder(preferredProvider);
      
      for (const providerName of providers) {
        const success = await this.tryProvider(providerName);
        if (success) {
          this.providerName = providerName;
          this.initialized = true;
          console.error(`[UniversalEmbeddings] Using ${providerName} for embeddings`);
          return true;
        }
      }

      console.error('[UniversalEmbeddings] No embedding providers available');
      this.initialized = true;
      return false;
    } catch (error) {
      console.error('[UniversalEmbeddings] Initialization error:', error);
      this.initialized = true;
      return false;
    }
  }

  getProviderOrder(preferred) {
    const providers = ['ollama', 'xenova', 'none'];
    if (preferred && providers.includes(preferred)) {
      // Put preferred provider first
      return [preferred, ...providers.filter(p => p !== preferred)];
    }
    return providers;
  }

  async tryProvider(name) {
    try {
      switch (name) {
        case 'ollama':
          const ollama = new OllamaEmbeddings();
          const ollamaReady = await ollama.initialize();
          if (ollamaReady) {
            this.provider = ollama;
            return true;
          }
          break;

        case 'xenova':
          // Only try xenova if not on Windows or if explicitly enabled
          const blockOnWindows = settingsManager.getSetting('features.blockXenovaOnWindows');
          if (process.platform === 'win32' && blockOnWindows) {
            console.error('[UniversalEmbeddings] Skipping xenova on Windows');
            return false;
          }

          const transformers = await optionalImport('@xenova/transformers', {
            fallback: null,
            onError: (error) => {
              console.error('[UniversalEmbeddings] Failed to load @xenova/transformers:', error.message);
            }
          });

          if (transformers) {
            // Create a minimal xenova wrapper
            this.provider = {
              available: true,
              isAvailable: () => true,
              embed: async (text) => {
                // Use transformers to create embeddings
                const { pipeline } = transformers;
                const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                const output = await extractor(text, { pooling: 'mean', normalize: true });
                return Array.from(output.data);
              },
              embedBatch: async (texts) => {
                const embeddings = [];
                for (const text of texts) {
                  const embedding = await this.provider.embed(text);
                  embeddings.push(embedding);
                }
                return embeddings;
              }
            };
            return true;
          }
          break;
      }
    } catch (error) {
      console.error(`[UniversalEmbeddings] Failed to initialize ${name}:`, error.message);
    }
    return false;
  }

  async embed(text) {
    if (!this.provider) {
      throw new Error('No embedding provider available');
    }
    return this.provider.embed(text);
  }

  async embedBatch(texts) {
    if (!this.provider) {
      throw new Error('No embedding provider available');
    }
    return this.provider.embedBatch(texts);
  }

  isAvailable() {
    return this.provider !== null && this.provider.isAvailable();
  }

  getProviderName() {
    return this.providerName;
  }

  // Compute cosine similarity between two embeddings
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}