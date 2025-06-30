#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Neo4jConnector } from '../lib/neo4j-connector.js';
import { MemoryFormat } from '../lib/memory-format.js';

class Neo4jMigration {
  constructor() {
    this.neo4j = new Neo4jConnector();
    this.memoryFormat = new MemoryFormat();
    this.stats = {
      totalMemories: 0,
      migratedMemories: 0,
      categoriesCreated: 0,
      tagsCreated: 0,
      relationshipsCreated: 0,
      errors: []
    };
  }

  /**
   * Main migration function
   */
  async migrate() {
    console.log('🚀 Starting Neo4j migration...\n');

    try {
      // Step 1: Connect to Neo4j
      console.log('1️⃣ Connecting to Neo4j...');
      await this.neo4j.connect();

      // Step 2: Initialize schema
      console.log('2️⃣ Initializing database schema...');
      await this.neo4j.initializeSchema();

      // Step 3: Discover and count memories
      console.log('3️⃣ Discovering existing memories...');
      const memoryFiles = await this.discoverMemoryFiles();
      this.stats.totalMemories = memoryFiles.length;
      console.log(`   Found ${memoryFiles.length} memory files`);

      // Step 4: Migrate memories
      console.log('4️⃣ Migrating memories to Neo4j...');
      await this.migrateMemories(memoryFiles);

      // Step 5: Create relationships
      console.log('5️⃣ Creating relationships...');
      await this.createRelationships();

      // Step 6: Display results
      this.displayResults();

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.error(error.stack);
    } finally {
      await this.neo4j.disconnect();
    }
  }

  /**
   * Discover all memory files
   */
  async discoverMemoryFiles() {
    const memoriesDir = path.join(process.cwd(), 'memories');
    const memoryFiles = [];

    if (!fs.existsSync(memoriesDir)) {
      throw new Error('Memories directory not found: ' + memoriesDir);
    }

    // Recursive function to find all .md files
    const findMemoryFiles = (dir, category = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Use directory name as category
          const subCategory = category ? `${category}/${entry.name}` : entry.name;
          findMemoryFiles(fullPath, subCategory);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          memoryFiles.push({
            filePath: fullPath,
            fileName: entry.name,
            category: category || 'default',
            relativePath: path.relative(memoriesDir, fullPath)
          });
        }
      }
    };

    findMemoryFiles(memoriesDir);
    return memoryFiles;
  }

  /**
   * Migrate all memory files to Neo4j
   */
  async migrateMemories(memoryFiles) {
    const progressBar = this.createProgressBar(memoryFiles.length);
    let processed = 0;

    for (const fileInfo of memoryFiles) {
      try {
        await this.migrateMemoryFile(fileInfo);
        this.stats.migratedMemories++;
      } catch (error) {
        this.stats.errors.push({
          file: fileInfo.relativePath,
          error: error.message
        });
        console.error(`\n   ❌ Failed to migrate ${fileInfo.relativePath}: ${error.message}`);
      }

      processed++;
      progressBar(processed);
    }

    console.log(''); // New line after progress bar
  }

  /**
   * Migrate a single memory file
   */
  async migrateMemoryFile(fileInfo) {
    // Read and parse the memory file
    const content = fs.readFileSync(fileInfo.filePath, 'utf8');
    const parsed = this.memoryFormat.parseMemory(content);

    // Generate content hash
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Prepare memory data for Neo4j
    const memoryData = {
      id: parsed.metadata.id || this.generateMemoryId(fileInfo),
      title: parsed.metadata.title || this.extractTitle(content),
      content: parsed.content,
      timestamp: parsed.metadata.timestamp || this.extractTimestamp(fileInfo),
      complexity: parsed.metadata.complexity || 1,
      priority: parsed.metadata.priority || 'medium',
      status: parsed.metadata.status || 'active',
      file_path: fileInfo.relativePath,
      content_hash: contentHash,
      access_count: parsed.metadata.access_count || 0,
      last_accessed: parsed.metadata.last_accessed || parsed.metadata.timestamp,
      language: parsed.metadata.language || this.detectLanguage(content)
    };

    // Create memory node
    await this.neo4j.createMemoryNode(memoryData);

    // Create category and connect
    await this.neo4j.createCategoryNode(fileInfo.category);
    await this.neo4j.connectMemoryToCategory(memoryData.id, fileInfo.category);

    // Create tags and connect
    if (parsed.metadata.tags && parsed.metadata.tags.length > 0) {
      await this.neo4j.connectMemoryToTags(memoryData.id, parsed.metadata.tags);
    }

    // Auto-detect relationships
    const relationshipsCreated = await this.neo4j.detectRelationships(memoryData.id);
    this.stats.relationshipsCreated += relationshipsCreated;
  }

  /**
   * Create additional relationships between memories
   */
  async createRelationships() {
    // This could be enhanced with more sophisticated relationship detection
    console.log('   Creating temporal relationships...');
    
    const cypher = `
      MATCH (m1:Memory), (m2:Memory)
      WHERE m1.id <> m2.id 
        AND m1.timestamp < m2.timestamp
        AND duration.between(m1.timestamp, m2.timestamp).days < 7
      OPTIONAL MATCH (m1)-[:BELONGS_TO]->(c)<-[:BELONGS_TO]-(m2)
      WHERE c IS NOT NULL
      WITH m1, m2, count(c) as sameCategory
      WHERE sameCategory > 0
      MERGE (m1)-[:PRECEDES {temporal: true, days_apart: duration.between(m1.timestamp, m2.timestamp).days}]->(m2)
      RETURN count(*) as temporalRelationships
    `;

    const result = await this.neo4j.executeQuery(cypher);
    if (result.success && result.records.length > 0) {
      const temporal = result.records[0].get('temporalRelationships').toNumber();
      this.stats.relationshipsCreated += temporal;
      console.log(`   Created ${temporal} temporal relationships`);
    }
  }

  /**
   * Generate a memory ID from file info
   */
  generateMemoryId(fileInfo) {
    // Create ID from filename and category
    const baseName = path.basename(fileInfo.fileName, '.md');
    const categorySlug = fileInfo.category.replace(/[^a-zA-Z0-9]/g, '_');
    return `${categorySlug}_${baseName}`;
  }

  /**
   * Extract title from content
   */
  extractTitle(content) {
    // Look for markdown title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Use first line if no title found
    const firstLine = content.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  /**
   * Extract timestamp from file info
   */
  extractTimestamp(fileInfo) {
    // Try to extract date from filename
    const dateMatch = fileInfo.fileName.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return new Date(dateMatch[1]).toISOString();
    }

    // Use file modification time
    const stats = fs.statSync(fileInfo.filePath);
    return stats.mtime.toISOString();
  }

  /**
   * Detect programming language from content
   */
  detectLanguage(content) {
    if (content.includes('```javascript') || content.includes('```js')) return 'javascript';
    if (content.includes('```python') || content.includes('```py')) return 'python';
    if (content.includes('```typescript') || content.includes('```ts')) return 'typescript';
    if (content.includes('```java')) return 'java';
    if (content.includes('```bash') || content.includes('```sh')) return 'bash';
    if (content.includes('```sql')) return 'sql';
    if (content.includes('```cypher')) return 'cypher';
    if (content.includes('```json')) return 'json';
    if (content.includes('```yaml') || content.includes('```yml')) return 'yaml';
    return null;
  }

  /**
   * Create a simple progress bar
   */
  createProgressBar(total) {
    return (current) => {
      const percentage = Math.round((current / total) * 100);
      const filled = Math.round(percentage / 2);
      const bar = '█'.repeat(filled) + '░'.repeat(50 - filled);
      process.stdout.write(`\r   Progress: [${bar}] ${percentage}% (${current}/${total})`);
    };
  }

  /**
   * Display migration results
   */
  displayResults() {
    console.log('\n📊 Migration Results:');
    console.log('='.repeat(50));
    console.log(`✅ Total memories processed: ${this.stats.totalMemories}`);
    console.log(`✅ Successfully migrated: ${this.stats.migratedMemories}`);
    console.log(`✅ Relationships created: ${this.stats.relationshipsCreated}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`❌ Errors encountered: ${this.stats.errors.length}`);
      this.stats.errors.forEach(error => {
        console.log(`   - ${error.file}: ${error.error}`);
      });
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📍 Next steps:');
    console.log('   1. Start Neo4j: docker-compose -f docker-compose.neo4j.yml up -d');
    console.log('   2. Access Neo4j Browser: http://localhost:7474');
    console.log('   3. Login with: neo4j / likeisaid2024');
    console.log('   4. Explore your knowledge graph!');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new Neo4jMigration();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Migration interrupted by user');
    await migration.neo4j.disconnect();
    process.exit(0);
  });

  migration.migrate();
}

export { Neo4jMigration };