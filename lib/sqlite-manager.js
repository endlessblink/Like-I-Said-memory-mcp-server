import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createDatabase } from './database-adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SQLite Manager for V3 Hierarchical Task Management
 * Now with automatic fallback: better-sqlite3 → sql.js → JSON
 */
export class SQLiteManager {
  constructor(dataDir = null, dbName = 'tasks-v3.db') {
    this.dataDir = dataDir || path.join(__dirname, '..', 'data');
    this.dbPath = path.join(this.dataDir, dbName);
    this.db = null;
    this.initialized = false;
    this.dbType = null;
  }

  /**
   * Initialize database connection with automatic fallback
   */
  async initialize() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Create database connection with automatic fallback
      this.db = await createDatabase(this.dbPath);
      
      // Log which database type we're using
      if (this.db.constructor.name === 'Database') {
        this.dbType = 'better-sqlite3';
      } else if (this.db.constructor.name === 'SqlJsAdapter') {
        this.dbType = 'sql.js';
      } else if (this.db.constructor.name === 'JsonDatabase') {
        this.dbType = 'json';
      } else {
        this.dbType = 'unknown';
      }
      
      // Enable WAL mode for concurrent access (only for real SQLite)
      if (this.dbType === 'better-sqlite3' || this.dbType === 'sql.js') {
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 1000000');
        this.db.pragma('temp_store = memory');
        this.db.pragma('wal_autocheckpoint = 1000');
      }
      
      // Create schema
      this.createSchema();
      
      this.initialized = true;
      console.log(`[SQLiteManager] Database initialized (type: ${this.dbType})`);
      
      // Add semantic_path column to existing databases
      this.addSemanticPathColumn();
      
      return true;
    } catch (error) {
      console.error('[SQLiteManager] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Add semantic_path column if it doesn't exist (for migration)
   */
  addSemanticPathColumn() {
    try {
      const tableInfo = this.db.pragma('table_info(tasks)');
      const hasSemanticPath = tableInfo.some(col => col.name === 'semantic_path');
      
      if (!hasSemanticPath) {
        console.log('[SQLiteManager] Adding semantic_path column for migration...');
        this.db.exec('ALTER TABLE tasks ADD COLUMN semantic_path TEXT');
        console.log('[SQLiteManager] semantic_path column added successfully');
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      if (!error.message.includes('no such table')) {
        console.error('[SQLiteManager] Error checking semantic_path column:', error);
      }
    }
  }

  /**
   * Create database schema with materialized paths
   */
  createSchema() {
    const schema = `
      -- Main tasks table with hierarchical support
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        level TEXT CHECK(level IN ('master', 'epic', 'task', 'subtask')) NOT NULL,
        parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        path TEXT NOT NULL, -- Materialized path: "001.003.002.001"
        path_order INTEGER NOT NULL DEFAULT 0, -- Order within parent
        status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'blocked')),
        project TEXT,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        semantic_path TEXT, -- Semantic folder path for the task
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_tasks_path ON tasks(path);
      CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_level ON tasks(level);
      CREATE INDEX IF NOT EXISTS idx_tasks_semantic_path ON tasks(semantic_path);

      -- Task memory connections
      CREATE TABLE IF NOT EXISTS task_memory_connections (
        task_id TEXT NOT NULL,
        memory_id TEXT NOT NULL,
        relevance_score REAL DEFAULT 0.5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, memory_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Update trigger for updated_at
      CREATE TRIGGER IF NOT EXISTS update_task_timestamp 
      AFTER UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `;

    this.db.exec(schema);
  }

  /**
   * Begin a database transaction
   */
  beginTransaction() {
    return this.db.prepare('BEGIN');
  }

  /**
   * Commit a database transaction
   */
  commit() {
    return this.db.prepare('COMMIT');
  }

  /**
   * Rollback a database transaction
   */
  rollback() {
    return this.db.prepare('ROLLBACK');
  }

  /**
   * Run a query with proper error handling
   */
  run(query, params = {}) {
    try {
      const stmt = this.db.prepare(query);
      return stmt.run(params);
    } catch (error) {
      console.error('[SQLiteManager] Query error:', error);
      throw error;
    }
  }

  /**
   * Get single row
   */
  get(query, params = {}) {
    try {
      const stmt = this.db.prepare(query);
      return stmt.get(params);
    } catch (error) {
      console.error('[SQLiteManager] Query error:', error);
      throw error;
    }
  }

  /**
   * Get all rows
   */
  all(query, params = {}) {
    try {
      const stmt = this.db.prepare(query);
      return stmt.all(params);
    } catch (error) {
      console.error('[SQLiteManager] Query error:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  transaction(fn) {
    return this.db.transaction(fn);
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    if (!this.db) throw new Error('Database not initialized');
    
    // Checkpoint WAL file
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    
    // Copy database file
    const dbBuffer = fs.readFileSync(this.dbPath);
    fs.writeFileSync(backupPath, dbBuffer);
    
    console.log(`[SQLiteManager] Database backed up to ${backupPath}`);
  }

  /**
   * Get database statistics
   */
  getStats() {
    if (!this.db) return null;
    
    const taskCount = this.get('SELECT COUNT(*) as count FROM tasks')?.count || 0;
    const levelCounts = this.all(`
      SELECT level, COUNT(*) as count 
      FROM tasks 
      GROUP BY level
    `);
    
    return {
      totalTasks: taskCount,
      levelCounts: levelCounts.reduce((acc, row) => {
        acc[row.level] = row.count;
        return acc;
      }, {}),
      dbSize: fs.statSync(this.dbPath).size,
      walSize: fs.existsSync(this.dbPath + '-wal') ? fs.statSync(this.dbPath + '-wal').size : 0
    };
  }
}

// Export singleton instance
export const sqliteManager = new SQLiteManager();