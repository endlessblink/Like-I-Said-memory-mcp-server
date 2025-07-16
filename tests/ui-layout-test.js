#!/usr/bin/env node

/**
 * UI Layout and CSS Tests
 * Checks for common UI issues like overlapping elements, fixed positioning problems
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Running UI Layout Tests...\n');

let issuesFound = 0;
let checksPerformed = 0;

// Problematic CSS patterns that can cause UI issues
const problematicPatterns = [
  {
    pattern: /position:\s*fixed.*bottom:\s*0/gs,
    issue: 'Fixed positioning at bottom:0 can overlap with taskbar',
    suggestion: 'Consider using bottom: env(safe-area-inset-bottom) or adding padding'
  },
  {
    pattern: /height:\s*100vh(?!.*[-\s]*env)/g,
    issue: 'Using 100vh without accounting for safe areas',
    suggestion: 'Use height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))'
  },
  {
    pattern: /bottom:\s*0(?!.*padding-bottom)/g,
    issue: 'Elements positioned at bottom without padding',
    suggestion: 'Add padding-bottom for taskbar/navigation clearance'
  },
  {
    pattern: /z-index:\s*999\d*/g,
    issue: 'Extremely high z-index values',
    suggestion: 'Use a consistent z-index scale (e.g., 10, 20, 30)'
  },
  {
    pattern: /overflow:\s*hidden.*body/g,
    issue: 'Hidden overflow on body can cause scrolling issues',
    suggestion: 'Be careful with overflow:hidden on body element'
  }
];

// Check TypeScript/TSX files for inline styles
function checkInlineStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.relative(process.cwd(), filePath);
  let fileIssues = 0;

  // Check for problematic inline styles
  const inlineStylePattern = /style=\{\{([^}]+)\}\}/g;
  const matches = content.matchAll(inlineStylePattern);

  for (const match of matches) {
    const styleContent = match[1];
    
    // Check for fixed positioning
    if (styleContent.includes('position:') && styleContent.includes('fixed')) {
      console.log(`\n⚠️  Potential issue in ${fileName}:`);
      console.log(`   Inline fixed positioning found`);
      console.log(`   Line: ${getLineNumber(content, match.index)}`);
      issuesFound++;
      fileIssues++;
    }

    // Check for 100vh
    if (styleContent.includes('100vh')) {
      console.log(`\n⚠️  Potential issue in ${fileName}:`);
      console.log(`   Using 100vh in inline styles`);
      console.log(`   Line: ${getLineNumber(content, match.index)}`);
      issuesFound++;
      fileIssues++;
    }
  }

  checksPerformed++;
  return fileIssues;
}

// Check CSS files
function checkCSSFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.relative(process.cwd(), filePath);
    let fileIssues = 0;

    console.log(`Checking ${fileName}...`);

    problematicPatterns.forEach(({ pattern, issue, suggestion }) => {
      try {
        const matches = content.match(pattern);
        if (matches) {
          console.log(`\n⚠️  ${issue}`);
          console.log(`   Found ${matches.length} occurrence(s)`);
          console.log(`   Suggestion: ${suggestion}`);
          issuesFound += matches.length;
          fileIssues += matches.length;
        }
      } catch (e) {
        console.error(`Error checking pattern in ${fileName}: ${e.message}`);
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return 0;
  }

  // Check for mobile-specific issues
  const mobileNavPattern = /@media.*max-width.*\{[^}]*position:\s*fixed[^}]*\}/gs;
  if (mobileNavPattern.test(content)) {
    console.log(`\n⚠️  Mobile navigation with fixed positioning detected`);
    console.log(`   This can cause issues on mobile devices with notches/home indicators`);
    issuesFound++;
    fileIssues++;
  }

  checksPerformed++;
  return fileIssues;
}

// Get line number from index
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Check responsive design
function checkResponsiveDesign() {
  console.log('\n📱 Checking Responsive Design Patterns...\n');

  const filesToCheck = [
    'src/index.css',
    'src/App.css',
    'src/components/**/*.css'
  ];

  // Check for viewport meta tag in HTML
  const indexHtmlPath = path.join(__dirname, '..', 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    if (!htmlContent.includes('viewport')) {
      console.log('⚠️  Missing viewport meta tag in index.html');
      console.log('   Add: <meta name="viewport" content="width=device-width, initial-scale=1.0">');
      issuesFound++;
    } else {
      console.log('✅ Viewport meta tag found');
    }
  }

  checksPerformed++;
}

// Walk directory and check files
function walkDir(dir, callback, filePattern) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
      walkDir(filePath, callback, filePattern);
    } else if (filePattern.test(file)) {
      callback(filePath);
    }
  });
}

// Main test runner
function runTests() {
  console.log('🔍 Scanning for UI layout issues...\n');

  // Check CSS files
  const cssDir = path.join(__dirname, '..', 'src');
  console.log('📄 Checking CSS files...');
  walkDir(cssDir, checkCSSFile, /\.css$/);

  // Check TSX files for inline styles
  console.log('\n📄 Checking TSX files for inline styles...');
  walkDir(cssDir, checkInlineStyles, /\.tsx$/);

  // Check responsive design
  checkResponsiveDesign();

  // Check for specific component issues
  console.log('\n🔍 Checking specific components...\n');
  
  // Check App.tsx for mobile navigation
  const appTsxPath = path.join(__dirname, '..', 'src', 'App.tsx');
  if (fs.existsSync(appTsxPath)) {
    const appContent = fs.readFileSync(appTsxPath, 'utf8');
    
    // Look for mobile navigation patterns
    if (appContent.includes('md:hidden') || appContent.includes('mobile')) {
      console.log('📱 Mobile navigation detected in App.tsx');
      
      // Check if it has proper safe area handling
      if (!appContent.includes('safe-area-inset') && !appContent.includes('pb-safe')) {
        console.log('⚠️  Mobile navigation may not handle safe areas properly');
        console.log('   Consider adding padding-bottom: env(safe-area-inset-bottom)');
        issuesFound++;
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('UI LAYOUT TEST SUMMARY:');
  console.log('═'.repeat(50));
  console.log(`✅ Checks performed: ${checksPerformed}`);
  console.log(`⚠️  Issues found: ${issuesFound}`);
  
  if (issuesFound > 0) {
    console.log('\n⚠️  UI layout issues detected. Review the suggestions above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ No major UI layout issues detected!\n');
    process.exit(0);
  }
}

// Run tests
runTests();