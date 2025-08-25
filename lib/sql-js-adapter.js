import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SQL.js Adapter that mimics better-sqlite3 API
 * Provides compatibility layer for seamless migration
 */
export class SqlJsAdapter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.SQL = null;
    this.initialized = false;
    this.statements = new Map(); // Cache prepared statements
  }

  /**
   * Initialize sql.js with WASM
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize sql.js with multiple fallback locations for WASM file
      this.SQL = await initSqlJs({
        locateFile: file => {
          // Try multiple locations for the WASM file
          const locations = [
            // First try node_modules in project root
            path.join(__dirname, '../node_modules/sql.js/dist/', file),
            // Try current working directory
            path.join(process.cwd(), 'node_modules/sql.js/dist/', file),
            // Try relative to this file
            path.join(__dirname, '../node_modules/sql.js/dist/', file),
            // Fallback to CDN if local files not found
            `https://cdn.jsdelivr.net/npm/sql.js@latest/dist/${file}`
          ];

          // Return first existing location or CDN fallback
          for (const loc of locations.slice(0, -1)) {
            if (fs.existsSync(loc)) {
              console.log(`[SqlJsAdapter] Loading WASM from: ${loc}`);
              return loc;
            }
          }
          
          console.log(`[SqlJsAdapter] Using CDN fallback for WASM`);
          return locations[locations.length - 1];
        }
      });

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        console.log(`[SqlJsAdapter] Loading existing database from: ${this.dbPath}`);
        const data = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(data);
      } else {
        console.log(`[SqlJsAdapter] Creating new database`);
        this.db = new this.SQL.Database();
      }

      this.initialized = true;
      console.log('[SqlJsAdapter] Initialized successfully');
    } catch (error) {
      console.error('[SqlJsAdapter] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Save database to file
   */
  save() {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write to temp file first, then rename (atomic operation)
      const tempPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, this.dbPath);
      
      console.log(`[SqlJsAdapter] Database saved to: ${this.dbPath}`);
    } catch (error) {
      console.error('[SqlJsAdapter] Save failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL (compatible with better-sqlite3's exec)
   */
  exec(sql) {
    try {
      this.db.exec(sql);
      this.save(); // Auto-save after structural changes
      return this;
    } catch (error) {
      console.error('[SqlJsAdapter] Exec failed:', error);
      throw error;
    }
  }

  /**
   * Prepare statement (compatible with better-sqlite3's prepare)
   */
  prepare(sql) {
    // Return a statement-like object that mimics better-sqlite3
    return new SqlJsStatement(this, sql);
  }

  /**
   * Run pragma commands (compatible with better-sqlite3's pragma)
   */
  pragma(sql) {
    try {
      const result = this.db.exec(`PRAGMA ${sql}`);
      if (result.length > 0 && result[0].values.length > 0) {
        // Return format similar to better-sqlite3
        return result[0].values.map(row => {
          const obj = {};
          result[0].columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    } catch (error) {
      console.error('[SqlJsAdapter] Pragma failed:', error);
      throw error;
    }
  }

  /**
   * Create a transaction function (compatible with better-sqlite3)
   */
  transaction(fn) {
    return (...args) => {
      try {
        this.db.exec('BEGIN');
        const result = fn(...args);
        this.db.exec('COMMIT');
        this.save();
        return result;
      } catch (error) {
        try {
          this.db.exec('ROLLBACK');
        } catch (rollbackError) {
          // Ignore rollback errors if transaction wasn't started
        }
        throw error;
      }
    };
  }

  /**
   * Close the database
   */
  close() {
    if (this.db) {
      this.save(); // Save before closing
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[SqlJsAdapter] Database closed');
    }
  }
}

/**
 * Statement class that mimics better-sqlite3's Statement
 */
class SqlJsStatement {
  constructor(adapter, sql) {
    this.adapter = adapter;
    this.sql = sql;
    this.stmt = null;
  }

  /**
   * Bind parameters and prepare for execution
   */
  _bind(params = []) {
    // Ensure params is always an array
    if (!Array.isArray(params)) {
      params = [params];
    }
    
    // Replace ? with actual values for sql.js
    let boundSql = this.sql;
    let paramIndex = 0;
    
    boundSql = boundSql.replace(/\?/g, () => {
      if (paramIndex < params.length) {
        const value = params[paramIndex++];
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          // Escape single quotes in strings
          return `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === 'boolean') {
          return value ? '1' : '0';
        } else {
          return value.toString();
        }
      }
      return '?';
    });
    
    return boundSql;
  }

  /**
   * Run the statement (INSERT, UPDATE, DELETE)
   */
  run(...params) {
    try {
      const boundSql = this._bind(params);
      this.adapter.db.run(boundSql);
      
      // Get last insert rowid and changes for compatibility
      const changes = this.adapter.db.getRowsModified();
      const lastInsertRowid = this.adapter.db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
      
      // Auto-save after modifications
      this.adapter.save();
      
      return {
        changes,
        lastInsertRowid
      };
    } catch (error) {
      console.error('[SqlJsStatement] Run failed:', error);
      throw error;
    }
  }

  /**
   * Get a single row
   */
  get(...params) {
    try {
      const boundSql = this._bind(params);
      const result = this.adapter.db.exec(boundSql);
      
      if (result.length > 0 && result[0].values.length > 0) {
        // Convert to object format like better-sqlite3
        const row = {};
        result[0].columns.forEach((col, i) => {
          row[col] = result[0].values[0][i];
        });
        return row;
      }
      
      return undefined;
    } catch (error) {
      console.error('[SqlJsStatement] Get failed:', error);
      throw error;
    }
  }

  /**
   * Get all rows
   */
  all(...params) {
    try {
      const boundSql = this._bind(params);
      const result = this.adapter.db.exec(boundSql);
      
      if (result.length > 0) {
        // Convert to array of objects like better-sqlite3
        return result[0].values.map(row => {
          const obj = {};
          result[0].columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      
      return [];
    } catch (error) {
      console.error('[SqlJsStatement] All failed:', error);
      throw error;
    }
  }

  /**
   * Iterate over results (generator function)
   */
  *iterate(...params) {
    const rows = this.all(...params);
    for (const row of rows) {
      yield row;
    }
  }
}

// Export a factory function that matches better-sqlite3's usage
export default function createSqlJsDatabase(dbPath, options = {}) {
  const adapter = new SqlJsAdapter(dbPath);
  
  // Return a promise that resolves to the adapter
  // This allows async initialization while maintaining similar API
  return adapter.initialize().then(() => adapter);
}