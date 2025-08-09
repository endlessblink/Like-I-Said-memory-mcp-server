/**
 * Memory Deduplication API Tests
 * Tests the enhanced deduplication API endpoints
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { MemoryDeduplicator } from '../lib/memory-deduplicator.js';

// Mock the MemoryDeduplicator
jest.mock('../lib/memory-deduplicator.js');

describe('Memory Deduplication API', () => {
  let app;
  let mockDeduplicator;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock deduplicator instance
    mockDeduplicator = {
      previewDeduplication: jest.fn(),
      deduplicateMemories: jest.fn()
    };
    
    MemoryDeduplicator.mockImplementation(() => mockDeduplicator);

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());

    // Add the deduplication routes
    app.post('/api/memories/deduplicate', async (req, res) => {
      try {
        const { previewOnly = false } = req.body;
        const deduplicator = new MemoryDeduplicator(null);
        
        if (previewOnly) {
          const duplicates = await deduplicator.previewDeduplication();
          
          res.json({
            preview: true,
            totalToRemove: duplicates.totalDuplicateFiles || 0,
            statistics: {
              totalMemories: duplicates.totalMemories || 0,
              uniqueMemories: duplicates.uniqueMemories || 0,
              duplicatedIds: duplicates.duplicatedIds || 0,
              totalDuplicateFiles: duplicates.totalDuplicateFiles || 0
            },
            duplicateGroups: duplicates.duplicates || []
          });
        } else {
          const result = await deduplicator.deduplicateMemories();
          
          res.json({
            success: true,
            filesRemoved: result.filesRemoved || 0,
            duplicatesRemoved: result.duplicateFiles || 0,
            message: `Successfully removed ${result.filesRemoved || 0} duplicate files`
          });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/memories/duplicates', async (req, res) => {
      try {
        const deduplicator = new MemoryDeduplicator(null);
        const duplicates = await deduplicator.previewDeduplication();
        
        const response = {
          totalDuplicates: duplicates.totalDuplicateFiles || 0,
          statistics: {
            totalMemories: duplicates.totalMemories || 0,
            uniqueMemories: duplicates.uniqueMemories || 0,
            duplicatedIds: duplicates.duplicatedIds || 0
          },
          groups: (duplicates.duplicates || []).map(group => ({
            id: group.id,
            originalFile: group.keepFile,
            duplicates: group.removeFiles,
            duplicateCount: group.removeFiles.length
          }))
        };
        
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  describe('POST /api/memories/deduplicate', () => {
    it('should return preview data when previewOnly is true', async () => {
      // Mock preview response
      mockDeduplicator.previewDeduplication.mockResolvedValue({
        totalMemories: 100,
        uniqueMemories: 90,
        duplicatedIds: 5,
        totalDuplicateFiles: 10,
        duplicates: [
          {
            id: 'test-id',
            keepFile: 'memory1.md',
            removeFiles: ['memory1-dup.md', 'memory1-dup2.md']
          }
        ]
      });

      const response = await request(app)
        .post('/api/memories/deduplicate')
        .send({ previewOnly: true })
        .expect(200);

      expect(response.body).toMatchObject({
        preview: true,
        totalToRemove: 10,
        statistics: {
          totalMemories: 100,
          uniqueMemories: 90,
          duplicatedIds: 5,
          totalDuplicateFiles: 10
        },
        duplicateGroups: [
          {
            id: 'test-id',
            keepFile: 'memory1.md',
            removeFiles: ['memory1-dup.md', 'memory1-dup2.md']
          }
        ]
      });
    });

    it('should perform actual deduplication when previewOnly is false', async () => {
      // Mock deduplication response
      mockDeduplicator.deduplicateMemories.mockResolvedValue({
        totalMemories: 100,
        duplicatedIds: 5,
        duplicateFiles: 10,
        filesRemoved: 10,
        errors: []
      });

      const response = await request(app)
        .post('/api/memories/deduplicate')
        .send({ previewOnly: false })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        filesRemoved: 10,
        message: expect.stringContaining('Successfully removed 10 duplicate files')
      });

      expect(mockDeduplicator.deduplicateMemories).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockDeduplicator.previewDeduplication.mockRejectedValue(
        new Error('Storage error')
      );

      const response = await request(app)
        .post('/api/memories/deduplicate')
        .send({ previewOnly: true })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Storage error'
      });
    });
  });

  describe('GET /api/memories/duplicates', () => {
    it('should return duplicate detection results', async () => {
      mockDeduplicator.previewDeduplication.mockResolvedValue({
        totalMemories: 50,
        uniqueMemories: 45,
        duplicatedIds: 2,
        totalDuplicateFiles: 5,
        duplicates: [
          {
            id: 'dup-id-1',
            keepFile: 'original1.md',
            removeFiles: ['dup1.md', 'dup2.md']
          },
          {
            id: 'dup-id-2',
            keepFile: 'original2.md',
            removeFiles: ['dup3.md']
          }
        ]
      });

      const response = await request(app)
        .get('/api/memories/duplicates')
        .expect(200);

      expect(response.body).toMatchObject({
        totalDuplicates: 5,
        statistics: {
          totalMemories: 50,
          uniqueMemories: 45,
          duplicatedIds: 2
        },
        groups: [
          {
            id: 'dup-id-1',
            originalFile: 'original1.md',
            duplicates: ['dup1.md', 'dup2.md'],
            duplicateCount: 2
          },
          {
            id: 'dup-id-2',
            originalFile: 'original2.md',
            duplicates: ['dup3.md'],
            duplicateCount: 1
          }
        ]
      });
    });

    it('should handle no duplicates found', async () => {
      mockDeduplicator.previewDeduplication.mockResolvedValue({
        totalMemories: 30,
        uniqueMemories: 30,
        duplicatedIds: 0,
        totalDuplicateFiles: 0,
        duplicates: []
      });

      const response = await request(app)
        .get('/api/memories/duplicates')
        .expect(200);

      expect(response.body).toEqual({
        totalDuplicates: 0,
        statistics: {
          totalMemories: 30,
          uniqueMemories: 30,
          duplicatedIds: 0
        },
        groups: []
      });
    });
  });
});