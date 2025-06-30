import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';

export class Neo4jConnector {
  constructor(options = {}) {
    this.uri = options.uri || process.env.NEO4J_URI || 'bolt://localhost:7687';
    this.username = options.username || process.env.NEO4J_USER || 'neo4j';
    this.password = options.password || process.env.NEO4J_PASSWORD || 'likeisaid2024';
    this.database = options.database || process.env.NEO4J_DATABASE || 'memories';
    
    this.driver = null;
    this.connected = false;
    
    console.log(`Neo4j Connector initialized for ${this.uri}`);
  }

  /**
   * Connect to Neo4j database
   */
  async connect() {
    try {
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password),
        {
          connectionTimeout: 10000, // 10 seconds
          maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000, // 1 minute
        }
      );

      // Verify connectivity
      await this.driver.verifyConnectivity();
      this.connected = true;
      
      console.log('✅ Connected to Neo4j successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error.message);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Neo4j
   */
  async disconnect() {
    if (this.driver) {
      await this.driver.close();
      this.connected = false;
      console.log('🔌 Disconnected from Neo4j');
    }
  }

  /**
   * Get a database session
   */
  getSession(database = null) {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Call connect() first.');
    }
    
    return this.driver.session({ 
      database: database || this.database,
      defaultAccessMode: neo4j.session.WRITE 
    });
  }

  /**
   * Execute a Cypher query
   */
  async executeQuery(cypher, parameters = {}, database = null) {
    const session = this.getSession(database);
    
    try {
      const result = await session.run(cypher, parameters);
      return {
        records: result.records,
        summary: result.summary,
        success: true
      };
    } catch (error) {
      console.error('Query execution failed:', error.message);
      return {
        records: [],
        error: error.message,
        success: false
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Initialize database schema from schema.cypher file
   */
  async initializeSchema() {
    const schemaPath = path.join(process.cwd(), 'graph', 'schema.cypher');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️ Schema file not found at:', schemaPath);
      return false;
    }

    try {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Split into individual statements (simple approach)
      const statements = schemaContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('//'))
        .filter(stmt => stmt.length > 0);

      console.log(`📄 Executing ${statements.length} schema statements...`);

      for (const statement of statements) {
        if (statement.includes('CREATE CONSTRAINT') || 
            statement.includes('CREATE INDEX') || 
            statement.includes('CREATE FULLTEXT')) {
          
          const result = await this.executeQuery(statement);
          if (!result.success) {
            console.warn(`⚠️ Schema statement failed (may already exist): ${statement.substring(0, 50)}...`);
          }
        }
      }

      console.log('✅ Schema initialization completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize schema:', error.message);
      return false;
    }
  }

  /**
   * Create or update a memory node
   */
  async createMemoryNode(memory) {
    const cypher = `
      MERGE (m:Memory {id: $id})
      SET m.title = $title,
          m.content = $content,
          m.timestamp = datetime($timestamp),
          m.complexity = $complexity,
          m.priority = $priority,
          m.status = $status,
          m.file_path = $file_path,
          m.content_hash = $content_hash,
          m.access_count = $access_count,
          m.last_accessed = datetime($last_accessed),
          m.language = $language,
          m.updated_at = datetime()
      RETURN m
    `;

    const parameters = {
      id: memory.id,
      title: memory.title || memory.content?.substring(0, 50) || 'Untitled',
      content: memory.content || '',
      timestamp: memory.timestamp || new Date().toISOString(),
      complexity: memory.complexity || 1,
      priority: memory.priority || 'medium',
      status: memory.status || 'active',
      file_path: memory.file_path || '',
      content_hash: memory.content_hash || '',
      access_count: memory.access_count || 0,
      last_accessed: memory.last_accessed || memory.timestamp || new Date().toISOString(),
      language: memory.language || null
    };

    const result = await this.executeQuery(cypher, parameters);
    return result.success ? result.records[0]?.get('m') : null;
  }

  /**
   * Create or update a category node
   */
  async createCategoryNode(categoryName, metadata = {}) {
    const cypher = `
      MERGE (c:Category {name: $name})
      SET c.description = $description,
          c.created = coalesce(c.created, datetime()),
          c.color = $color,
          c.icon = $icon,
          c.updated_at = datetime()
      RETURN c
    `;

    const parameters = {
      name: categoryName,
      description: metadata.description || null,
      color: metadata.color || null,
      icon: metadata.icon || null
    };

    const result = await this.executeQuery(cypher, parameters);
    return result.success ? result.records[0]?.get('c') : null;
  }

  /**
   * Create relationship between memory and category
   */
  async connectMemoryToCategory(memoryId, categoryName) {
    const cypher = `
      MATCH (m:Memory {id: $memoryId})
      MERGE (c:Category {name: $categoryName})
      MERGE (m)-[:BELONGS_TO]->(c)
      RETURN m, c
    `;

    const result = await this.executeQuery(cypher, { memoryId, categoryName });
    return result.success;
  }

  /**
   * Create tags and connect to memory
   */
  async connectMemoryToTags(memoryId, tags) {
    if (!tags || tags.length === 0) return true;

    const cypher = `
      MATCH (m:Memory {id: $memoryId})
      UNWIND $tags as tagName
      MERGE (t:Tag {name: tagName})
      ON CREATE SET t.frequency = 1, t.first_used = datetime()
      ON MATCH SET t.frequency = t.frequency + 1
      MERGE (m)-[:TAGGED_WITH]->(t)
      RETURN count(t) as tagsConnected
    `;

    const result = await this.executeQuery(cypher, { memoryId, tags });
    return result.success;
  }

  /**
   * Find related memories using graph traversal
   */
  async findRelatedMemories(memoryId, depth = 2, limit = 10) {
    const cypher = `
      MATCH (m:Memory {id: $memoryId})
      MATCH path = (m)-[:RELATES_TO|:CONNECTS_TO|:TAGGED_WITH*1..${depth}]-(related:Memory)
      WHERE related.id <> $memoryId
      WITH related, 
           length(path) as pathLength,
           size((m)-[:TAGGED_WITH]->()<-[:TAGGED_WITH]-(related)) as sharedTags
      RETURN related, 
             pathLength,
             sharedTags,
             (sharedTags * 2 + (${depth + 1} - pathLength)) as relevanceScore
      ORDER BY relevanceScore DESC
      LIMIT $limit
    `;

    const result = await this.executeQuery(cypher, { memoryId, limit });
    
    if (result.success) {
      return result.records.map(record => ({
        memory: record.get('related').properties,
        pathLength: record.get('pathLength').toNumber(),
        sharedTags: record.get('sharedTags').toNumber(),
        relevanceScore: record.get('relevanceScore').toNumber()
      }));
    }
    
    return [];
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    const cypher = `
      MATCH (m:Memory)
      OPTIONAL MATCH (m)-[:BELONGS_TO]->(c:Category)
      OPTIONAL MATCH (m)-[:TAGGED_WITH]->(t:Tag)
      RETURN 
        count(DISTINCT m) as totalMemories,
        count(DISTINCT c) as totalCategories,
        count(DISTINCT t) as totalTags,
        avg(m.complexity) as avgComplexity,
        max(m.timestamp) as latestMemory,
        min(m.timestamp) as oldestMemory
    `;

    const result = await this.executeQuery(cypher);
    
    if (result.success && result.records.length > 0) {
      const record = result.records[0];
      return {
        totalMemories: record.get('totalMemories').toNumber(),
        totalCategories: record.get('totalCategories').toNumber(),
        totalTags: record.get('totalTags').toNumber(),
        avgComplexity: record.get('avgComplexity'),
        latestMemory: record.get('latestMemory'),
        oldestMemory: record.get('oldestMemory')
      };
    }
    
    return null;
  }

  /**
   * Search memories using full-text search
   */
  async searchMemories(query, limit = 20) {
    const cypher = `
      CALL db.index.fulltext.queryNodes("memory_content_search", $query) 
      YIELD node, score
      MATCH (node)-[:BELONGS_TO]->(c:Category)
      OPTIONAL MATCH (node)-[:TAGGED_WITH]->(t:Tag)
      RETURN node, score, c.name as category, collect(t.name) as tags
      ORDER BY score DESC
      LIMIT $limit
    `;

    const result = await this.executeQuery(cypher, { query, limit });
    
    if (result.success) {
      return result.records.map(record => ({
        memory: record.get('node').properties,
        score: record.get('score'),
        category: record.get('category'),
        tags: record.get('tags')
      }));
    }
    
    return [];
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.executeQuery('RETURN 1 as health');
      return {
        connected: this.connected,
        querySuccess: result.success,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Auto-detect relationships between memories
   */
  async detectRelationships(memoryId) {
    const cypher = `
      MATCH (m:Memory {id: $memoryId})
      MATCH (other:Memory) 
      WHERE other.id <> $memoryId
      
      // Find memories with shared tags
      WITH m, other, 
           size((m)-[:TAGGED_WITH]->()<-[:TAGGED_WITH]-(other)) as sharedTags
      WHERE sharedTags > 0
      
      // Create RELATES_TO relationship if strong connection
      FOREACH (_ IN CASE WHEN sharedTags >= 2 THEN [1] ELSE [] END |
        MERGE (m)-[:RELATES_TO {strength: sharedTags, auto_detected: true}]->(other)
      )
      
      RETURN count(*) as relationshipsCreated
    `;

    const result = await this.executeQuery(cypher, { memoryId });
    return result.success ? result.records[0]?.get('relationshipsCreated').toNumber() : 0;
  }
}