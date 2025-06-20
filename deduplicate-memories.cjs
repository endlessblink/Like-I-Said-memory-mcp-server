const fs = require('fs');
const path = require('path');

console.log('🔍 Starting memory deduplication...');

const memoriesDir = './memories';
const memoryMap = new Map(); // id -> file info
const duplicates = [];

// Recursively find all markdown files
function findMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Find all markdown files
const allFiles = findMarkdownFiles(memoriesDir);
console.log(`📁 Found ${allFiles.length} markdown files`);

// Process each file
allFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const idMatch = content.match(/id: (\w+)/);
    
    if (idMatch) {
      const id = idMatch[1];
      const stat = fs.statSync(filePath);
      const fileInfo = {
        path: filePath,
        size: stat.size,
        mtime: stat.mtime,
        content: content.substring(0, 200) // Preview
      };
      
      if (memoryMap.has(id)) {
        // Duplicate found
        const existing = memoryMap.get(id);
        duplicates.push({
          id,
          existing: existing.path,
          duplicate: filePath,
          existingSize: existing.size,
          duplicateSize: fileInfo.size,
          existingTime: existing.mtime,
          duplicateTime: fileInfo.mtime
        });
        
        // Keep the newer/larger file
        if (fileInfo.mtime > existing.mtime || fileInfo.size > existing.size) {
          console.log(`🔄 Replacing ${existing.path} with ${filePath} (newer/larger)`);
          memoryMap.set(id, fileInfo);
        }
      } else {
        memoryMap.set(id, fileInfo);
      }
    } else {
      console.log(`⚠️  No ID found in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n📊 Deduplication Analysis:`);
console.log(`- Total files: ${allFiles.length}`);
console.log(`- Unique memories: ${memoryMap.size}`);
console.log(`- Duplicates found: ${duplicates.length}`);

if (duplicates.length > 0) {
  console.log(`\n🗑️  Duplicate Files to Remove:`);
  
  duplicates.forEach(dup => {
    console.log(`\nID: ${dup.id}`);
    console.log(`  KEEP: ${dup.existing} (${dup.existingSize}b, ${dup.existingTime})`);
    console.log(`  REMOVE: ${dup.duplicate} (${dup.duplicateSize}b, ${dup.duplicateTime})`);
    
    // Remove the duplicate (the one NOT in memoryMap)
    const keepFile = memoryMap.get(dup.id).path;
    const removeFile = keepFile === dup.existing ? dup.duplicate : dup.existing;
    
    try {
      fs.unlinkSync(removeFile);
      console.log(`  ✅ Removed: ${removeFile}`);
    } catch (error) {
      console.log(`  ❌ Failed to remove: ${removeFile} - ${error.message}`);
    }
  });
}

// Final count
const finalFiles = findMarkdownFiles(memoriesDir);
console.log(`\n📋 Final Results:`);
console.log(`- Files after cleanup: ${finalFiles.length}`);
console.log(`- Unique memories: ${memoryMap.size}`);
console.log(`- Duplicates removed: ${duplicates.length}`);

if (finalFiles.length === memoryMap.size) {
  console.log(`\n✅ SUCCESS: All duplicates removed, ${finalFiles.length} unique memories remain`);
} else {
  console.log(`\n⚠️  WARNING: File count (${finalFiles.length}) doesn't match unique count (${memoryMap.size})`);
}