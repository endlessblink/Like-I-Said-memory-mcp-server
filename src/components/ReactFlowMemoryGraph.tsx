import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  NodeProps,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { dagreLayout } from '../utils/layout';
import { Memory } from '../types';

interface MemoryNode extends Node {
  data: {
    id: string;
    content: string;
    tags: string[];
    title?: string;
  };
}

interface ReactFlowMemoryGraphProps {
  memories: Memory[];
  onNodeClick?: (memory: Memory) => void;
}

// Custom Memory Node Component
const MemoryNode = ({ data }: NodeProps) => {
  const title = data.title || data.content.substring(0, 30) + '...';
  const tagCount = data.tags?.length || 0;
  
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[150px]">
      <div className="text-sm font-bold text-gray-900 mb-1">
        {title}
      </div>
      <div className="text-xs text-gray-500">
        {tagCount} tag{tagCount !== 1 ? 's' : ''}
      </div>
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {tag}
            </span>
          ))}
          {data.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{data.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  memoryNode: MemoryNode,
};

function ReactFlowMemoryGraphInner({ memories, onNodeClick }: ReactFlowMemoryGraphProps) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('LR');

  // Transform memories to nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: MemoryNode[] = memories.map((memory) => ({
      id: memory.id,
      position: { x: 0, y: 0 },
      data: {
        id: memory.id,
        content: memory.content,
        tags: memory.tags || [],
        title: memory.metadata?.title,
      },
      type: 'memoryNode',
    }));

    // Create edges based on shared tags or other relationships
    const edges: Edge[] = [];
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memoryA = memories[i];
        const memoryB = memories[j];
        
        // Connect memories with shared tags
        const sharedTags = (memoryA.tags || []).filter(tag => 
          (memoryB.tags || []).includes(tag)
        );
        
        if (sharedTags.length > 0) {
          edges.push({
            id: `${memoryA.id}-${memoryB.id}`,
            source: memoryA.id,
            target: memoryB.id,
            type: 'default',
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          });
        }
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [memories]);

  // Apply layout when data changes
  const applyLayout = useCallback(() => {
    if (initialNodes.length === 0) return;
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = dagreLayout(
      initialNodes,
      initialEdges,
      layoutDirection
    );
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Fit view after layout
    setTimeout(() => {
      fitView({ duration: 400, padding: 0.1 });
    }, 100);
  }, [initialNodes, initialEdges, layoutDirection, fitView, setNodes, setEdges]);

  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const memory = memories.find(m => m.id === node.id);
      if (memory && onNodeClick) {
        onNodeClick(memory);
      }
    },
    [memories, onNodeClick]
  );

  if (memories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No memories to display in graph
      </div>
    );
  }

  return (
    <div className="w-full h-96 border border-gray-300 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
        onlyRenderVisibleElements
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <Panel position="top-left" className="bg-white p-2 rounded shadow">
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutDirection('LR')}
              className={`px-2 py-1 text-xs rounded ${
                layoutDirection === 'LR' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Left-Right
            </button>
            <button
              onClick={() => setLayoutDirection('TB')}
              className={`px-2 py-1 text-xs rounded ${
                layoutDirection === 'TB' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Top-Bottom
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function ReactFlowMemoryGraph(props: ReactFlowMemoryGraphProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowMemoryGraphInner {...props} />
    </ReactFlowProvider>
  );
}