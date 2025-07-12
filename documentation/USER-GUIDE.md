# Like-I-Said Memory Server v2 - User Guide

*Complete guide to advanced features and functionality*

## 🚀 Quick Start

The Like-I-Said Memory Server v2 provides intelligent memory management with a modern React dashboard. This guide covers all advanced features and how to use them effectively.

### Access Your Dashboard
- **Local Development**: http://localhost:5174
- **API Server**: http://localhost:3001

---

## 📊 Dashboard Overview

### Navigation Structure
The dashboard includes four main sections:

1. **📊 Dashboard** - Overview and statistics
2. **🧠 Memories** - Memory management and editing
3. **🔗 Relationships** - Advanced graph visualizations *(NEW)*
4. **🤖 AI Enhancement** - LLM-powered memory enhancement *(ENHANCED)*

---

## 🔗 Advanced Relationship Visualization

### Enhanced Graph Views *(NEW FEATURE)*

Navigate to **🔗 Relationships** to access powerful graph visualization tools:

#### 🚀 Enhanced Graph Tab
- **Graphiti Integration**: Advanced knowledge graph construction using temporal AI
- **Service Status**: Real-time monitoring of Graphiti service availability
- **Automatic Fallback**: Graceful degradation to local visualization when service unavailable
- **Natural Language Search**: Query your memories using plain English
- **Memory Sync**: Automated synchronization with knowledge graph database

#### 🎨 Professional Graph Visualization
- **Neo4j-Style Interface**: Professional graph visualization similar to Neo4j browser
- **Colored Nodes**: 
  - 🔴 Personal memories (red)
  - 🔵 Work/Code memories (blue) 
  - 🟢 Research memories (green)
  - 🟡 Conversations (yellow)
  - 🟣 Concepts (purple)
  - 🟠 Tags (orange)

#### 🏷️ Labeled Relationships
- **MENTIONS**: Memory references a concept or person
- **RELATES_TO**: Memories share similar topics
- **DEPENDS_ON**: One memory builds on another
- **SIMILAR_TO**: Memories have shared characteristics
- **CONTAINS**: Memory includes tags or concepts
- **PART_OF**: Memory belongs to a project or category

#### 🎮 Interactive Controls
- **Zoom & Pan**: Mouse wheel to zoom, drag to pan
- **Filter Options**: 
  - All Relationships
  - Strong Connections Only  
  - Concepts Only
- **Layout Modes**:
  - Force-directed (default)
  - Circular layout
  - Grid layout
- **Fit View**: Auto-resize to show all nodes
- **Center**: Reset view to center position

---

## 🤖 Enhanced AI Features

### Detailed Progress Tracking *(NEW)*

The AI Enhancement section now provides comprehensive progress monitoring:

#### 📈 Real-Time Progress
- **Progress Bar**: Visual completion percentage
- **Time Estimates**: Remaining processing time
- **Current Status**: What the AI is currently doing
- **Queue Status**: Completed, in-progress, and pending memories
- **Error Tracking**: Failed enhancement attempts with details

#### 📊 Enhanced Statistics Dashboard
- **AI Enhanced**: Memories with AI-generated titles and summaries
- **Tagged**: Memories with organized tags
- **Categorized**: Memories properly categorized
- **Summarized**: Memories with AI-generated summaries
- **Quality Score**: Overall collection quality assessment

#### 🔍 Detailed Progress View
Toggle "Show Details" to see:
- Currently processing memory ID
- Completed/In Progress/Pending counts
- Error summary with specific failures
- Performance statistics
- Session start time

---

## 🛠️ Advanced Features

### Graphiti Knowledge Graph Integration

#### Setup (Optional)
For advanced knowledge graph features, configure the Graphiti service:

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   ```bash
   export NEO4J_URI="bolt://localhost:7687"
   export NEO4J_USER="neo4j"
   export NEO4J_PASSWORD="your_password"
   export OPENAI_API_KEY="your_openai_key"
   ```

3. **Start Graphiti Service**:
   ```bash
   cd python-services
   python graphiti-service.py
   ```

#### Features When Available
- **Temporal Knowledge Construction**: AI builds connections over time
- **Advanced Query Processing**: Natural language search
- **Memory Clustering**: Automated grouping of related content
- **Timeline Analysis**: Historical memory evolution

### Neo4j Database Integration

#### Setup (Optional)
For production-scale graph storage:

1. **Start Neo4j**:
   ```bash
   npm run neo4j:start
   ```

2. **Test Connection**:
   ```bash
   npm run neo4j:test
   ```

#### Benefits
- **Scalable Storage**: Handle thousands of memories
- **Advanced Queries**: Complex relationship analysis
- **Performance**: Optimized graph traversal
- **Persistence**: Durable graph storage

---

## 🎯 Best Practices

### Memory Organization
1. **Use Descriptive Tags**: Help AI understand content context
2. **Categorize Appropriately**: Personal, Work, Code, Research, etc.
3. **Link Related Memories**: Reference IDs in related_memories field
4. **Regular Enhancement**: Use AI enhancement for better organization

### Graph Visualization
1. **Start with Enhanced Tab**: Best overall experience
2. **Use Filters**: Focus on specific relationship types
3. **Explore Interactively**: Click nodes to edit memories
4. **Leverage Search**: Use natural language queries

### AI Enhancement
1. **Batch Processing**: Use "Enhance All" for efficiency
2. **Monitor Progress**: Watch detailed progress tracking
3. **Review Results**: Check AI-generated content quality
4. **Iterate**: Re-enhance memories as content evolves

---

## 🔧 Troubleshooting

### Graph Visualization Issues
- **Empty Graph**: Check if memories have tags and relationships
- **Performance**: Use filters to reduce node count for large datasets
- **Service Unavailable**: Graphiti service will show fallback options

### AI Enhancement Problems
- **No Progress**: Check LLM API key configuration
- **Errors**: Review detailed error messages in progress view
- **Quality Issues**: Adjust prompts in AI settings

### General Issues
- **Dashboard Not Loading**: Check if dev server is running (port 5174)
- **API Errors**: Verify dashboard bridge is running (port 3001)
- **Memory Sync**: Use refresh buttons to reload data

---

## 📈 Performance Optimization

### Large Memory Collections
- **Virtual Scrolling**: Implemented for 1000+ memories
- **Lazy Loading**: Components load on demand
- **Graph Filtering**: Reduce visual complexity
- **Batch Operations**: Process multiple memories efficiently

### System Requirements
- **Minimum**: 4GB RAM, modern browser
- **Recommended**: 8GB RAM, dedicated GPU for large graphs
- **Optional Services**: Additional 2GB RAM for Neo4j/Graphiti

---

## 🔄 Updates and Maintenance

### Version Information
- **Current Version**: 2.3.7
- **Last Updated**: December 2024
- **Compatibility**: Node.js 18+, Modern browsers

### Regular Maintenance
1. **Update Dependencies**: `npm update`
2. **Clear Cache**: Browser hard refresh (Ctrl+Shift+R)
3. **Backup Data**: Export memories regularly
4. **Monitor Performance**: Check dashboard statistics

---

## 🎨 Customization

### Navigation Alignment
The navigation is precisely aligned for optimal user experience. If alignment issues occur:

1. **Check Specification**: Refer to `NAVIGATION-DESIGN-SPEC.md`
2. **Restore Settings**: Use documented margin/padding values
3. **Test Alignment**: Use browser developer tools

### Graph Appearance
- **Node Colors**: Modify `categoryColors` in Neo4jStyleGraph component
- **Relationship Types**: Customize labels in relationship type arrays
- **Layout Physics**: Adjust force-directed parameters

---

## 🤝 Support

### Documentation
- **Technical Specs**: `NAVIGATION-DESIGN-SPEC.md`
- **Test Results**: `TEST-RESULTS.md`
- **Component Stories**: Storybook at http://localhost:6006

### Development
- **GitHub Repository**: [Like-I-Said-Memory-V2](https://github.com/endlessblink/Like-I-Said-Memory-V2)
- **Issues**: Report bugs and feature requests
- **Contributing**: Pull requests welcome

---

## 🌟 Advanced Use Cases

### Research Workflows
1. **Capture Notes**: Add research memories with descriptive tags
2. **Build Connections**: Use AI enhancement to discover relationships
3. **Visualize Knowledge**: Explore enhanced graph view
4. **Export Insights**: Use natural language search for specific findings

### Project Management
1. **Organize by Project**: Use project-based memory organization
2. **Track Dependencies**: Link related memories and tasks
3. **Monitor Progress**: Use statistics dashboard
4. **Collaborate**: Export/import memories for team sharing

### Knowledge Management
1. **Continuous Learning**: Regular memory enhancement
2. **Pattern Discovery**: Graph visualization reveals insights
3. **Content Evolution**: Timeline view shows knowledge growth
4. **Quality Improvement**: Use quality scores to guide improvements

---

This guide covers all major features of the Like-I-Said Memory Server v2 dashboard. For specific technical details, refer to the additional documentation files included with the project.