import fs from 'fs';
import path from 'path';

/**
 * JSON Database - Pure JavaScript fallback database
 * Implements the same API as better-sqlite3 for compatibility
 */
export class JsonDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      tables: {},
      metadata: {
        version: 1,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };
    this.transactions = [];
    this.inTransaction = false;
  }

  /**
   * Initialize the JSON database
   */
  async initialize() {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing data if file exists
    if (fs.existsSync(this.dbPath)) {
      try {
        const content = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(content);
        console.log('[JsonDatabase] Loaded existing database');
      } catch (error) {
        console.error('[JsonDatabase] Failed to load existing data:', error);
        // Start fresh if corrupted
      }
    }

    console.log('[JsonDatabase] Initialized');
    return this;
  }

  /**
   * Save database to file
   */
  save() {
    try {
      this.data.metadata.lastModified = new Date().toISOString();
      const content = JSON.stringify(this.data, null, 2);
      
      // Write to temp file first, then rename (atomic)
      const tempPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tempPath, content);
      fs.renameSync(tempPath, this.dbPath);
    } catch (error) {
      console.error('[JsonDatabase] Save failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL-like commands (basic implementation)
   */
  exec(sql) {
    const upperSql = sql.trim().toUpperCase();
    
    if (upperSql.startsWith('CREATE TABLE')) {
      this.createTable(sql);
    } else if (upperSql.startsWith('CREATE INDEX')) {
      // Indexes not needed for JSON, but don't error
      console.log('[JsonDatabase] Index creation ignored (not needed for JSON)');
    } else if (upperSql.startsWith('ALTER TABLE')) {
      // Basic ALTER TABLE support
      console.log('[JsonDatabase] ALTER TABLE ignored (schema-less JSON)');
    } else if (upperSql.startsWith('BEGIN')) {
      this.inTransaction = true;
      this.transactions = [];
    } else if (upperSql.startsWith('COMMIT')) {
      this.inTransaction = false;
      this.save();
    } else if (upperSql.startsWith('ROLLBACK')) {
      this.inTransaction = false;
      this.transactions = [];
    }
    
    return this;
  }

  /**
   * Create a table from SQL
   */
  createTable(sql) {
    // Extract table name from CREATE TABLE statement
    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (match) {
      const tableName = match[1];
      if (!this.data.tables[tableName]) {
        this.data.tables[tableName] = {
          rows: [],
          nextId: 1,
          schema: sql
        };
        this.save();
        console.log(`[JsonDatabase] Created table: ${tableName}`);
      }
    }
  }

  /**
   * Prepare a statement (returns a statement-like object)
   */
  prepare(sql) {
    return new JsonStatement(this, sql);
  }

  /**
   * Run pragma commands (compatibility)
   */
  pragma(sql) {
    // Most pragmas don't apply to JSON, return empty
    console.log(`[JsonDatabase] Pragma ignored: ${sql}`);
    return [];
  }

  /**
   * Create a transaction function
   */
  transaction(fn) {
    return (...args) => {
      this.inTransaction = true;
      const backup = JSON.parse(JSON.stringify(this.data));
      
      try {
        const result = fn(...args);
        this.inTransaction = false;
        this.save();
        return result;
      } catch (error) {
        // Rollback
        this.data = backup;
        this.inTransaction = false;
        throw error;
      }
    };
  }

  /**
   * Close the database
   */
  close() {
    this.save();
    console.log('[JsonDatabase] Closed');
  }
}

/**
 * Statement class for JSON database
 */
class JsonStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.type = this.determineType(sql);
    this.parsed = this.parseSQL(sql);
  }

  /**
   * Determine statement type
   */
  determineType(sql) {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT')) return 'SELECT';
    if (upper.startsWith('INSERT')) return 'INSERT';
    if (upper.startsWith('UPDATE')) return 'UPDATE';
    if (upper.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  /**
   * Basic SQL parsing
   */
  parseSQL(sql) {
    const parsed = {
      table: null,
      columns: [],
      where: null,
      values: [],
      orderBy: null,
      limit: null
    };

    // Extract table name
    let tableMatch;
    if (this.type === 'SELECT' || this.type === 'DELETE') {
      tableMatch = sql.match(/FROM\s+(\w+)/i);
    } else if (this.type === 'INSERT') {
      tableMatch = sql.match(/INTO\s+(\w+)/i);
    } else if (this.type === 'UPDATE') {
      tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    }
    
    if (tableMatch) {
      parsed.table = tableMatch[1];
    }

    // Extract WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      parsed.where = whereMatch[1];
    }

    // Extract ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
    if (orderMatch) {
      parsed.orderBy = orderMatch[1];
    }

    // Extract LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      parsed.limit = parseInt(limitMatch[1]);
    }

    return parsed;
  }

  /**
   * Apply WHERE clause to filter rows
   */
  applyWhere(rows, where, params) {
    if (!where) return rows;

    return rows.filter(row => {
      // Simple WHERE implementation
      // Handle: column = ?, column = value, column IS NULL, etc.
      
      // Replace ? with params
      let condition = where;
      let paramIndex = 0;
      
      condition = condition.replace(/\?/g, () => {
        if (paramIndex < params.length) {
          const value = params[paramIndex++];
          if (typeof value === 'string') {
            return `'${value}'`;
          }
          return value;
        }
        return '?';
      });

      // Evaluate simple conditions
      // This is a basic implementation - real SQL WHERE is much more complex
      const simpleMatch = condition.match(/(\w+)\s*=\s*(.+)/);
      if (simpleMatch) {
        const [_, column, value] = simpleMatch;
        const cleanValue = value.replace(/['"]/g, '');
        return row[column] == cleanValue;
      }

      // Handle IS NULL
      const nullMatch = condition.match(/(\w+)\s+IS\s+NULL/i);
      if (nullMatch) {
        return row[nullMatch[1]] == null;
      }

      // Handle IS NOT NULL
      const notNullMatch = condition.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (notNullMatch) {
        return row[notNullMatch[1]] != null;
      }

      // Default to true if we can't parse the WHERE
      console.log(`[JsonDatabase] Warning: Could not parse WHERE clause: ${condition}`);
      return true;
    });
  }

  /**
   * Run the statement (INSERT, UPDATE, DELETE)
   */
  run(...params) {
    const table = this.db.data.tables[this.parsed.table];
    if (!table && this.type !== 'OTHER') {
      throw new Error(`Table ${this.parsed.table} does not exist`);
    }

    let changes = 0;
    let lastInsertRowid = null;

    if (this.type === 'INSERT') {
      // Parse INSERT statement
      const valuesMatch = this.sql.match(/VALUES\s*\((.*?)\)/i);
      if (valuesMatch) {
        const row = {};
        const columnsMatch = this.sql.match(/\(([^)]+)\)\s+VALUES/i);
        
        if (columnsMatch) {
          const columns = columnsMatch[1].split(',').map(c => c.trim());
          columns.forEach((col, i) => {
            row[col] = params[i];
          });
        }
        
        // Add auto-increment id if not provided
        if (!row.id) {
          row.id = `json-${table.nextId++}`;
        }
        
        table.rows.push(row);
        lastInsertRowid = row.id;
        changes = 1;
      }
    } else if (this.type === 'UPDATE') {
      // Parse SET clause
      const setMatch = this.sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
      if (setMatch) {
        const filtered = this.applyWhere(table.rows, this.parsed.where, params);
        filtered.forEach(row => {
          // Apply updates
          // This is simplified - real SQL UPDATE is more complex
          const assignments = setMatch[1].split(',');
          assignments.forEach(assignment => {
            const [column, value] = assignment.split('=').map(s => s.trim());
            if (column && value) {
              row[column] = value === '?' ? params.shift() : value.replace(/['"]/g, '');
            }
          });
          changes++;
        });
      }
    } else if (this.type === 'DELETE') {
      const filtered = this.applyWhere(table.rows, this.parsed.where, params);
      filtered.forEach(row => {
        const index = table.rows.indexOf(row);
        if (index > -1) {
          table.rows.splice(index, 1);
          changes++;
        }
      });
    }

    if (changes > 0) {
      this.db.save();
    }

    return { changes, lastInsertRowid };
  }

  /**
   * Get a single row
   */
  get(...params) {
    if (this.type !== 'SELECT') {
      return undefined;
    }

    const table = this.db.data.tables[this.parsed.table];
    if (!table) {
      return undefined;
    }

    const filtered = this.applyWhere(table.rows, this.parsed.where, params);
    return filtered[0] || undefined;
  }

  /**
   * Get all rows
   */
  all(...params) {
    if (this.type !== 'SELECT') {
      return [];
    }

    const table = this.db.data.tables[this.parsed.table];
    if (!table) {
      return [];
    }

    let filtered = this.applyWhere(table.rows, this.parsed.where, params);
    
    // Apply ORDER BY (simplified)
    if (this.parsed.orderBy) {
      const orderMatch = this.parsed.orderBy.match(/(\w+)(?:\s+(ASC|DESC))?/i);
      if (orderMatch) {
        const [_, column, direction] = orderMatch;
        filtered.sort((a, b) => {
          if (direction?.toUpperCase() === 'DESC') {
            return b[column] > a[column] ? 1 : -1;
          }
          return a[column] > b[column] ? 1 : -1;
        });
      }
    }

    // Apply LIMIT
    if (this.parsed.limit) {
      filtered = filtered.slice(0, this.parsed.limit);
    }

    return filtered;
  }

  /**
   * Iterate over results
   */
  *iterate(...params) {
    const rows = this.all(...params);
    for (const row of rows) {
      yield row;
    }
  }
}