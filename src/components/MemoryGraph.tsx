import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Search, ZoomIn, ZoomOut, Maximize2, RotateCw } from 'lucide-react';
import { Input } from './ui/input';

interface GraphNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  scope: string;
  created: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface MemoryGraphProps {
  onNodeClick?: (node: GraphNode) => void;
  onNodeEdit?: (node: GraphNode) => void;
  className?: string;
}

export const MemoryGraph: React.FC<MemoryGraphProps> = ({ 
  onNodeClick, 
  onNodeEdit, 
  className = '' 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  // Fetch graph data
  const fetchGraphData = async () => {
    try {
      const response = await fetch('/api/memories/graph');
      const graphData = await response.json();
      
      setNodes(graphData.nodes || []);
      setEdges(graphData.edges || []);
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    }
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 600;
    
    // Set up zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const container = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id(d => d.id)
        .distance(100)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links with different styles
    const link = container.append('g')
      .selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('stroke', d => {
        switch(d.type) {
          case 'backlink': return '#ef4444';
          case 'tag-similarity': return '#6b7280';
          default: return '#3b82f6';
        }
      })
      .attr('stroke-width', d => {
        switch(d.type) {
          case 'backlink': return 1;
          case 'tag-similarity': return 0.5;
          default: return 2;
        }
      })
      .attr('stroke-opacity', d => d.type === 'tag-similarity' ? 0.3 : 0.8)
      .attr('stroke-dasharray', d => {
        switch(d.type) {
          case 'backlink': return '3,3';
          case 'tag-similarity': return '1,2';
          default: return 'none';
        }
      })
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 4);
        // Show connection info
        const tooltip = container.append('g')
          .attr('class', 'link-tooltip')
          .attr('transform', `translate(${event.layerX}, ${event.layerY})`);
        
        tooltip.append('rect')
          .attr('x', -30)
          .attr('y', -15)
          .attr('width', 60)
          .attr('height', 20)
          .attr('fill', 'rgba(0,0,0,0.8)')
          .attr('rx', 4);
          
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', -2)
          .style('font-size', '10px')
          .style('fill', 'white')
          .text(d.type);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('stroke-width', d.type === 'backlink' ? 1 : 2);
        container.selectAll('.link-tooltip').remove();
      });

    // Create nodes
    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles for nodes with dynamic sizing
    node.append('circle')
      .attr('r', d => d.size || (d.linkCount ? Math.max(15, Math.min(25, 15 + d.linkCount * 2)) : 20))
      .attr('fill', d => {
        if (d.scope === 'global') return '#3b82f6';
        if (d.tags.some(tag => ['important', 'core', 'critical'].includes(tag.toLowerCase()))) return '#f59e0b';
        return '#10b981';
      })
      .attr('stroke', d => selectedNode?.id === d.id ? '#fbbf24' : '#fff')
      .attr('stroke-width', d => selectedNode?.id === d.id ? 3 : 2)
      .style('cursor', 'pointer')
      .style('filter', d => d.linkCount > 3 ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : 'none')
      .on('click', (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
        
        // Highlight connected nodes
        node.selectAll('circle')
          .attr('opacity', n => {
            const isConnected = edges.some(edge => 
              (edge.source === d.id && edge.target === n.id) ||
              (edge.target === d.id && edge.source === n.id)
            );
            return n.id === d.id || isConnected ? 1 : 0.3;
          });
          
        link.attr('opacity', edge => 
          edge.source === d.id || edge.target === d.id ? 1 : 0.1
        );
      })
      .on('dblclick', (event, d) => {
        onNodeEdit?.(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 4);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('stroke-width', selectedNode?.id === d.id ? 3 : 2);
      });

    // Add labels
    node.append('text')
      .text(d => d.title.length > 15 ? d.title.slice(0, 15) + '...' : d.title)
      .attr('dy', -25)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .style('pointer-events', 'none');

    // Add tags as small badges
    node.each(function(d) {
      if (d.tags.length > 0) {
        d3.select(this).append('text')
          .text(`#${d.tags[0]}`)
          .attr('dy', 35)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('fill', '#6b7280')
          .style('pointer-events', 'none');
      }
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Filter nodes based on search
    if (searchTerm) {
      node.style('opacity', d => 
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
          ? 1 : 0.3
      );
      link.style('opacity', d => {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        return (source.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                target.title.toLowerCase().includes(searchTerm.toLowerCase())) ? 1 : 0.1;
      });
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, searchTerm, onNodeClick, onNodeEdit]);

  // Load data on mount
  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.2
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.8
    );
  };

  const handleResetView = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  const handleRefresh = () => {
    fetchGraphData();
  };

  return (
    <div className={`memory-graph-container ${className}`}>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search memories by title or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetView}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="ml-2">
            {nodes.length} memories
          </Badge>
          <Badge variant="outline" className="ml-1">
            Zoom: {Math.round(zoom * 100)}%
          </Badge>
        </div>
      </div>

      {/* Graph */}
      <div className="border rounded-lg bg-white relative overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="600"
          className="cursor-move"
        />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border shadow-sm max-w-xs">
          <h4 className="font-semibold text-sm mb-2">Memory Graph Legend</h4>
          
          {/* Node Types */}
          <div className="mb-3">
            <div className="text-xs font-medium mb-1">Node Types:</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs">Global Memory</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs">Project Memory</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs">Important/Core</span>
            </div>
          </div>

          {/* Connection Types */}
          <div className="mb-3">
            <div className="text-xs font-medium mb-1">Connections:</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-0 border-t-2 border-blue-500"></div>
              <span className="text-xs">Direct Link</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-0 border-t border-red-500 border-dashed"></div>
              <span className="text-xs">Backlink</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-0 border-t border-gray-400" style={{borderStyle: 'dotted'}}></div>
              <span className="text-xs">Tag Similarity</span>
            </div>
          </div>

          <div className="text-xs text-gray-600 border-t pt-2">
            • Click to highlight connections<br/>
            • Double-click to edit<br/>
            • Larger nodes = more connections<br/>
            • Glowing nodes = 3+ connections
          </div>
        </div>

        {/* Selected node info */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border shadow-sm max-w-xs">
            <h4 className="font-semibold text-sm mb-1">{selectedNode.title}</h4>
            <p className="text-xs text-gray-600 mb-2">
              {selectedNode.content.slice(0, 100)}...
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};