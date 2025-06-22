import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export const dagreLayout = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Configure graph layout
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 150,
    nodesep: 100,
    marginx: 50,
    marginy: 50
  });

  // Add nodes to dagre graph
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { 
      width: NODE_WIDTH, 
      height: NODE_HEIGHT 
    });
  });

  // Add edges to dagre graph
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map(node => {
    const position = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2
      }
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Alternative force-directed layout for smaller graphs
export const forceLayout = (nodes: Node[], edges: Edge[]) => {
  // Simple circular layout as fallback
  const centerX = 400;
  const centerY = 300;
  const radius = Math.min(200 + nodes.length * 2, 400);
  
  const layoutedNodes = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    };
  });

  return { nodes: layoutedNodes, edges };
};