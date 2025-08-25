import path from 'path';
import fs from 'fs';

/**
 * Database Adapter - Intelligent database selection with fallback
 * Tries better-sqlite3 first, falls back to sql.js, then JSON if needed
 */
export class DatabaseAdapter {
  constructor(dbPath, options = {}) {
    this.dbPath = dbPath;
    this.options = options;
    this.db = null;
    this.type = null;
    this.initialized = false;
  }

  /**
   * Initialize the database with automatic fallback
   */
  async initialize() {
    if (this.initialized) return this.db;

    // Check for environment variable to force specific database
    const forceDb = process.env.LIKE_I_SAID_DB || process.env.USE_SQLJS;
    
    if (forceDb === 'sqljs' || forceDb === 'true') {
      console.log('[DatabaseAdapter] Using sql.js (forced by environment)');
      return await this.initSqlJs();
    }

    // Try better-sqlite3 first (fastest, if it works)
    try {
      console.log('[DatabaseAdapter] Attempting to use better-sqlite3...');
      return await this.initBetterSqlite3();
    } catch (error) {
      console.log('[DatabaseAdapter] better-sqlite3 failed:', error.message);
      
      // Check if it's a version mismatch error
      if (error.message?.includes('NODE_MODULE_VERSION') || 
          error.message?.includes('was compiled against a different Node.js version')) {
        console.log('[DatabaseAdapter] Node.js version mismatch detected, switching to sql.js...');
      }
    }

    // Try sql.js as fallback
    try {
      console.log('[DatabaseAdapter] Attempting to use sql.js...');
      return await this.initSqlJs();
    } catch (error) {
      console.log('[DatabaseAdapter] sql.js failed:', error.message);
    }

    // Final fallback to JSON
    console.log('[DatabaseAdapter] Falling back to JSON database...');
    return await this.initJsonDb();
  }

  /**
   * Initialize better-sqlite3
   */
  async initBetterSqlite3() {
    try {
      // Dynamic import to avoid errors if module fails
      const Database = (await import('better-sqlite3')).default;
      
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      this.db = new Database(this.dbPath);
      this.type = 'better-sqlite3';
      this.initialized = true;
      
      console.log('[DatabaseAdapter] Successfully initialized better-sqlite3');
      return this.db;
    } catch (error) {
      // Re-throw to trigger fallback
      throw error;
    }
  }

  /**
   * Initialize sql.js
   */
  async initSqlJs() {
    try {
      // Import our sql.js adapter
      const createSqlJsDatabase = (await import('./sql-js-adapter.js')).default;
      
      // Check if we need to migrate from existing better-sqlite3 database
      if (fs.existsSync(this.dbPath) && !this.dbPath.endsWith('.sqljs')) {
        await this.migrateTosqlJs();
      }
      
      // Use .sqljs extension for sql.js databases
      const sqlJsPath = this.dbPath.endsWith('.sqljs') 
        ? this.dbPath 
        : this.dbPath.replace(/\.db$/, '.sqljs');
      
      this.db = await createSqlJsDatabase(sqlJsPath);
      this.type = 'sql.js';
      this.initialized = true;
      
      console.log('[DatabaseAdapter] Successfully initialized sql.js');
      return this.db;
    } catch (error) {
      // Re-throw to trigger next fallback
      throw error;
    }
  }

  /**
   * Initialize JSON database as last resort
   */
  async initJsonDb() {
    try {
      // Import JSON database implementation
      const { JsonDatabase } = await import('./json-database.js');
      
      // Use .json extension for JSON databases
      const jsonPath = this.dbPath.replace(/\.db$/, '.json');
      
      this.db = new JsonDatabase(jsonPath);
      await this.db.initialize();
      
      this.type = 'json';
      this.initialized = true;
      
      console.log('[DatabaseAdapter] Successfully initialized JSON database');
      return this.db;
    } catch (error) {
      console.error('[DatabaseAdapter] All database options failed!');
      throw new Error('Failed to initialize any database: ' + error.message);
    }
  }

  /**
   * Migrate existing better-sqlite3 database to sql.js format
   */
  async migrateTosqlJs() {
    console.log('[DatabaseAdapter] Migrating existing database to sql.js format...');
    
    try {
      // Try to read the existing database with better-sqlite3
      const Database = (await import('better-sqlite3')).default;
      const sourceDb = new Database(this.dbPath, { readonly: true });
      
      // Get all tables
      const tables = sourceDb.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();
      
      // Export all data
      const exportData = {};
      for (const table of tables) {
        exportData[table.name] = {
          schema: table.sql,
          data: sourceDb.prepare(`SELECT * FROM ${table.name}`).all()
        };
      }
      
      sourceDb.close();
      
      // Save export for sql.js to import
      const exportPath = this.dbPath + '.export.json';
      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      
      console.log('[DatabaseAdapter] Database exported for sql.js migration');
      
      // The sql.js adapter will import this data on initialization
      return exportData;
    } catch (error) {
      console.log('[DatabaseAdapter] Migration skipped (source database not accessible)');
      // Not critical - sql.js will create a new database
    }
  }

  /**
   * Get database type for logging/debugging
   */
  getType() {
    return this.type;
  }

  /**
   * Check if database is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get the underlying database instance
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Close the database
   */
  close() {
    if (this.db && this.db.close) {
      this.db.close();
    }
    this.initialized = false;
    this.db = null;
    this.type = null;
  }
}

/**
 * Factory function for creating a database with automatic fallback
 */
export async function createDatabase(dbPath, options = {}) {
  const adapter = new DatabaseAdapter(dbPath, options);
  await adapter.initialize();
  return adapter.getDatabase();
}

// Also export the adapter class as default
export default DatabaseAdapter;