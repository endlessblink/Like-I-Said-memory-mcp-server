import fs from 'fs';

const content = fs.readFileSync('server-markdown.js', 'utf8');
const lines = content.split('\n');

let insideTool = false;
let braceDepth = 0;
let hasAdditionalProperties = false;
let inputSchemaStart = -1;
let toolName = '';
const fixes = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect tool start
  if (line.includes("name: '") && line.includes("',")) {
    toolName = line.match(/name:\s*'([^']+)'/)?.[1] || '';
    insideTool = true;
    hasAdditionalProperties = false;
    inputSchemaStart = -1;
  }
  
  // Detect inputSchema start
  if (insideTool && line.includes('inputSchema:')) {
    inputSchemaStart = i;
    braceDepth = 0;
  }
  
  // Count braces
  if (inputSchemaStart > -1) {
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }
    
    // Check for additionalProperties
    if (line.includes('additionalProperties')) {
      hasAdditionalProperties = true;
    }
    
    // End of inputSchema
    if (braceDepth === 0 && i > inputSchemaStart) {
      if (!hasAdditionalProperties && toolName) {
        // Need to add additionalProperties
        fixes.push({
          tool: toolName,
          line: i,
          currentLine: lines[i]
        });
        console.log(`Tool '${toolName}' missing additionalProperties at line ${i + 1}`);
      }
      inputSchemaStart = -1;
      insideTool = false;
    }
  }
}

console.log(`\nFound ${fixes.length} tools missing additionalProperties`);

// Apply fixes
if (fixes.length > 0) {
  for (const fix of fixes) {
    // Find the right place to add additionalProperties
    const line = lines[fix.line];
    if (line.trim() === '},') {
      // Add additionalProperties before the closing brace
      lines[fix.line - 1] = lines[fix.line - 1] + ',';
      lines[fix.line] = '          additionalProperties: false\n        },';
    }
  }
  
  fs.writeFileSync('server-markdown.js', lines.join('\n'));
  console.log('Fixes applied!');
}