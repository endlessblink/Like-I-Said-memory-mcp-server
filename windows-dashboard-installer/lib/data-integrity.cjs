/**
 * Data Integrity Protection System
 * Ensures real memories and tasks are never lost or corrupted
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DataIntegrity {
  constructor(baseDir = 'memories', taskDir = 'tasks') {
    this.baseDir = baseDir;
    this.taskDir = taskDir;
    this.integrityDir = path.join(process.cwd(), '.data-integrity');
    this.checksumFile = path.join(this.integrityDir, 'checksums.json');
    this.verificationLog = path.join(this.integrityDir, 'verification.log');
    this.checksums = new Map();
    
    this.init();
  }

  init() {
    // Ensure integrity directory exists
    if (!fs.existsSync(this.integrityDir)) {
      fs.mkdirSync(this.integrityDir, { recursive: true });
    }

    // Load existing checksums
    this.loadChecksums();
    
    if (process.env.DEBUG_MCP) console.error('🔐 Data Integrity Protection initialized');
  }

  loadChecksums() {
    try {
      if (fs.existsSync(this.checksumFile)) {
        const data = fs.readFileSync(this.checksumFile, 'utf8');
        const checksumData = JSON.parse(data);
        this.checksums = new Map(Object.entries(checksumData));
      }
    } catch (error) {
      console.error('Failed to load checksums:', error);
      this.checksums = new Map();
    }
  }

  saveChecksums() {
    try {
      const checksumData = Object.fromEntries(this.checksums);
      fs.writeFileSync(this.checksumFile, JSON.stringify(checksumData, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save checksums:', error);
    }
  }

  calculateFileChecksum(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.error(`Failed to calculate checksum for ${filePath}:`, error);
      return null;
    }
  }

  calculateContentChecksum(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  verifyFileIntegrity(filePath) {
    const currentChecksum = this.calculateFileChecksum(filePath);
    const storedChecksum = this.checksums.get(filePath);
    
    if (!currentChecksum) {
      return { valid: false, reason: 'Unable to calculate checksum' };
    }

    if (!storedChecksum) {
      // New file, store its checksum
      this.checksums.set(filePath, {
        checksum: currentChecksum,
        created: new Date().toISOString(),
        lastVerified: new Date().toISOString()
      });
      this.saveChecksums();
      return { valid: true, reason: 'New file registered' };
    }

    const isValid = currentChecksum === storedChecksum.checksum;
    
    // Update last verified time
    storedChecksum.lastVerified = new Date().toISOString();
    this.checksums.set(filePath, storedChecksum);
    this.saveChecksums();

    return {
      valid: isValid,
      reason: isValid ? 'Checksum verified' : 'Checksum mismatch - file may be corrupted',
      storedChecksum: storedChecksum.checksum,
      currentChecksum
    };
  }

  protectFile(filePath, content = null) {
    try {
      let checksum;
      
      if (content) {
        // Calculate checksum from content before writing
        checksum = this.calculateContentChecksum(content);
      } else if (fs.existsSync(filePath)) {
        // Calculate checksum from existing file
        checksum = this.calculateFileChecksum(filePath);
      } else {
        throw new Error('File does not exist and no content provided');
      }

      this.checksums.set(filePath, {
        checksum,
        created: new Date().toISOString(),
        lastVerified: new Date().toISOString(),
        protected: true
      });

      this.saveChecksums();
      this.logVerification(`PROTECTED: ${filePath} (${checksum})`);
      
      return true;
    } catch (error) {
      console.error(`Failed to protect file ${filePath}:`, error);
      return false;
    }
  }

  verifyAllFiles() {
    const results = {
      valid: [],
      invalid: [],
      missing: [],
      total: 0
    };

    for (const [filePath, checksumData] of this.checksums) {
      results.total++;
      
      if (!fs.existsSync(filePath)) {
        results.missing.push({
          path: filePath,
          reason: 'File missing',
          lastSeen: checksumData.lastVerified
        });
        continue;
      }

      const verification = this.verifyFileIntegrity(filePath);
      
      if (verification.valid) {
        results.valid.push({
          path: filePath,
          verified: verification.reason
        });
      } else {
        results.invalid.push({
          path: filePath,
          reason: verification.reason,
          stored: verification.storedChecksum,
          current: verification.currentChecksum
        });
      }
    }

    this.logVerification(`VERIFICATION COMPLETE: ${results.valid.length} valid, ${results.invalid.length} invalid, ${results.missing.length} missing`);
    
    return results;
  }

  scanAndProtectNewFiles() {
    const protectedFiles = [];
    
    // Scan memory files
    if (fs.existsSync(this.baseDir)) {
      this.scanDirectory(this.baseDir, protectedFiles);
    }
    
    // Scan task files
    if (fs.existsSync(this.taskDir)) {
      this.scanDirectory(this.taskDir, protectedFiles);
    }

    // Protect important system files
    const systemFiles = [
      'task-index.json',
      'package.json',
      'server-markdown.js'
    ];

    systemFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath) && !this.checksums.has(filePath)) {
        if (this.protectFile(filePath)) {
          protectedFiles.push(filePath);
        }
      }
    });

    if (protectedFiles.length > 0) {
      if (process.env.DEBUG_MCP) console.error(`🔐 Protected ${protectedFiles.length} new files`);
    }

    return protectedFiles;
  }

  scanDirectory(dirPath, protectedFiles) {
    try {
      const entries = fs.readdirSync(dirPath);
      
      entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry);
        const stat = fs.lstatSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(fullPath, protectedFiles);
        } else if (stat.isFile() && (entry.endsWith('.md') || entry.endsWith('.json'))) {
          if (!this.checksums.has(fullPath)) {
            if (this.protectFile(fullPath)) {
              protectedFiles.push(fullPath);
            }
          }
        }
      });
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  detectCorruption() {
    const verification = this.verifyAllFiles();
    const corruption = {
      corrupted: verification.invalid,
      missing: verification.missing,
      hasIssues: verification.invalid.length > 0 || verification.missing.length > 0
    };

    if (corruption.hasIssues) {
      this.logVerification(`CORRUPTION DETECTED: ${corruption.corrupted.length} corrupted, ${corruption.missing.length} missing files`);
      console.error('🚨 Data corruption detected!', corruption);
    }

    return corruption;
  }

  repairCorruption(backupDir) {
    if (!backupDir || !fs.existsSync(backupDir)) {
      throw new Error('Valid backup directory required for corruption repair');
    }

    const corruption = this.detectCorruption();
    const repaired = [];

    // Attempt to repair corrupted files
    corruption.corrupted.forEach(corruptedFile => {
      try {
        const relativePath = path.relative(process.cwd(), corruptedFile.path);
        const backupPath = path.join(backupDir, relativePath);
        
        if (fs.existsSync(backupPath)) {
          // Verify backup file integrity
          const backupChecksum = this.calculateFileChecksum(backupPath);
          const expectedChecksum = this.checksums.get(corruptedFile.path)?.checksum;
          
          if (backupChecksum === expectedChecksum) {
            // Restore from backup
            fs.copyFileSync(backupPath, corruptedFile.path);
            repaired.push(corruptedFile.path);
            this.logVerification(`REPAIRED: ${corruptedFile.path} from backup`);
          }
        }
      } catch (error) {
        console.error(`Failed to repair ${corruptedFile.path}:`, error);
      }
    });

    // Attempt to restore missing files
    corruption.missing.forEach(missingFile => {
      try {
        const relativePath = path.relative(process.cwd(), missingFile.path);
        const backupPath = path.join(backupDir, relativePath);
        
        if (fs.existsSync(backupPath)) {
          // Ensure parent directory exists
          const parentDir = path.dirname(missingFile.path);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          
          fs.copyFileSync(backupPath, missingFile.path);
          repaired.push(missingFile.path);
          this.logVerification(`RESTORED: ${missingFile.path} from backup`);
        }
      } catch (error) {
        console.error(`Failed to restore ${missingFile.path}:`, error);
      }
    });

    return repaired;
  }

  logVerification(message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp}: ${message}\n`;
      fs.appendFileSync(this.verificationLog, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write verification log:', error);
    }
  }

  getIntegrityStatus() {
    const verification = this.verifyAllFiles();
    return {
      totalFiles: verification.total,
      validFiles: verification.valid.length,
      corruptedFiles: verification.invalid.length,
      missingFiles: verification.missing.length,
      integrityScore: verification.total > 0 ? (verification.valid.length / verification.total) * 100 : 100,
      lastCheck: new Date().toISOString()
    };
  }
}

module.exports = { DataIntegrity };