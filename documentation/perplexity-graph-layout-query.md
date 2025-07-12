# Perplexity Query: Force-Directed Graph Layout with D3.js - Solving Node Clustering Issues

## Problem Description

I'm building a knowledge graph visualization using `react-force-graph-2d` (which uses D3.js force simulation) to display memory nodes with relationships. I'm experiencing severe node clustering issues where:

1. **Massive node clustering**: All nodes cluster together in the center making them unreadable
2. **Overlapping text**: Node labels overlap and become illegible
3. **Poor distribution**: When I increase repulsion forces to spread nodes apart, they lose all connections and float isolated
4. **Balance issue**: Can't find the sweet spot between readable spacing and meaningful connections

## Current Force Configuration

```javascript
d3Force={{
  charge: -3000,                              // Strong repulsion to prevent clustering
  link: { distance: 300, strength: 0.1 },    // Long links, weak attraction
  center: { x: 0.5, y: 0.5, strength: 0.02 }, // Very weak centering
  collision: { radius: node => node.val + 50 }, // Large collision radius
  x: { strength: 0.1 },                      // Horizontal positioning force
  y: { strength: 0.1 }                       // Vertical positioning force
}}
```

## Graph Data Structure

- **Memory nodes**: 20 nodes with text labels (25px radius)
- **Tag nodes**: 4 nodes representing shared tags (20px radius) 
- **Concept nodes**: 3 nodes representing extracted concepts (18px radius)
- **Links**: Connections between memories that share 3+ tags, memories to their tags, memories to concepts they mention

## Target Layout Goal

I want to achieve a Neo4j-style graph layout where:
- Nodes are well-spaced and readable (like the scattered layout in Neo4j Browser)
- Connections are visible but not overwhelming
- Text labels fit within node boundaries and are legible
- Layout resembles organic clustering without massive central clustering
- Relationships are meaningful and not just visual noise

## Specific Questions for Perplexity

1. **Optimal D3 Force Parameters**: What are the best practice force simulation parameters for a knowledge graph with 25-30 nodes that prevents clustering while maintaining meaningful connections?

2. **Node Positioning Algorithms**: Are there alternative layout algorithms (like hierarchical, circular, or grid-based) that work better than pure force-directed for knowledge graphs with dense interconnections?

3. **Text Rendering Best Practices**: How should I handle text labeling in force-directed graphs to prevent overlap while keeping labels readable within node boundaries?

4. **Link Density Management**: What's the optimal approach to determine which relationships to show vs hide to prevent visual clutter while maintaining graph utility?

5. **Dynamic Spacing Solutions**: Are there techniques to dynamically adjust node spacing based on the zoom level or viewport size?

6. **Neo4j-Style Layout**: What specific techniques does Neo4j Browser use for their graph layout that creates that distinctive well-spaced, organic appearance?

## Canvas Rendering Context

- Using HTML5 Canvas with custom node and link rendering
- Node sizes: 18-25px radius
- Text: Bold Inter font, dynamically sized based on zoom
- Links: Relationship labels with background boxes
- Interactive: Pan, zoom, node dragging enabled

## Expected Perplexity Research Areas

Please research and provide solutions covering:
- D3.js force simulation best practices for knowledge graphs
- Alternative graph layout algorithms for dense networks
- Text collision detection and avoidance techniques
- Professional graph visualization libraries and their approaches
- Neo4j Browser layout algorithm insights
- Academic papers on graph readability and spacing optimization

## Implementation Environment

- React + TypeScript
- react-force-graph-2d library
- HTML5 Canvas rendering
- Real-time interactive graph updates
- Memory/knowledge management application context