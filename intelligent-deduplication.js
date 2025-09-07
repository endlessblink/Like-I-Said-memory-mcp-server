#!/usr/bin/env node

/**
 * Intelligent Deduplication and Merging
 * 
 * Reduces 1,361 files in 117 projects down to clean, organized,
 * deduplicated structure with no redundant content.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Target locations
const MEMORIES_DIR = path.join(__dirname, 'memories');
const TASKS_DIR = path.join(__dirname, 'tasks');
const ARCHIVE_DIR = path.join(__dirname, 'archive');

// Results tracking
const deduplicationResults = {
  memoryFilesProcessed: 0,
  memoryDuplicatesRemoved: 0,
  memoryProjectsMerged: 0,
  taskProjectsMerged: 0,
  archivedProjects: 0,
  finalMemoryCount: 0,
  finalTaskCount: 0
};

// Project consolidation mapping
const PROJECT_CONSOLIDATION_MAP = {
  // Like-I-Said consolidation (merge all versions)
  'like-i-said': [
    'like-i-said-mcp', 'like-i-said-v2', 'like-i-said-v3', 'like-i-said-v4',
    'like-i-said-memory', 'like-i-said-memory-v2', 'like-i-said-memory-mcp-server',
    'like-i-said-mcp-server', 'like-i-said-mcp-troubleshooting',
    'like-i-said-dashboard', 'like-i-said-dashboard-ux', 'like-i-said-fixes',
    'like-i-said-python-port', 'like-i-said-dxt', 'Like-I-said-mcp-server-v2',
    'LikeISaidV2', 'like-i-said-mcp-dashboard-redesign'
  ],
  
  // Pomo consolidation (merge all variants)
  'Pomo': ['Pomo', 'Pomo-TaskFlow', 'Pomo-Consolidation', 'Pomo-MultiView', 'Pomo-Development'],
  
  // Palladio consolidation (merge all variants)
  'Palladio': [
    'Palladio', 'palladio', 'palladio-minimal', 'Palladio-minimal', 
    'palladio-gen', 'palladio-gen-platform', 'Palladio-ComfyUI-Integration',
    'Palladio Minimal - Repository Management', 'palladio-minimal-repository-management'
  ],
  
  // Bina-Bekitzur consolidation  
  'Bina-Bekitzur': [
    'bina-bekitzur', 'bina-bekitzur-main', 'bina-bekitzur-site',
    'bina-bekitzur-ai-tools-grid', 'bina-ai-spark', 'bina-bekitzur-audit'
  ],
  
  // RoughCut consolidation (already well organized, just clean duplicates)
  'RoughCut-MCP': [
    'rough-cut-mcp', 'rough-cut-mcp-artifacts', 'rough-cut-mcp-audio',
    'rough-cut-mcp-cleanup', 'rough-cut-mcp-consolidation', 'rough-cut-mcp-core',
    'rough-cut-mcp-design-prism', 'rough-cut-mcp-design-system', 'rough-cut-mcp-local',
    'roughcut-mcp-enhancement'
  ]
};

// Projects to archive (test/obsolete projects)
const ARCHIVE_PROJECTS = [
  'test', 'test-project', 'testing', 'test-integration', 'test-v3-updates',
  'test-ai-assistant', 'v3-integration-test', 'integration-test',
  'demo-project', 'quick-test', 'release-test', 'persistence-test',
  'proxy-test', 'schema-validation-test', 'mcp-test', 'mcp-testing',
  'mcp-tools-test', 'automation-test', 'final-validation'
];

function safeExists(path) {
  try { return fs.existsSync(path); } catch { return false; }
}

function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Create hash of just the main content (ignore dates/timestamps)
    const mainContent = content.replace(/\d{4}-\d{2}-\d{2}T[\d:.-]+Z/g, 'DATE')
                             .replace(/timestamp: .+/g, 'timestamp: DATE')
                             .replace(/created: .+/g, 'created: DATE')
                             .replace(/updated: .+/g, 'updated: DATE');
    return crypto.createHash('sha256').update(mainContent).digest('hex').substring(0, 16);
  } catch {
    return null;
  }
}

function getMemoryContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse frontmatter if exists
    let frontmatter = {};
    let bodyContent = content;
    
    if (content.startsWith('---')) {
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd > 0) {
        const frontmatterText = content.substring(4, frontmatterEnd);
        bodyContent = content.substring(frontmatterEnd + 3).trim();
        
        // Parse YAML-like frontmatter
        frontmatterText.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        });
      }
    }
    
    return { frontmatter, content: bodyContent, fullContent: content };
  } catch (error) {
    return null;
  }
}

// Archive obsolete projects
function archiveObsoleteProjects() {
  console.log('🗄️ Archiving obsolete and test projects...\n');
  
  if (!safeExists(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.mkdirSync(path.join(ARCHIVE_DIR, 'memories'), { recursive: true });
    fs.mkdirSync(path.join(ARCHIVE_DIR, 'tasks'), { recursive: true });
  }
  
  ARCHIVE_PROJECTS.forEach(projectName => {
    const memoryProject = path.join(MEMORIES_DIR, projectName);
    const taskProject = path.join(TASKS_DIR, projectName);
    
    // Archive memory project if exists
    if (safeExists(memoryProject)) {
      const archiveMemoryTarget = path.join(ARCHIVE_DIR, 'memories', projectName);
      try {
        fs.renameSync(memoryProject, archiveMemoryTarget);
        console.log(`  📦 Archived memory project: ${projectName}`);
        deduplicationResults.archivedProjects++;
      } catch (error) {
        console.log(`  ❌ Could not archive ${projectName}: ${error.message}`);
      }
    }
    
    // Archive task project if exists
    if (safeExists(taskProject)) {
      const archiveTaskTarget = path.join(ARCHIVE_DIR, 'tasks', projectName);
      try {
        fs.renameSync(taskProject, archiveTaskTarget);
        console.log(`  📦 Archived task project: ${projectName}`);
      } catch (error) {
        console.log(`  ❌ Could not archive task ${projectName}: ${error.message}`);
      }
    }
  });
}

// Merge similar projects intelligently
function mergeProjectGroups() {
  console.log('\\n🔗 Merging related project groups...\\n');
  
  Object.entries(PROJECT_CONSOLIDATION_MAP).forEach(([targetProject, sourceProjects]) => {
    console.log(`📂 Merging into ${targetProject}:`);
    console.log(`  Sources: ${sourceProjects.join(', ')}`);
    
    // Create target directories
    const targetMemoryDir = path.join(MEMORIES_DIR, targetProject);
    const targetTaskDir = path.join(TASKS_DIR, targetProject);
    
    if (!safeExists(targetMemoryDir)) {
      fs.mkdirSync(targetMemoryDir, { recursive: true });
    }
    if (!safeExists(targetTaskDir)) {
      fs.mkdirSync(targetTaskDir, { recursive: true });
    }
    
    // Merge memories from all source projects
    let mergedMemories = [];
    const memoryHashes = new Set();
    
    sourceProjects.forEach(sourceProject => {
      const sourceMemoryDir = path.join(MEMORIES_DIR, sourceProject);
      
      if (safeExists(sourceMemoryDir)) {
        const memoryFiles = fs.readdirSync(sourceMemoryDir).filter(f => f.endsWith('.md'));
        
        memoryFiles.forEach(memFile => {
          const sourcePath = path.join(sourceMemoryDir, memFile);
          const memoryData = getMemoryContent(sourcePath);
          
          if (memoryData) {
            const contentHash = getFileHash(sourcePath);
            
            if (!memoryHashes.has(contentHash)) {
              memoryHashes.add(contentHash);
              
              // Update project in frontmatter
              memoryData.frontmatter.project = targetProject;
              
              // Create merged content with updated frontmatter
              const frontmatterText = Object.entries(memoryData.frontmatter)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\\n');
              
              const mergedContent = `---\\n${frontmatterText}\\n---\\n${memoryData.content}`;
              
              mergedMemories.push({
                filename: memFile,
                content: mergedContent,
                timestamp: fs.statSync(sourcePath).mtime
              });
            } else {
              deduplicationResults.memoryDuplicatesRemoved++;
            }
          }
        });
        
        // Delete source directory after merging
        if (sourceProject !== targetProject) {
          try {
            fs.rmSync(sourceMemoryDir, { recursive: true, force: true });
            console.log(`    🗑️ Removed source: ${sourceProject} (memories)`);
          } catch (error) {
            console.log(`    ⚠️ Could not remove ${sourceProject}: ${error.message}`);
          }
        }
      }
    });
    
    // Write merged memories (keep only newest if duplicate filenames)
    const filenameMap = new Map();
    mergedMemories.forEach(memory => {
      const existing = filenameMap.get(memory.filename);
      if (!existing || memory.timestamp > existing.timestamp) {
        filenameMap.set(memory.filename, memory);
      }
    });
    
    filenameMap.forEach((memory, filename) => {
      const targetPath = path.join(targetMemoryDir, filename);
      try {
        fs.writeFileSync(targetPath, memory.content);
        deduplicationResults.finalMemoryCount++;
      } catch (error) {
        console.log(`    ❌ Error writing ${filename}: ${error.message}`);
      }
    });
    
    console.log(`  ✅ Merged ${filenameMap.size} unique memories, removed ${deduplicationResults.memoryDuplicatesRemoved} duplicates`);
    
    // Merge tasks from all source projects
    let allTasks = [];
    const taskIds = new Set();
    
    sourceProjects.forEach(sourceProject => {
      const sourceTaskDir = path.join(TASKS_DIR, sourceProject);
      const tasksFile = path.join(sourceTaskDir, 'tasks.json');
      
      if (safeExists(tasksFile)) {
        try {
          const taskData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
          const tasks = Array.isArray(taskData) ? taskData : [taskData];
          
          tasks.forEach(task => {
            if (!taskIds.has(task.id)) {
              task.project = targetProject; // Update project reference
              allTasks.push(task);
              taskIds.add(task.id);
            } else {
              // Update existing task if this one is newer
              const existingIndex = allTasks.findIndex(t => t.id === task.id);
              const existing = allTasks[existingIndex];
              
              const taskDate = new Date(task.updated || task.created || 0);
              const existingDate = new Date(existing.updated || existing.created || 0);
              
              if (taskDate > existingDate) {
                task.project = targetProject;
                allTasks[existingIndex] = task;
              }
            }
          });
        } catch (error) {
          console.log(`    ⚠️ Could not read tasks from ${sourceProject}: ${error.message}`);
        }
        
        // Delete source task directory after merging
        if (sourceProject !== targetProject) {
          try {
            fs.rmSync(sourceTaskDir, { recursive: true, force: true });
            console.log(`    🗑️ Removed source: ${sourceProject} (tasks)`);
          } catch (error) {
            console.log(`    ⚠️ Could not remove ${sourceProject}: ${error.message}`);
          }
        }
      }
    });
    
    // Write merged tasks
    if (allTasks.length > 0) {
      const targetTasksFile = path.join(targetTaskDir, 'tasks.json');
      fs.writeFileSync(targetTasksFile, JSON.stringify(allTasks, null, 2));
      console.log(`  ✅ Merged ${allTasks.length} unique tasks`);
      deduplicationResults.finalTaskCount++;
    }
    
    deduplicationResults.memoryProjectsMerged += sourceProjects.length;
    deduplicationResults.taskProjectsMerged += sourceProjects.length;
    console.log('');
  });
}

// Remove exact duplicate memory files
function deduplicateMemoryFiles() {
  console.log('🔍 Removing exact duplicate memory files...\\n');
  
  const allMemoryProjects = fs.readdirSync(MEMORIES_DIR).filter(name => 
    !name.startsWith('.') && fs.statSync(path.join(MEMORIES_DIR, name)).isDirectory()
  );
  
  const contentHashes = new Map(); // hash -> {project, filename, path}
  const duplicatesToRemove = [];
  
  // Build hash map of all memory files
  allMemoryProjects.forEach(project => {
    const projectDir = path.join(MEMORIES_DIR, project);
    const memoryFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
    
    memoryFiles.forEach(memFile => {
      const filePath = path.join(projectDir, memFile);
      const hash = getFileHash(filePath);
      
      if (hash) {
        if (contentHashes.has(hash)) {
          // Duplicate found - mark for removal (keep first found)
          duplicatesToRemove.push(filePath);
          console.log(`  🔄 Duplicate: ${project}/${memFile} (same as ${contentHashes.get(hash).project}/${contentHashes.get(hash).filename})`);
        } else {
          contentHashes.set(hash, { project, filename: memFile, path: filePath });
        }
        deduplicationResults.memoryFilesProcessed++;
      }
    });
  });
  
  // Remove duplicates
  duplicatesToRemove.forEach(filePath => {
    try {
      fs.unlinkSync(filePath);
      deduplicationResults.memoryDuplicatesRemoved++;
    } catch (error) {
      console.log(`  ❌ Could not remove duplicate ${filePath}: ${error.message}`);
    }
  });
  
  console.log(`\\n✅ Processed ${deduplicationResults.memoryFilesProcessed} memory files`);
  console.log(`🗑️ Removed ${deduplicationResults.memoryDuplicatesRemoved} exact duplicates`);
}

// Clean up empty directories
function cleanupEmptyDirectories() {
  console.log('\\n🧹 Cleaning up empty directories...\\n');
  
  [MEMORIES_DIR, TASKS_DIR].forEach(baseDir => {
    const projects = fs.readdirSync(baseDir).filter(name => 
      fs.statSync(path.join(baseDir, name)).isDirectory()
    );
    
    projects.forEach(project => {
      const projectDir = path.join(baseDir, project);
      const files = fs.readdirSync(projectDir);
      
      if (files.length === 0) {
        try {
          fs.rmdirSync(projectDir);
          console.log(`  🗑️ Removed empty directory: ${project}`);
        } catch (error) {
          console.log(`  ⚠️ Could not remove empty ${project}: ${error.message}`);
        }
      }
    });
  });
}

// Generate final deduplication report
function generateDeduplicationReport() {
  console.log('\\n' + '='.repeat(80));
  console.log('🎯 INTELLIGENT DEDUPLICATION COMPLETE');
  console.log('='.repeat(80));
  
  // Count final results
  const finalMemoryProjects = fs.readdirSync(MEMORIES_DIR).filter(name => 
    fs.statSync(path.join(MEMORIES_DIR, name)).isDirectory()
  ).length;
  
  const finalTaskProjects = fs.readdirSync(TASKS_DIR).filter(name => 
    fs.statSync(path.join(TASKS_DIR, name)).isDirectory()
  ).length;
  
  const finalMemoryFiles = parseInt(require('child_process').execSync(
    `find "${MEMORIES_DIR}" -name "*.md" | wc -l`, { encoding: 'utf8' }
  ).trim());
  
  console.log(`\\n📊 DEDUPLICATION RESULTS:`);
  console.log(`  🧠 Memory projects: 103 → ${finalMemoryProjects}`);
  console.log(`  📋 Task projects: 14 → ${finalTaskProjects}`);
  console.log(`  📄 Memory files: 1,361 → ${finalMemoryFiles}`);
  console.log(`  🗑️ Duplicates removed: ${deduplicationResults.memoryDuplicatesRemoved}`);
  console.log(`  📦 Projects archived: ${deduplicationResults.archivedProjects}`);
  
  console.log(`\\n🏆 CONSOLIDATION GROUPS CREATED:`);
  Object.keys(PROJECT_CONSOLIDATION_MAP).forEach(targetProject => {
    const memDir = path.join(MEMORIES_DIR, targetProject);
    const taskDir = path.join(TASKS_DIR, targetProject);
    
    const memCount = safeExists(memDir) ? fs.readdirSync(memDir).filter(f => f.endsWith('.md')).length : 0;
    const hasTask = safeExists(path.join(taskDir, 'tasks.json'));
    
    console.log(`  📂 ${targetProject}: ${memCount} memories${hasTask ? ' + tasks' : ''}`);
  });
  
  console.log(`\\n✅ OPTIMIZED STORAGE:`);
  console.log(`  📍 Location: ${__dirname}`);
  console.log(`  🎯 Result: Clean, organized, no duplicates`);
  console.log(`  🚀 Ready for universal access testing`);
}

// Main deduplication process
async function intelligentDeduplication() {
  console.log('🧠 Starting Intelligent Deduplication and Merging...');
  console.log(`📊 Processing 1,361 memory files in 117 projects`);
  console.log(`🎯 Target: Clean, organized, deduplicated storage\\n`);
  
  try {
    // Step 1: Archive obsolete projects
    archiveObsoleteProjects();
    
    // Step 2: Merge project groups
    mergeProjectGroups();
    
    // Step 3: Remove exact duplicates
    deduplicateMemoryFiles();
    
    // Step 4: Cleanup empty directories
    cleanupEmptyDirectories();
    
    // Step 5: Generate final report
    generateDeduplicationReport();
    
    console.log('\\n🎉 Intelligent deduplication complete!');
    console.log('✅ Universal storage optimized and ready for use');
    
  } catch (error) {
    console.error('❌ Deduplication failed:', error.message);
    process.exit(1);
  }
}

intelligentDeduplication();