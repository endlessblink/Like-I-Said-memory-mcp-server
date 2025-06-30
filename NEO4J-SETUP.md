# Neo4j Knowledge Graph Setup

## 🚀 Quick Start

### 1. Start Neo4j Database
```bash
# Start Neo4j container
npm run neo4j:start

# Or manually with docker-compose
docker-compose -f docker-compose.neo4j.yml up -d
```

### 2. Test Connection
```bash
# Run integration tests
npm run neo4j:test
```

### 3. Migrate Existing Memories
```bash
# Import all existing memories into Neo4j
npm run migrate:neo4j
```

### 4. Access Neo4j Browser
- **URL**: http://localhost:7474
- **Username**: neo4j  
- **Password**: likeisaid2024

## 📊 What You Get

### Knowledge Graph Features
- **Automatic Relationships**: Memories connected by shared tags, categories, and content
- **Temporal Connections**: Time-based relationships between memories
- **Smart Search**: Full-text search across all memory content
- **Graph Analytics**: PageRank, community detection, path analysis
- **Visual Exploration**: Interactive graph visualization

### Query Examples

#### Find Related Memories
```cypher
MATCH (m:Memory {id: 'your_memory_id'})
MATCH path = (m)-[:RELATES_TO*1..3]-(related:Memory)
RETURN m, related, path
```

#### Most Important Memories (by connections)
```cypher
MATCH (m:Memory)
RETURN m.title, m.id, 
       size((m)--()) as connections
ORDER BY connections DESC
LIMIT 10
```

#### Memory Timeline by Category
```cypher
MATCH (m:Memory)-[:BELONGS_TO]->(c:Category)
WHERE c.name = 'like-i-said-v2'
RETURN m.title, m.timestamp
ORDER BY m.timestamp DESC
```

#### Tag Co-occurrence Analysis
```cypher
MATCH (m:Memory)-[:TAGGED_WITH]->(t1:Tag)
MATCH (m)-[:TAGGED_WITH]->(t2:Tag)
WHERE t1 <> t2
RETURN t1.name, t2.name, count(m) as cooccurrence
ORDER BY cooccurrence DESC
LIMIT 20
```

## 🔧 Configuration

### Environment Variables
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=likeisaid2024
NEO4J_DATABASE=memories
```

### Docker Configuration
The `docker-compose.neo4j.yml` includes:
- **Neo4j Community Edition 5.15**
- **Persistent data volumes**
- **Performance optimizations**
- **Health checks**
- **Optional backup service**

### Memory Settings
```yaml
NEO4J_server_memory_heap_initial__size: 512m
NEO4J_server_memory_heap_max__size: 1G
NEO4J_server_memory_pagecache_size: 512m
```

## 📁 File Structure

```
├── graph/
│   ├── schema.cypher          # Database schema and constraints
│   └── queries/               # Useful Cypher queries
├── lib/
│   └── neo4j-connector.js     # Neo4j integration layer
├── scripts/
│   └── migrate-to-neo4j.js    # Migration script
├── docker-compose.neo4j.yml   # Neo4j container setup
└── test-neo4j.js             # Integration tests
```

## 🧪 Testing

### Run All Tests
```bash
npm run neo4j:test
```

### Manual Testing
```bash
# Connect to Neo4j shell
docker exec -it like-i-said-neo4j cypher-shell -u neo4j -p likeisaid2024

# Check database status
CALL dbms.components();

# Count nodes and relationships
MATCH (n) RETURN labels(n), count(n);
MATCH ()-[r]->() RETURN type(r), count(r);
```

## 🚨 Troubleshooting

### Neo4j Won't Start
```bash
# Check container logs
docker logs like-i-said-neo4j

# Restart with fresh data
npm run neo4j:stop
docker volume rm like-i-said-mcp-server-v2_neo4j_data
npm run neo4j:start
```

### Migration Fails
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Verify connection
npm run neo4j:test

# Run migration with verbose logging
DEBUG=1 npm run migrate:neo4j
```

### Performance Issues
- Increase heap size in `docker-compose.neo4j.yml`
- Monitor memory usage: `docker stats like-i-said-neo4j`
- Review slow queries in Neo4j Browser

## 🔄 Backup and Restore

### Automatic Backups
```bash
# Start with backup service
docker-compose -f docker-compose.neo4j.yml --profile backup up -d
```

### Manual Backup
```bash
# Create backup
docker exec like-i-said-neo4j neo4j-admin database backup --to-path=/backup memories

# Restore from backup
docker exec like-i-said-neo4j neo4j-admin database restore --from-path=/backup memories --overwrite-destination
```

## 🎯 Next Steps

1. **Explore the Graph**: Use Neo4j Browser to visualize your memory connections
2. **Custom Queries**: Create your own Cypher queries for insights
3. **Dashboard Integration**: Add graph visualization to the React dashboard
4. **Advanced Analytics**: Implement graph algorithms for memory recommendations
5. **Real-time Sync**: Set up automatic sync when memories are created/updated

## 📚 Resources

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Cypher Query Language](https://neo4j.com/developer/cypher/)
- [Graph Data Science Library](https://neo4j.com/docs/graph-data-science/)
- [Neo4j Browser Guide](https://neo4j.com/developer/neo4j-browser/)