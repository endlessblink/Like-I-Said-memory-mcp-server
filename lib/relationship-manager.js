#!/usr/bin/env node

/**
 * Relationship Management System
 * 
 * Manages connections between memories and tasks, providing the missing
 * relationship visualization and linking capabilities.
 */

import fs from 'fs-extra';
import path from 'path';

class RelationshipManager {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
    this.relationshipFile = 'relationships.json';
    this.relationships = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load existing relationships
      if (await this.storage.exists(this.relationshipFile)) {
        const data = await this.storage.readFile(this.relationshipFile);
        const relationships = JSON.parse(data);
        
        // Convert array to Map for fast lookups
        for (const rel of relationships) {
          const key = `${rel.from_id}:${rel.to_id}`;
          this.relationships.set(key, rel);
        }
      }
      
      console.log(`🔗 Loaded ${this.relationships.size} relationships`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize relationships:', error.message);
      this.relationships = new Map();
      this.initialized = true;
    }
  }

  /**
   * Link two items together
   */
  async linkItems(fromId, toId, type = 'related', metadata = {}) {
    await this.initialize();

    const relationship = {
      id: this.generateId(),
      from_id: fromId,
      to_id: toId,
      type: type, // 'related', 'blocks', 'implements', 'references', 'caused_by'
      created: new Date().toISOString(),
      metadata: metadata
    };

    const key = `${fromId}:${toId}`;
    this.relationships.set(key, relationship);
    
    // Also create reverse link for bidirectional lookup
    const reverseKey = `${toId}:${fromId}`;
    const reverseRelationship = {
      ...relationship,
      id: this.generateId(),
      from_id: toId,
      to_id: fromId,
      type: this.getReverseType(type),
      metadata: { ...metadata, reverse_link: true }
    };
    this.relationships.set(reverseKey, reverseRelationship);

    await this.saveRelationships();
    
    return {
      success: true,
      message: `✅ Linked ${fromId} → ${toId} (${type})`,
      relationship
    };
  }

  /**
   * Get all items connected to a given item
   */
  async getConnections(itemId) {
    await this.initialize();

    const connections = [];
    for (const [key, relationship] of this.relationships) {
      if (relationship.from_id === itemId && !relationship.metadata?.reverse_link) {
        connections.push(relationship);
      }
    }

    return connections;
  }

  /**
   * Find related items based on content similarity
   */
  async getRelatedItems(itemId, itemType, itemContent) {
    await this.initialize();

    // First get direct connections
    const directConnections = await this.getConnections(itemId);
    
    // Then find content-based suggestions
    const contentRelated = await this.findContentBasedRelations(itemContent, itemType);
    
    // Remove the item itself and already connected items
    const connectedIds = new Set([itemId, ...directConnections.map(c => c.to_id)]);
    const suggestions = contentRelated.filter(item => !connectedIds.has(item.id));

    return {
      direct_connections: directConnections,
      suggested_connections: suggestions.slice(0, 5), // Top 5 suggestions
      total_connected: directConnections.length,
      total_suggested: suggestions.length
    };
  }

  /**
   * Get visual graph data for relationship visualization
   */
  async getConnectionGraph(projectFilter = null) {
    await this.initialize();

    const nodes = new Map();
    const edges = [];

    // Get all memories and tasks to build nodes
    const memoryStorage = this.storage.memoryStorage || this.storage;
    const taskStorage = this.storage.taskStorage || this.storage;

    try {
      // Get memories
      const memories = await memoryStorage.listMemories(projectFilter ? { project: projectFilter } : {});
      for (const memory of memories) {
        nodes.set(memory.id, {
          id: memory.id,
          type: 'memory',
          label: this.truncateText(memory.content, 50),
          project: memory.project,
          created: memory.timestamp,
          size: this.calculateNodeSize(memory.content)
        });
      }

      // Get tasks  
      const tasks = await taskStorage.listTasks(projectFilter ? { project: projectFilter } : {});
      for (const task of tasks) {
        nodes.set(task.id, {
          id: task.id,
          type: 'task',
          label: task.title,
          project: task.project,
          created: task.created,
          status: task.status,
          size: this.calculateNodeSize(task.description || task.title)
        });
      }

      // Get connections
      for (const [key, relationship] of this.relationships) {
        if (!relationship.metadata?.reverse_link) {
          const fromNode = nodes.get(relationship.from_id);
          const toNode = nodes.get(relationship.to_id);
          
          if (fromNode && toNode) {
            // Apply project filter if specified
            if (!projectFilter || fromNode.project === projectFilter || toNode.project === projectFilter) {
              edges.push({
                id: relationship.id,
                from: relationship.from_id,
                to: relationship.to_id,
                type: relationship.type,
                created: relationship.created
              });
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to build connection graph:', error.message);
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: edges,
      stats: {
        total_nodes: nodes.size,
        total_edges: edges.length,
        memory_nodes: Array.from(nodes.values()).filter(n => n.type === 'memory').length,
        task_nodes: Array.from(nodes.values()).filter(n => n.type === 'task').length
      }
    };
  }

  /**
   * Auto-suggest links based on content similarity
   */
  async autoSuggestLinks(itemId, itemType, itemContent, maxSuggestions = 5) {
    const related = await this.findContentBasedRelations(itemContent, itemType);
    const existingConnections = await this.getConnections(itemId);
    const connectedIds = new Set([itemId, ...existingConnections.map(c => c.to_id)]);
    
    const suggestions = related
      .filter(item => !connectedIds.has(item.id))
      .slice(0, maxSuggestions)
      .map(item => ({
        id: item.id,
        type: item.type,
        title: item.title || this.truncateText(item.content, 50),
        similarity_score: item.similarity || 0.5,
        suggested_link_type: this.suggestLinkType(itemType, item.type, itemContent, item.content)
      }));

    return suggestions;
  }

  /**
   * Find content-based relationships using simple keyword matching
   */
  async findContentBasedRelations(content, sourceType) {
    const related = [];
    const keywords = this.extractKeywords(content);
    
    try {
      const memoryStorage = this.storage.memoryStorage || this.storage;
      const taskStorage = this.storage.taskStorage || this.storage;

      // Search memories
      const memories = await memoryStorage.listMemories();
      for (const memory of memories) {
        const similarity = this.calculateSimilarity(keywords, this.extractKeywords(memory.content));
        if (similarity > 0.3) {
          related.push({
            id: memory.id,
            type: 'memory',
            content: memory.content,
            similarity,
            project: memory.project
          });
        }
      }

      // Search tasks
      const tasks = await taskStorage.listTasks();
      for (const task of tasks) {
        const taskContent = `${task.title} ${task.description || ''}`;
        const similarity = this.calculateSimilarity(keywords, this.extractKeywords(taskContent));
        if (similarity > 0.3) {
          related.push({
            id: task.id,
            type: 'task',
            title: task.title,
            content: taskContent,
            similarity,
            project: task.project
          });
        }
      }

    } catch (error) {
      console.error('❌ Failed to find content relations:', error.message);
    }

    return related.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Extract keywords from content for similarity matching
   */
  extractKeywords(content) {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'will'].includes(word));
  }

  /**
   * Calculate content similarity using keyword overlap
   */
  calculateSimilarity(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Suggest appropriate link type based on content
   */
  suggestLinkType(sourceType, targetType, sourceContent, targetContent) {
    // Memory to Task relationships
    if (sourceType === 'memory' && targetType === 'task') {
      if (sourceContent.includes('solution') || sourceContent.includes('fix')) {
        return 'implements';
      }
      if (sourceContent.includes('block') || sourceContent.includes('issue')) {
        return 'blocks';
      }
      return 'references';
    }
    
    // Task to Memory relationships  
    if (sourceType === 'task' && targetType === 'memory') {
      if (targetContent.includes('solution') || targetContent.includes('fix')) {
        return 'implemented_by';
      }
      return 'references';
    }
    
    return 'related';
  }

  /**
   * Get reverse relationship type
   */
  getReverseType(type) {
    const reverseMap = {
      'blocks': 'blocked_by',
      'blocked_by': 'blocks',
      'implements': 'implemented_by', 
      'implemented_by': 'implements',
      'references': 'referenced_by',
      'referenced_by': 'references',
      'caused_by': 'causes',
      'causes': 'caused_by',
      'related': 'related'
    };
    return reverseMap[type] || 'related';
  }

  /**
   * Helper methods
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  calculateNodeSize(content) {
    // Node size based on content length (for visualization)
    const length = content ? content.length : 0;
    if (length > 1000) return 'large';
    if (length > 300) return 'medium';
    return 'small';
  }

  /**
   * Save relationships to storage
   */
  async saveRelationships() {
    try {
      const relationshipsArray = Array.from(this.relationships.values())
        .filter(rel => !rel.metadata?.reverse_link); // Only save primary links, not reverse
      
      await this.storage.writeFile(this.relationshipFile, JSON.stringify(relationshipsArray, null, 2));
    } catch (error) {
      console.error('❌ Failed to save relationships:', error.message);
    }
  }

  /**
   * Remove a relationship
   */
  async unlinkItems(fromId, toId) {
    await this.initialize();

    const key = `${fromId}:${toId}`;
    const reverseKey = `${toId}:${fromId}`;
    
    const removed = this.relationships.delete(key) || this.relationships.delete(reverseKey);
    
    if (removed) {
      await this.saveRelationships();
      return {
        success: true,
        message: `✅ Unlinked ${fromId} and ${toId}`
      };
    }
    
    return {
      success: false,
      message: `❌ No relationship found between ${fromId} and ${toId}`
    };
  }
}

export default RelationshipManager;