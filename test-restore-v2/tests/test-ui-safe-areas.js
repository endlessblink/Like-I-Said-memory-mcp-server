#!/usr/bin/env node

/**
 * Test script to validate that all UI components use safe area CSS classes
 * for bottom positioning to prevent Windows taskbar overlap
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing UI Safe Area Implementation...\n');

const testResults = {
  passed: 0,
  failed: 0,
  warnings: []
};

// Components that should have safe area classes
const componentsToCheck = [
  { file: 'src/App.tsx', description: 'Main app sidebar and statistics panel' },
  { file: 'src/components/ProgressIndicators.tsx', description: 'Progress overlay' },
  { file: 'src/components/ThemeDebug.tsx', description: 'Theme debug panel' },
  { file: 'src/components/QuickCapture.tsx', description: 'Quick capture FAB' },
  { file: 'src/components/NavSpacingAdjuster.tsx', description: 'Nav spacing adjuster' }
];

// Patterns that indicate bottom positioning without safe areas
const unsafePatterns = [
  /className="[^"]*\bfixed\s+bottom-\d+[^"]*"(?![^"]*(?:bottom-safe|fab-bottom|mb-safe|pb-safe))/g,
  /className="[^"]*\bbottom-0\b[^"]*"(?![^"]*(?:bottom-safe|fab-bottom|mb-safe|pb-safe|top-0))/g
];

// Patterns that indicate proper safe area usage
const safePatterns = [
  /bottom-safe/,
  /pb-safe/,
  /mb-safe/,
  /sidebar-safe/,
  /fab-bottom/,
  /stats-panel/
];

function checkComponent(filePath, description) {
  console.log(`Checking ${description}...`);
  
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    let hasSafeAreas = false;
    let hasUnsafePatterns = false;
    const issues = [];
    
    // Check for safe patterns
    safePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasSafeAreas = true;
      }
    });
    
    // Check for unsafe patterns
    unsafePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        hasUnsafePatterns = true;
        matches.forEach(match => {
          const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
          issues.push(`Line ~${lineNum}: ${match.substring(0, 50)}...`);
        });
      }
    });
    
    if (hasSafeAreas && !hasUnsafePatterns) {
      console.log(`✅ ${description} - Uses safe area classes correctly`);
      testResults.passed++;
    } else if (hasUnsafePatterns) {
      console.log(`❌ ${description} - Found unsafe bottom positioning:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      testResults.failed++;
    } else {
      console.log(`⚠️ ${description} - No bottom positioning found`);
      testResults.warnings.push(description);
    }
  } catch (error) {
    console.log(`❌ ${description} - Error reading file: ${error.message}`);
    testResults.failed++;
  }
  
  console.log('');
}

function checkSafeAreasCss() {
  console.log('Checking safe-areas.css implementation...');
  
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', 'src/styles/safe-areas.css'), 'utf8');
    
    const requiredVariables = [
      '--safe-area-inset-bottom',
      '--taskbar-height',
      '--safe-bottom',
      '--nav-height'
    ];
    
    const requiredClasses = [
      '.bottom-safe',
      '.pb-safe',
      '.mb-safe',
      '.sidebar-safe',
      '.fab-bottom'
    ];
    
    let allFound = true;
    
    requiredVariables.forEach(variable => {
      if (!content.includes(variable)) {
        console.log(`❌ Missing CSS variable: ${variable}`);
        allFound = false;
      }
    });
    
    requiredClasses.forEach(className => {
      if (!content.includes(className)) {
        console.log(`❌ Missing CSS class: ${className}`);
        allFound = false;
      }
    });
    
    if (allFound) {
      console.log('✅ safe-areas.css - All required variables and classes present');
      testResults.passed++;
    } else {
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ safe-areas.css - Error reading file: ${error.message}`);
    testResults.failed++;
  }
  
  console.log('');
}

function checkCssImports() {
  console.log('Checking CSS import order...');
  
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', 'src/index.css'), 'utf8');
    const lines = content.split('\n');
    
    let importLine = -1;
    let nonImportLine = -1;
    
    lines.forEach((line, index) => {
      if (line.includes('@import') && line.includes('safe-areas.css')) {
        importLine = index;
      }
      if (!line.includes('@import') && !line.trim().startsWith('/*') && line.trim() !== '' && nonImportLine === -1) {
        nonImportLine = index;
      }
    });
    
    if (importLine > -1 && (nonImportLine === -1 || importLine < nonImportLine)) {
      console.log('✅ CSS imports - safe-areas.css is imported correctly');
      testResults.passed++;
    } else {
      console.log('❌ CSS imports - safe-areas.css import order issue');
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ CSS imports - Error checking: ${error.message}`);
    testResults.failed++;
  }
  
  console.log('');
}

// Run all tests
console.log('🚀 Starting UI safe area tests...\n');

checkSafeAreasCss();
checkCssImports();

componentsToCheck.forEach(({ file, description }) => {
  checkComponent(file, description);
});

// Summary
console.log('📊 Test Results Summary:');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
if (testResults.warnings.length > 0) {
  console.log(`⚠️ Warnings: ${testResults.warnings.length}`);
  testResults.warnings.forEach(warning => {
    console.log(`   - ${warning}`);
  });
}

console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

console.log('\n✅ UI safe area testing completed!');

process.exit(testResults.failed > 0 ? 1 : 0);