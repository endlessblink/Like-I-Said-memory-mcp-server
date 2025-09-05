#!/usr/bin/env node

/**
 * Process.exit() Checker Script
 * Scans codebase for process.exit() calls that could cause API Error 500
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

class ProcessExitChecker {
  constructor() {
    this.violations = [];
    this.checkedFiles = 0;
    this.excludePatterns = [
      '**/node_modules/**',
      '**/tests/**',
      '**/test/**',
      '**/*.test.js',
      '**/*.spec.js',
      '**/scripts/**',
      '**/build/**',
      '**/dist/**'
    ];
  }
  
  /**
   * Scan a file for process.exit() calls
   */
  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations = [];
    
    lines.forEach((line, index) => {
      // Check for process.exit() calls
      if (line.includes('process.exit') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        // Extract context
        const lineNumber = index + 1;
        const context = this.extractContext(lines, index);
        
        violations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: lineNumber,
          code: line.trim(),
          context,
          severity: this.determineSeverity(line, filePath)
        });
      }
      
      // Also check for other problematic patterns
      if (line.includes('process.kill(process.pid') && !line.trim().startsWith('//')) {
        violations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: index + 1,
          code: line.trim(),
          context: this.extractContext(lines, index),
          severity: 'high',
          type: 'process-kill'
        });
      }
      
      // Check for unhandled promise rejections that could crash
      if (line.includes('throw') && !this.isInTryCatch(lines, index)) {
        const isCritical = this.isTopLevelThrow(lines, index);
        if (isCritical) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: index + 1,
            code: line.trim(),
            context: this.extractContext(lines, index),
            severity: 'medium',
            type: 'unhandled-throw'
          });
        }
      }
    });
    
    return violations;
  }
  
  /**
   * Extract context around a line
   */
  extractContext(lines, index, contextLines = 2) {
    const start = Math.max(0, index - contextLines);
    const end = Math.min(lines.length, index + contextLines + 1);
    
    return lines.slice(start, end).map((line, i) => ({
      lineNumber: start + i + 1,
      content: line,
      isViolation: start + i === index
    }));
  }
  
  /**
   * Determine severity of process.exit() call
   */
  determineSeverity(line, filePath) {
    // Critical if in main server files
    if (filePath.includes('server-') && !filePath.includes('test')) {
      return 'critical';
    }
    
    // High if unconditional
    if (!line.includes('if') && !line.includes('?')) {
      return 'high';
    }
    
    // Medium if conditional
    return 'medium';
  }
  
  /**
   * Check if throw is in try-catch block
   */
  isInTryCatch(lines, index) {
    // Simple heuristic: look for try block above
    for (let i = index - 1; i >= Math.max(0, index - 20); i--) {
      if (lines[i].includes('try {')) return true;
      if (lines[i].includes('} catch')) return true;
    }
    return false;
  }
  
  /**
   * Check if throw is at top level
   */
  isTopLevelThrow(lines, index) {
    // Check indentation - top level has minimal indentation
    const line = lines[index];
    const leadingSpaces = line.search(/\S/);
    return leadingSpaces < 4;
  }
  
  /**
   * Scan all JavaScript files
   */
  async scanAll() {
    console.log('Scanning for process.exit() calls...\n');
    
    const files = await glob('**/*.js', {
      cwd: ROOT_DIR,
      ignore: this.excludePatterns
    });
    
    for (const file of files) {
      const filePath = path.join(ROOT_DIR, file);
      this.checkedFiles++;
      
      try {
        const fileViolations = this.scanFile(filePath);
        this.violations.push(...fileViolations);
      } catch (error) {
        console.error(`Error scanning ${file}: ${error.message}`);
      }
    }
    
    return this.violations;
  }
  
  /**
   * Generate report
   */
  generateReport() {
    console.log('='.repeat(70));
    console.log('PROCESS.EXIT() AND CRASH DETECTION REPORT');
    console.log('='.repeat(70));
    console.log();
    
    console.log(`Files scanned: ${this.checkedFiles}`);
    console.log(`Violations found: ${this.violations.length}`);
    console.log();
    
    if (this.violations.length === 0) {
      console.log('✅ No process.exit() calls or crash risks found!');
      console.log('This code is safe from API Error 500 issues.');
      return;
    }
    
    // Group by severity
    const critical = this.violations.filter(v => v.severity === 'critical');
    const high = this.violations.filter(v => v.severity === 'high');
    const medium = this.violations.filter(v => v.severity === 'medium');
    
    if (critical.length > 0) {
      console.log('🔴 CRITICAL VIOLATIONS (Will cause API Error 500):');
      console.log('-'.repeat(50));
      critical.forEach(v => this.printViolation(v));
    }
    
    if (high.length > 0) {
      console.log('\n🟠 HIGH SEVERITY (Likely to cause issues):');
      console.log('-'.repeat(50));
      high.forEach(v => this.printViolation(v));
    }
    
    if (medium.length > 0) {
      console.log('\n🟡 MEDIUM SEVERITY (Potential issues):');
      console.log('-'.repeat(50));
      medium.forEach(v => this.printViolation(v));
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Critical: ${critical.length}`);
    console.log(`High: ${high.length}`);
    console.log(`Medium: ${medium.length}`);
    
    // Recommendations
    console.log('\n📝 RECOMMENDATIONS:');
    console.log('-'.repeat(50));
    console.log('1. Replace process.exit() with graceful error handling');
    console.log('2. Use error callbacks or promise rejections instead');
    console.log('3. Let the MCP framework handle lifecycle');
    console.log('4. For fatal errors, log and return error response');
    console.log('5. Wrap throws in try-catch blocks');
    
    // Example fixes
    if (critical.length > 0) {
      console.log('\n💡 EXAMPLE FIX:');
      console.log('-'.repeat(50));
      console.log('Instead of:');
      console.log('  process.exit(1);');
      console.log('\nUse:');
      console.log('  logger.error("Fatal error occurred");');
      console.log('  return { error: "Fatal error" };');
    }
  }
  
  /**
   * Print a violation
   */
  printViolation(violation) {
    console.log(`\n📍 ${violation.file}:${violation.line}`);
    console.log(`   Type: ${violation.type || 'process-exit'}`);
    console.log(`   Code: ${violation.code}`);
    
    if (violation.context) {
      console.log('   Context:');
      violation.context.forEach(ctx => {
        const prefix = ctx.isViolation ? '>> ' : '   ';
        console.log(`   ${prefix}${ctx.lineNumber}: ${ctx.content}`);
      });
    }
  }
  
  /**
   * Generate JSON report
   */
  generateJSONReport(outputPath = null) {
    const report = {
      timestamp: new Date().toISOString(),
      filesScanned: this.checkedFiles,
      violationsFound: this.violations.length,
      violations: this.violations,
      summary: {
        critical: this.violations.filter(v => v.severity === 'critical').length,
        high: this.violations.filter(v => v.severity === 'high').length,
        medium: this.violations.filter(v => v.severity === 'medium').length
      },
      safe: this.violations.length === 0
    };
    
    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 JSON report saved to: ${outputPath}`);
    }
    
    return report;
  }
  
  /**
   * Check if codebase is safe
   */
  isSafe() {
    const criticalCount = this.violations.filter(v => v.severity === 'critical').length;
    return criticalCount === 0;
  }
}

// Main execution
async function main() {
  const checker = new ProcessExitChecker();
  
  // Parse arguments
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  // Run scan
  await checker.scanAll();
  
  // Generate reports
  if (jsonOutput || outputPath) {
    const report = checker.generateJSONReport(outputPath || 'process-exit-report.json');
    if (jsonOutput && !outputPath) {
      console.log(JSON.stringify(report, null, 2));
    }
  } else {
    checker.generateReport();
  }
  
  // Exit with appropriate code
  if (!checker.isSafe()) {
    console.log('\n❌ Code contains process.exit() calls that will cause API Error 500!');
    process.exit(1);
  } else {
    console.log('\n✅ Code is safe from process.exit() related API Error 500 issues.');
    process.exit(0);
  }
}

// Export for use as module
export { ProcessExitChecker };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}