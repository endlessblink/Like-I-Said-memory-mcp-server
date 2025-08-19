import fs from 'fs';
import path from 'path';

/**
 * Memory deduplication utility to clean up duplicate memory files
 */
export class MemoryDeduplicator {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Find and remove duplicate memories
   * Keeps the newest version of each memory ID
   */
  async deduplicateMemories() {
    const memories = await this.storage.listMemories();
    
    // Group memories by ID
    const memoryGroups = new Map();
    for (const memory of memories) {
      if (!memoryGroups.has(memory.id)) {
        memoryGroups.set(memory.id, []);
      }
      memoryGroups.get(memory.id).push(memory);
    }

    const results = {
      totalMemories: memories.length,
      duplicatedIds: 0,
      duplicateFiles: 0,
      filesRemoved: 0,
      errors: []
    };

    for (const [id, duplicates] of memoryGroups) {
      if (duplicates.length > 1) {
        results.duplicatedIds++;
        results.duplicateFiles += duplicates.length;

        // Sort by timestamp to keep the newest
        duplicates.sort((a, b) => {
          const aTime = new Date(a.timestamp || a.created || 0).getTime();
          const bTime = new Date(b.timestamp || b.created || 0).getTime();
          return bTime - aTime;
        });

        // Keep the first (newest) and remove the rest
        const toKeep = duplicates[0];
        const toRemove = duplicates.slice(1);

        console.error(`Found ${duplicates.length} duplicates for memory ${id}, keeping newest: ${toKeep.filepath}`);

        for (const duplicate of toRemove) {
          try {
            if (fs.existsSync(duplicate.filepath)) {
              fs.unlinkSync(duplicate.filepath);
              results.filesRemoved++;
              console.error(`Removed duplicate: ${duplicate.filepath}`);
            }
          } catch (error) {
            console.error(`Error removing duplicate ${duplicate.filepath}:`, error);
            results.errors.push({
              file: duplicate.filepath,
              error: error.message
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Preview what would be removed without actually removing files
   */
  async previewDeduplication() {
    const memories = await this.storage.listMemories();
    
    // Group memories by ID
    const memoryGroups = new Map();
    for (const memory of memories) {
      if (!memoryGroups.has(memory.id)) {
        memoryGroups.set(memory.id, []);
      }
      memoryGroups.get(memory.id).push(memory);
    }

    const duplicates = [];
    for (const [id, memoryList] of memoryGroups) {
      if (memoryList.length > 1) {
        // Sort by timestamp to identify which would be kept
        memoryList.sort((a, b) => {
          const aTime = new Date(a.timestamp || a.created || 0).getTime();
          const bTime = new Date(b.timestamp || b.created || 0).getTime();
          return bTime - aTime;
        });

        const toKeep = memoryList[0];
        const toRemove = memoryList.slice(1);

        duplicates.push({
          id,
          totalFiles: memoryList.length,
          keepFile: toKeep.filepath,
          removeFiles: toRemove.map(m => m.filepath)
        });
      }
    }

    return {
      totalMemories: memories.length,
      uniqueMemories: memoryGroups.size,
      duplicatedIds: duplicates.length,
      totalDuplicateFiles: duplicates.reduce((sum, d) => sum + d.removeFiles.length, 0),
      duplicates: duplicates.slice(0, 10) // Show first 10 for preview
    };
  }
}