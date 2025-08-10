import { EnhancedHybridTaskManager } from '../src/v3/models/EnhancedHybridTaskManager.js';

async function createSemanticFolderTask() {
  const manager = new EnhancedHybridTaskManager();
  try {
    await manager.initialize();
    
    // Find the Phase 1 epic
    const phase1Epic = manager.db.db.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).get('9964a4d2-3032-49b2-a5b5-1ffe1e8732e3');
    
    if (!phase1Epic) {
      console.error('Phase 1 epic not found!');
      return;
    }
    
    // Create the semantic folder implementation task
    const task = await manager.createTask({
      title: 'Implement Semantic Folder Structure',
      description: `## Objective
Implement the research-backed semantic folder structure with platform-specific safeguards and auto-organization capabilities.

## Implementation Plan
Based on extensive Perplexity research, we need to implement a production-ready folder structure that handles 10,000+ files efficiently across all platforms.

## Key Components
1. **V3PathManager** - Platform-aware path validation and construction
2. **AtomicFolderOperations** - EXDEV-aware atomic moves with rollback
3. **V3FolderMonitor** - Auto-splitting when folders exceed limits
4. **V3FileWatcher** - Optimized Chokidar configuration
5. **Migration Scripts** - Move existing files to semantic structure`,
      
      level: 'task',
      parent_id: phase1Epic.id,
      project: 'like-i-said-v3',
      priority: 'high',
      status: 'todo',
      
      estimated_hours: 12,
      tags: ['folders', 'architecture', 'cross-platform', 'file-system'],
      
      acceptance_criteria: [
        'All paths validated against platform limits (Win 200, Mac 900)',
        'Folders auto-split at 5K files (Win) or 10K (Mac/Linux)',
        'EXDEV errors handled gracefully with transaction logs',
        'File watching excludes archived and temp files',
        'Migration preserves all existing task relationships',
        'Zero data loss during folder reorganization'
      ],
      
      technical_requirements: [
        'Use path.join() exclusively for path construction',
        'Implement UNC prefix for Windows long paths',
        'Unicode normalization (NFC) for all filenames',
        'Case-insensitive operations for cross-platform',
        'Atomic writes with temp file + rename pattern',
        'Transaction logs for rollback capability',
        'Chokidar with 2-second debouncing',
        'Maximum 3 levels of folder nesting'
      ],
      
      checklist: [
        'Create V3PathManager class with platform detection',
        'Implement path validation and sanitization',
        'Create AtomicFolderOperations with EXDEV handling',
        'Add transaction logging for rollback',
        'Implement V3FolderMonitor with auto-splitting',
        'Configure Chokidar with optimal settings',
        'Create migration script for existing files',
        'Add comprehensive error handling',
        'Write unit tests for all components',
        'Test on Windows, macOS, and Linux'
      ],
      
      context: {
        documentation: '/docs/v3/semantic-folder-architecture.md',
        related_files: [
          'lib/v3-path-manager.js',
          'lib/v3-folder-operations.js',
          'lib/v3-folder-monitor.js',
          'scripts/migrate-to-semantic-folders.js'
        ],
        research_references: [
          'Perplexity research on cross-platform folders',
          'VS Code file watching patterns',
          'Git atomic operations',
          'Ripgrep/fd search optimization'
        ]
      },
      
      dependencies: [], // Can start immediately
      
      metadata: {
        platform_limits: {
          win32: { maxPath: 200, maxFiles: 5000 },
          darwin: { maxPath: 900, maxFiles: 10000 },
          linux: { maxPath: 3900, maxFiles: 50000 }
        },
        folder_structure: {
          'active/': 'Current work, auto-split when large',
          'archived/YYYY-QQ/': 'Completed work by quarter',
          'metadata/': 'Indexes and monitoring data'
        },
        performance_targets: {
          file_watching: '50K files max per watcher',
          search_response: '<2 seconds for 10K files',
          folder_split_threshold: '5K files triggers split'
        }
      }
    });
    
    console.log('✅ Created task:', task.title);
    console.log('📁 Task ID:', task.id);
    console.log('🌳 Path:', task.path);
    
  } finally {
    manager.close();
  }
}

createSemanticFolderTask().catch(console.error);