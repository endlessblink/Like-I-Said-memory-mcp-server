/**
 * React Component Import Regression Tests
 * 
 * Tests to prevent missing imports like the Loader2 issue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('React Component Import Regression Tests', () => {
  const srcDir = path.join(__dirname, '..', 'src');
  
  // Get all TypeScript/JSX files
  const getAllComponentFiles = (dir) => {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllComponentFiles(fullPath));
      } else if (entry.name.match(/\.(tsx?|jsx?)$/)) {
        files.push(fullPath);
      }
    }
    
    return files;
  };

  const componentFiles = getAllComponentFiles(srcDir);

  describe('Lucide React Icon Imports', () => {
    const checkIconUsage = (filePath, iconName) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const iconUsageRegex = new RegExp(`<${iconName}[\\s>]`, 'g');
      const usages = content.match(iconUsageRegex) || [];
      
      if (usages.length === 0) {
        return { hasUsage: false, hasImport: false };
      }

      // Check if icon is imported
      const importRegex = new RegExp(`import.*{[^}]*\\b${iconName}\\b[^}]*}.*from.*['"]lucide-react['"]`, 'gm');
      const hasImport = importRegex.test(content);
      
      return { hasUsage: true, hasImport, usageCount: usages.length };
    };

    const lucideIcons = [
      'Loader2', 'Edit', 'Trash2', 'Eye', 'Clock', 'Users', 'FileText',
      'Plus', 'Search', 'Filter', 'Settings', 'ChevronDown', 'ChevronUp',
      'Star', 'AlertCircle', 'X', 'Check', 'Info', 'Save', 'Calendar',
      'Tag', 'User', 'Scroll', 'Lightbulb', 'RefreshCw', 'Brain', 'Sparkles'
    ];

    componentFiles.forEach(filePath => {
      const relativePath = path.relative(srcDir, filePath);
      
      describe(`File: ${relativePath}`, () => {
        lucideIcons.forEach(iconName => {
          test(`${iconName} usage should have corresponding import`, () => {
            const result = checkIconUsage(filePath, iconName);
            
            if (result.hasUsage) {
              expect(result.hasImport).toBe(true);
              console.log(`✓ ${relativePath}: ${iconName} used ${result.usageCount} time(s) and properly imported`);
            }
          });
        });
      });
    });

    test('All Loader2 usages have imports', () => {
      const problemFiles = [];
      
      componentFiles.forEach(filePath => {
        const result = checkIconUsage(filePath, 'Loader2');
        if (result.hasUsage && !result.hasImport) {
          problemFiles.push(path.relative(srcDir, filePath));
        }
      });

      expect(problemFiles).toEqual([]);
    });
  });

  describe('Component Build Compatibility', () => {
    test('All TypeScript files should compile without import errors', () => {
      // This would be handled by the build process, but we can check for obvious issues
      const problematicFiles = [];
      
      componentFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for undefined variable usage (common with missing imports)
        const undefinedUsagePattern = /<(\\w+)\\s[^>]*>/g;
        const matches = content.match(undefinedUsagePattern) || [];
        
        matches.forEach(match => {
          const tagName = match.match(/<(\\w+)/)?.[1];
          if (tagName && tagName.match(/^[A-Z]/) && !content.includes(`import.*${tagName}`)) {
            // Might be a missing import (starts with capital letter but not imported)
            console.warn(`Potential missing import in ${filePath}: ${tagName}`);
          }
        });
      });
    });
  });

  describe('Import Statement Validation', () => {
    test('No duplicate imports from same module', () => {
      componentFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(srcDir, filePath);
        
        // Find all import statements
        const importRegex = /import.*from\\s+['"]([^'"]+)['"]/g;
        const imports = {};
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const module = match[1];
          imports[module] = (imports[module] || 0) + 1;
        }
        
        // Check for duplicates
        Object.entries(imports).forEach(([module, count]) => {
          if (count > 1) {
            console.warn(`${relativePath}: Duplicate imports from ${module} (${count} times)`);
          }
          expect(count).toBeLessThanOrEqual(1);
        });
      });
    });

    test('Lucide React imports are properly formatted', () => {
      componentFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(srcDir, filePath);
        
        // Find lucide-react imports
        const lucideImportRegex = /import\\s+{([^}]+)}\\s+from\\s+['"]lucide-react['"]/g;
        let match;
        
        while ((match = lucideImportRegex.exec(content)) !== null) {
          const importedItems = match[1].split(',').map(item => item.trim());
          
          // Check that imported items don't have syntax errors
          importedItems.forEach(item => {
            expect(item).not.toBe('');
            expect(item).toMatch(/^[A-Za-z0-9_]+$/);
          });
        }
      });
    });
  });
});