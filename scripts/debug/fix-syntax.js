import fs from 'fs';

const content = fs.readFileSync('server-markdown.js', 'utf8');
const lines = content.split('\n');

// Fix the syntax errors from the previous script
for (let i = 0; i < lines.length; i++) {
  // Fix lines that are just a comma
  if (lines[i].trim() === ',' && i > 0) {
    // Merge with previous line
    lines[i-1] = lines[i-1] + ',';
    lines[i] = '';
  }
  
  // Fix double commas
  lines[i] = lines[i].replace(/,,+/g, ',');
}

// Remove empty lines that shouldn't be there
const fixed = lines.filter((line, i) => {
  // Keep empty lines unless they're in a problematic spot
  if (line === '' && i > 0 && lines[i-1].trim().endsWith(',')) {
    return false;
  }
  return true;
});

fs.writeFileSync('server-markdown.js', fixed.join('\n'));
console.log('Syntax fixes applied!');