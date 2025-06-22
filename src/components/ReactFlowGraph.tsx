import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  NodeTypes,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import MemoryNodeComponent from './MemoryNode';
import { dagreLayout } from '@/utils/layout';
import { Memory, MemoryNode, MemoryEdge, GraphProps } from '@/types/graph';
import '@xyflow/react/dist/style.css';

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  personal: '#fecaca', // red
  work: '#bfdbfe', // blue
  code: '#d9f99d', // green
  research: '#f0abfc', // pink
  conversations: '#fde68a', // yellow
  preferences: '#e9d5ff', // purple
  default: '#f3f4f6' // gray
};

const nodeTypes: NodeTypes = {
  memoryNode: MemoryNodeComponent
};

interface ReactFlowGraphInternalProps extends GraphProps {
  extractTitle: (content: string, memory?: Memory) => string;
  extractTags: (memory: Memory) => string[];
  getTagColor: (tag: string) => { bg: string; text: string; border: string };
}

const ReactFlowGraphInternal = ({ 
  memories, 
  selectedNode, 
  onNodeClick,
  extractTitle,
  extractTags,
  getTagColor
}: ReactFlowGraphInternalProps) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Convert memories to graph elements with performance optimization
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!memories || memories.length === 0) {
      console.log('No memories provided to ReactFlowGraph');
      return { initialNodes: [], initialEdges: [] };
    }

    console.log('Processing', memories.length, 'memories for graph');
    console.log('First memory:', memories[0]);

    // Create connection count map for optimization
    const connectionCounts = new Map<string, number>();
    const linkMap = new Map<string, boolean>();

    // Initialize connection counts
    memories.forEach(memory => {
      connectionCounts.set(memory.id, 0);
    });

    // First pass: create edges and count connections
    const edges: MemoryEdge[] = [];
    
    memories.forEach(memory => {
      // Create edges from explicit relationships
      if (memory.related_memories) {
        memory.related_memories.forEach(relatedId => {
          const linkId = `${memory.id}-${relatedId}`;
          const reverseLinkId = `${relatedId}-${memory.id}`;
          
          if (!linkMap.has(linkId) && !linkMap.has(reverseLinkId)) {
            // Check if target exists
            const targetExists = memories.some(m => m.id === relatedId);
            if (targetExists) {
              edges.push({
                id: linkId,
                source: memory.id,
                target: relatedId,
                strength: 5,
                type: 'smoothstep',
                animated: true,
                relationshipType: 'explicit',
                style: {
                  strokeWidth: 3,
                  stroke: '#4f46e5',
                },
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#4f46e5'
                }
              });
              
              linkMap.set(linkId, true);
              connectionCounts.set(memory.id, (connectionCounts.get(memory.id) || 0) + 1);
              connectionCounts.set(relatedId, (connectionCounts.get(relatedId) || 0) + 1);
            }
          }
        });
      }

      // Create edges from shared tags (lighter connections)
      const memoryTags = extractTags(memory);
      memories.forEach(other => {
        if (memory.id !== other.id) {
          const otherTags = extractTags(other);
          const sharedTags = memoryTags.filter(tag => otherTags.includes(tag));
          
          if (sharedTags.length >= 2) { // Only strong tag relationships
            const linkId = `${memory.id}-${other.id}-tag`;
            const reverseLinkId = `${other.id}-${memory.id}-tag`;
            
            if (!linkMap.has(linkId) && !linkMap.has(reverseLinkId) && 
                !memory.related_memories?.includes(other.id)) {
              
              const strength = Math.min(sharedTags.length, 5);
              edges.push({
                id: linkId,
                source: memory.id,
                target: other.id,
                strength,
                type: 'straight',
                relationshipType: 'tag-based',
                style: {
                  strokeWidth: Math.max(1, strength / 2),
                  stroke: '#9ca3af',
                  strokeDasharray: '5,5',
                  opacity: 0.6
                }
              });
              
              linkMap.set(linkId, true);
              connectionCounts.set(memory.id, (connectionCounts.get(memory.id) || 0) + 1);
              connectionCounts.set(other.id, (connectionCounts.get(other.id) || 0) + 1);
            }
          }
        }
      });
    });

    // Second pass: create nodes with connection counts
    const nodes: MemoryNode[] = memories.map(memory => {
      const tags = extractTags(memory);
      const title = extractTitle(memory.content, memory);
      const category = memory.category || 'default';
      const connectionCount = connectionCounts.get(memory.id) || 0;
      
      return {
        id: memory.id,
        type: 'memoryNode',
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          ...memory,
          title,
          tags,
          connectionCount,
          size: Math.max(12, 12 + (connectionCount * 2)),
          color: CATEGORY_COLORS[category] || CATEGORY_COLORS.default
        },
        style: {
          backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.default,
        }
      };
    });

    console.log('Created', nodes.length, 'nodes and', edges.length, 'edges');
    return { initialNodes: nodes, initialEdges: edges };
  }, [memories, extractTitle, extractTags]);

  // Apply layout and filters
  const applyLayout = useCallback(async () => {
    if (initialNodes.length === 0) return;
    
    setIsLoading(true);
    
    // Filter nodes if filters are active
    const filteredNodes = filters.size === 0 
      ? initialNodes 
      : initialNodes.filter(node => 
          Array.from(filters).some(filter => 
            node.data.tags.includes(filter) || 
            node.data.category === filter
          )
        );

    // Filter edges to only include those between filtered nodes
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = initialEdges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );

    console.log('Applying layout to', filteredNodes.length, 'nodes');

    // Apply layout (use setTimeout to allow UI to update)
    setTimeout(() => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = dagreLayout(
        filteredNodes, 
        filteredEdges
      );
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setIsLoading(false);
      
      // Fit view after layout is applied
      setTimeout(() => {
        fitView({ duration: 800, padding: 50 });
      }, 100);
    }, 100);
  }, [initialNodes, initialEdges, filters, setNodes, setEdges, fitView]);

  // Apply layout when data changes
  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  // Event handlers
  const handleNodeClick = useCallback((_: any, node: MemoryNode) => {
    console.log('Selected memory:', node.data);
    onNodeClick(node.id);
  }, [onNodeClick]);

  const handleFilterToggle = useCallback((filter: string) => {
    setFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      return newFilters;
    });
  }, []);

  // Get unique tags and categories for filters
  const { allTags, allCategories } = useMemo(() => {
    const tags = new Set<string>();
    const categories = new Set<string>();
    
    memories.forEach(memory => {
      extractTags(memory).forEach(tag => tags.add(tag));
      if (memory.category) categories.add(memory.category);
    });
    
    return { 
      allTags: Array.from(tags).slice(0, 20), // Limit for performance
      allCategories: Array.from(categories) 
    };
  }, [memories, extractTags]);

  if (isLoading || initialNodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-600">
            {initialNodes.length === 0 ? 'Loading memories...' : 'Laying out graph...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        onlyRenderVisibleElements={true}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls />
        
        {/* Filter Panel */}
        <Panel position="top-left" className="bg-white/90 p-4 rounded-lg shadow-lg max-w-sm">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Filters</h3>
            
            {/* Category filters */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Categories</h4>
              <div className="flex flex-wrap gap-1">
                {allCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleFilterToggle(category)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      filters.has(category)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tag filters */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleFilterToggle(tag)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      filters.has(tag)
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Clear filters */}
            {filters.size > 0 && (
              <button
                onClick={() => setFilters(new Set())}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </Panel>
        
        {/* Stats Panel */}
        <Panel position="top-right" className="bg-white/90 p-3 rounded-lg shadow-lg">
          <div className="text-sm text-gray-700 space-y-1">
            <div>Nodes: {nodes.length}</div>
            <div>Edges: {edges.length}</div>
            {filters.size > 0 && (
              <div className="text-xs text-blue-600">
                Filtered: {filters.size} active
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Main component with ReactFlowProvider
export function ReactFlowGraph(props: ReactFlowGraphInternalProps) {
  console.log('ReactFlowGraph component mounted with props:', {
    memoriesCount: props.memories?.length,
    selectedNode: props.selectedNode
  });

  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <ReactFlowGraphInternal {...props} />
      </ReactFlowProvider>
    </div>
  );
}