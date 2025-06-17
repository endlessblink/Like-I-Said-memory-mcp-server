#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const memoriesDir = 'memories';

function parseMarkdownFile(filePath) {
  try {
    console.log(`\n🔍 Parsing: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Content length: ${content.length}`);
    
    const frontmatterRegex = /^---\n([\s\S]*?)\n---([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      console.log('❌ No frontmatter match');
      return null;
    }
    
    console.log('✅ Frontmatter found');
    const [, frontmatter, bodyContent] = match;
    const memory = { content: bodyContent.trim(), metadata: {} };
    
    const lines = frontmatter.split('\n');
    let inMetadata = false;
    
    console.log(`📋 Frontmatter lines: ${lines.length}`);
    
    lines.forEach(line => {
      if (line.trim() === 'metadata:') {
        inMetadata = true;
        return;
      }
      
      if (inMetadata && line.startsWith('  ')) {
        return; // Skip metadata parsing for now
      }
      
      inMetadata = false;
      
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;
      
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      
      console.log(`🔑 ${key}: ${value}`);
      
      switch (key) {
        case 'id':
          memory.id = value;
          break;
        case 'timestamp':
          memory.timestamp = value;
          break;
        case 'tags':
          if (value.startsWith('[') && value.endsWith(']')) {
            memory.tags = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
          }
          break;
      }
    });
    
    console.log('✅ Parsed memory:', { id: memory.id, timestamp: memory.timestamp, contentLength: memory.content.length });
    return memory;
    
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error.message);
    return null;
  }
}

console.log('🔍 Debug: Dashboard Memory Parsing');

if (!fs.existsSync(memoriesDir)) {
  console.log('❌ Memories directory not found');
  process.exit(1);
}

const projects = fs.readdirSync(memoriesDir).filter(dir => {
  const dirPath = path.join(memoriesDir, dir);
  return fs.statSync(dirPath).isDirectory();
});

console.log(`📁 Found projects: ${projects.join(', ')}`);

for (const proj of projects) {
  const projectPath = path.join(memoriesDir, proj);
  const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
  
  console.log(`\n📂 Project: ${proj} (${files.length} files)`);
  
  for (const file of files.slice(0, 2)) { // Test first 2 files
    const filePath = path.join(projectPath, file);
    const memory = parseMarkdownFile(filePath);
  }
}