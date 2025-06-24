import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { TextEncoder, TextDecoder } from 'util';

// Metrics object to monitor the sanitizer's activity
const sanitizationMetrics = {
  filesProcessed: 0,
  bytesSanitized: 0,
  corruptionsFixed: 0,
  backupsCreated: 0,
};

// Log metrics periodically to the console
// Disabled to prevent JSON parse errors in MCP clients
// setInterval(() => {
//   if (sanitizationMetrics.filesProcessed > 0) {
//     console.log(`[Sanitization Stats] Files processed: ${sanitizationMetrics.filesProcessed} | Corruptions fixed: ${sanitizationMetrics.corruptionsFixed} | Backups: ${sanitizationMetrics.backupsCreated}`);
//   }
// }, 60000);

/**
 * Sanitizes a string by re-encoding it as UTF-8 and decoding it,
 * which replaces any invalid sequences with the Unicode replacement character (U+FFFD).
 * @param {string} content The string content to sanitize.
 * @returns {string} The sanitized content.
 */
export function sanitizeUnicode(content) {
  if (typeof content !== 'string') return content;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const buffer = encoder.encode(content);
  return decoder.decode(buffer);
}

/**
 * Creates a backup of a file before it is modified.
 * @param {string} filePath The path to the file to back up.
 * @param {string} originalContent The original content to store in the backup.
 */
async function createBackup(filePath, originalContent) {
  try {
    const memoriesPath = path.resolve('./memories');
    const backupDir = path.join(memoriesPath, '.backups', new Date().toISOString().slice(0, 10));
    await fs.promises.mkdir(backupDir, { recursive: true });
  
    const backupFileName = `${path.basename(filePath, '.md')}-${Date.now()}${path.extname(filePath)}`;
    const backupPath = path.join(backupDir, backupFileName);
    await fs.promises.writeFile(backupPath, originalContent, 'utf8');
    sanitizationMetrics.backupsCreated++;
  } catch (error) {
    // Suppress error logs to prevent JSON parse errors in MCP clients
    // console.error(`[Backup Error] Failed to create backup for ${filePath}:`, error);
  }
}

/**
 * Handles file change events from the watcher, sanitizing the file if necessary.
 * @param {string} filePath The path to the changed file.
 */
async function handleFileChange(filePath) {
  if (!filePath.endsWith('.md')) return;
  
  try {
    const originalContent = await fs.promises.readFile(filePath, 'utf8');
    const sanitizedContent = sanitizeUnicode(originalContent);
    
    sanitizationMetrics.filesProcessed++;

    if (sanitizedContent !== originalContent) {
      sanitizationMetrics.corruptionsFixed++;
      sanitizationMetrics.bytesSanitized += Buffer.byteLength(originalContent, 'utf8');
      
      await createBackup(filePath, originalContent);
      await fs.promises.writeFile(filePath, sanitizedContent, 'utf8');
      // Suppress logs to prevent JSON parse errors in MCP clients
      // console.log(`[Auto-Sanitized] Fixed and backed up: ${path.basename(filePath)}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') { // Ignore errors for files that were deleted quickly
        // Suppress error logs to prevent JSON parse errors in MCP clients
        // console.error(`[Sanitization Error] Failed to process ${filePath}:`, error);
    }
  }
}

/**
 * Initializes the Chokidar file watcher to monitor the memories directory.
 * @param {string} memoriesPath The path to the main memories directory.
 */
export function initSanitizationWatcher(memoriesPath) {
  // Suppress startup logs to prevent JSON parse errors in MCP clients
  // console.log(`[Auto-Sanitize] Initializing watcher for path: ${memoriesPath}`);
  const watcher = chokidar.watch(memoriesPath, {
    ignored: /(^|[\/\\])\..*|.*\.backups.*/, // Ignore dotfiles and backup directories
    persistent: true,
    ignoreInitial: true,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (path) => handleFileChange(path))
    .on('change', (path) => handleFileChange(path))
    .on('error', (error) => {
      // Log errors silently to avoid interfering with JSON-RPC
      // console.error(`[Watcher Error] ${error}`)
    });
  
  // Suppress startup logs to prevent JSON parse errors in MCP clients
  // console.log('[Auto-Sanitize] File watcher is now running.');
} 