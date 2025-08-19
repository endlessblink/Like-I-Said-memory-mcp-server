import fs from 'fs';

const content = fs.readFileSync('server-markdown.js', 'utf8');

// Fix the specific syntax error
let fixed = content.replace(/},\s*,/g, '},');

// Also ensure no standalone commas on their own lines
fixed = fixed.replace(/\n\s*,\s*\n/g, ',\n');

fs.writeFileSync('server-markdown.js', fixed);
console.log('Emergency fix applied!');