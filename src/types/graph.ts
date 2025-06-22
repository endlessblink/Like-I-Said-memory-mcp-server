import { Node, Edge } from '@xyflow/react';

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  timestamp: string;
  category: string;
  project?: string;
  related_memories: string[];
  title?: string;
  summary?: string;
  priority?: string;
  status?: string;
}

export interface MemoryNodeData extends Memory {
  connectionCount: number;
  size: number;
  color: string;
}

export interface MemoryNode extends Node {
  data: MemoryNodeData;
  type: 'memoryNode';
}

export interface MemoryEdge extends Edge {
  strength: number; // 1-5 scale
  type: 'smoothstep' | 'straight';
  animated?: boolean;
  relationshipType: 'explicit' | 'tag-based';
}

export interface GraphFilters {
  tags: Set<string>;
  categories: Set<string>;
  projects: Set<string>;
}

export interface GraphProps {
  memories: Memory[];
  selectedNode: string | null;
  onNodeClick: (nodeId: string | null) => void;
  filters?: GraphFilters;
  onFiltersChange?: (filters: GraphFilters) => void;
}