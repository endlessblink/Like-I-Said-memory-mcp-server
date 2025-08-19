import Graph from 'graphology';
import { random } from 'graphology-layout/random';
import { circular } from 'graphology-layout/circular';

interface Memory {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
  type?: string;
  category?: string;
  createdAt?: string;
  timestamp?: string;
}

interface SigmaNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  type: string;
  content?: string;
}

interface SigmaEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  size: number;
  color: string;
  type: string;
}

export class MemoryToSigmaTransformer {
  private readonly nodeColors = {
    memory: '#E85D75',      // Neo4j pink/purple
    tag: '#FF8C42',         // Neo4j orange
    concept: '#4C8EDA',     // Neo4j blue
    personal: '#E85D75',    // Category colors
    work: '#FF8C42',
    code: '#FF8C42',
    research: '#E85D75',
    conversations: '#E85D75',
    preferences: '#FF8C42',
    project: '#FF8C42'
  };

  private readonly edgeColors = {
    tagging: '#6c757d',
    concept_mention: '#17a2b8',
    similarity: '#dc3545',
    'tag-relation': '#6c757d',
    'concept-relation': '#17a2b8',
    'memory-relation': '#dc3545'
  };

  transform(
    memories: Memory[], 
    canvasWidth: number = 800, 
    canvasHeight: number = 600,
    maxNodes: number = 100
  ): Graph {
    console.log('MemoryToSigmaTransformer: Starting transform with', memories.length, 'memories');
    const graph = new Graph();
    const edgeSet = new Set();
    
    // Sort and limit memories for performance
    const limitedMemories = this.prioritizeMemories(memories, maxNodes);
    console.log('MemoryToSigmaTransformer: Limited to', limitedMemories.length, 'memories');
    
    // First pass: Add all memory nodes WITHOUT coordinates
    limitedMemories.forEach((memory, index) => {
      const category = memory.category || memory.type || 'personal';
      const title = this.extractTitle(memory);
      
      if (index < 3) {
        console.log(`MemoryToSigmaTransformer: Adding node ${index}:`, {
          id: memory.id,
          title,
          category
        });
      }
      
      graph.addNode(memory.id, {
        label: title,
        size: this.calculateNodeSize(title),
        color: this.nodeColors[category as keyof typeof this.nodeColors] || this.nodeColors.memory,
        // Don't use 'type' as it's reserved by Sigma for node rendering programs
        nodeType: 'memory',
        content: memory.content || '',
        originalData: memory
        // Note: NO x, y coordinates yet - will be added by layout
      });
      
      // Process tags and create tag nodes + edges
      this.processMemoryTags(graph, memory, edgeSet, canvasWidth, canvasHeight);
    });
    
    // Add memory-to-memory relationships
    this.addMemoryRelationships(graph, limitedMemories, edgeSet);
    
    // Apply layout to generate coordinates (REQUIRED for Sigma.js)
    if (graph.order > 0) {
      if (graph.order <= 20) {
        // Use circular layout for smaller graphs
        circular.assign(graph, {
          scale: Math.min(canvasWidth, canvasHeight) * 0.3
        });
      } else {
        // Use random layout for larger graphs
        random.assign(graph, {
          scale: Math.min(canvasWidth, canvasHeight) * 0.4,
          center: 0.5
        });
      }
      console.log('MemoryToSigmaTransformer: Applied layout coordinates to', graph.order, 'nodes');
    }
    
    console.log('MemoryToSigmaTransformer: Final graph has', graph.nodes().length, 'nodes and', graph.edges().length, 'edges');
    
    return graph;
  }

  private prioritizeMemories(memories: Memory[], maxNodes: number): Memory[] {
    return memories
      .filter(memory => memory && memory.id)
      .sort((a, b) => {
        // Prioritize by creation date or importance
        const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, maxNodes);
  }

  private calculateNodePosition(
    index: number, 
    totalNodes: number, 
    width: number, 
    height: number
  ): { x: number; y: number } {
    // Grid initialization with organic jitter for Neo4j Browser style
    const gridSize = Math.ceil(Math.sqrt(totalNodes));
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    
    const baseX = (col + 0.5) * cellWidth;
    const baseY = (row + 0.5) * cellHeight;
    
    // Add organic jitter within cell bounds
    const jitterX = (Math.random() - 0.5) * cellWidth * 0.4;
    const jitterY = (Math.random() - 0.5) * cellHeight * 0.4;
    
    return {
      x: baseX + jitterX,
      y: baseY + jitterY
    };
  }

  private calculateNodeSize(text: string): number {
    // Text-based sizing - key feature for professional appearance
    const baseSize = 20;
    const textLengthFactor = Math.min(text.length * 0.8, 20);
    return baseSize + textLengthFactor;
  }

  private extractTitle(memory: Memory): string {
    // First try the title field
    if (memory.title) return memory.title;
    
    // Then try to extract from content
    const content = memory.content || '';
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return 'Untitled';
    
    const headerMatch = content.match(/^#{1,6}\s+(.+)$/m);
    if (headerMatch) return headerMatch[1].trim();
    
    const firstLine = lines[0].replace(/^[#*\-\s]+/, '').trim();
    return firstLine.length > 0 ? firstLine.substring(0, 50) : 'Untitled';
  }

  private processMemoryTags(
    graph: Graph,
    memory: Memory,
    edgeSet: Set<string>,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!memory.tags || !Array.isArray(memory.tags)) return;
    
    const meaningfulTags = memory.tags.filter(tag => 
      !tag.startsWith('title:') && !tag.startsWith('summary:')
    );
    
    meaningfulTags.forEach((tag: string) => {
      const tagId = `tag-${tag.toLowerCase().replace(/\s+/g, '_')}`;
      
      // Add tag node if not exists
      if (!graph.hasNode(tagId)) {
        graph.addNode(tagId, {
          label: `#${tag}`,
          size: this.calculateNodeSize(tag),
          color: this.nodeColors.tag,
          // Don't use 'type' as it's reserved by Sigma for node rendering programs
          nodeType: 'tag'
          // Note: NO x, y coordinates - will be added by layout
        });
      }
      
      // Create edge with connection context label
      const edgeId = `${memory.id}-${tagId}`;
      if (!edgeSet.has(edgeId)) {
        graph.addEdge(memory.id, tagId, {
          label: 'HAS_TAG',
          size: 2,
          color: this.edgeColors['tag-relation'],
          type: 'tag-relation'
        });
        edgeSet.add(edgeId);
      }
    });
  }

  private addMemoryRelationships(
    graph: Graph,
    memories: Memory[],
    edgeSet: Set<string>
  ): void {
    // Add relationships between memories that share tags
    memories.forEach((memory1, i) => {
      memories.forEach((memory2, j) => {
        if (i >= j) return; // Avoid duplicates
        
        const tags1 = (memory1.tags || []).filter(tag => 
          !tag.startsWith('title:') && !tag.startsWith('summary:')
        );
        const tags2 = (memory2.tags || []).filter(tag => 
          !tag.startsWith('title:') && !tag.startsWith('summary:')
        );
        
        const sharedTags = tags1.filter(tag => tags2.includes(tag));
        
        if (sharedTags.length >= 2) {
          const edgeId = `${memory1.id}-${memory2.id}`;
          
          if (!edgeSet.has(edgeId)) {
            graph.addEdge(memory1.id, memory2.id, {
              label: 'RELATES_TO',
              size: 3,
              color: this.edgeColors['memory-relation'],
              type: 'memory-relation'
            });
            edgeSet.add(edgeId);
          }
        }
      });
    });
  }
}