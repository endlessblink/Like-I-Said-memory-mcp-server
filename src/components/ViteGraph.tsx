import React from 'react';
import { Graph } from '@visx/network';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { defaultStyles } from '@visx/network';

interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface ViteGraphProps {
  width: number;
  height: number;
  nodes: GraphNode[];
  links: GraphLink[];
}

const colorScale = scaleOrdinal({
  domain: ['memory', 'tag', 'category'],
  range: ['#4ade80', '#3b82f6', '#f59e0b']
});

export function ViteGraph({ width, height, nodes, links }: ViteGraphProps) {
  return (
    <svg width={width} height={height}>
      <rect width={width} height={height} rx={14} fill="#1a1a1a" />
      <Group top={height / 2} left={width / 2}>
        <Graph
          graph={{
            nodes: nodes.map((node, i) => ({
              ...node,
              x: node.x || Math.cos(2 * Math.PI * i / nodes.length) * 200,
              y: node.y || Math.sin(2 * Math.PI * i / nodes.length) * 200
            })),
            links
          }}
          nodeComponent={({ node }) => (
            <circle
              r={16}
              fill={node.color || colorScale('memory')}
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
            />
          )}
          linkComponent={({ link }) => (
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="#999"
              strokeWidth={1}
              strokeOpacity={0.6}
              style={defaultStyles.links}
            />
          )}
        />
      </Group>
    </svg>
  );
}