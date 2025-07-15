# Like-I-Said MCP Server v2 - Project Cleanup Audit Report
Generated: 2025-07-15

## Executive Summary

This comprehensive audit identifies opportunities to clean up and organize the Like-I-Said MCP Server v2 project. The project contains approximately 61MB of backup data, numerous documentation files that have been reorganized, and some areas with duplicate functionality.

## Key Findings

### 1. **Root Directory Cleanup Needed**
- **Session Dropoff Files**: 5 session dropoff files in root that should be moved to docs/releases/
  - `SESSION-DROPOFF-2025-07-14T20-36-00-009Z.md`
  - `SESSION-DROPOFF-2025-07-14T20-36-20-035Z.md`
  - `SESSION-DROPOFF-2025-07-14T20-36-45-407Z.md`
  - `SESSION-DROPOFF-2025-07-14T20-37-31-698Z.md`
  - `SESSION-DROPOFF-COMPLETE-$(date +%Y-%m-%d-%H%M%S).md` (template file with syntax error)
- **Misplaced Documentation**: `memory-quality-standards.md` should be in docs/technical/
- **Deprecated Scripts**: Several shell/batch scripts marked as deleted in git but still exist
- **Python Files**: `claude_auto_resume.py` in root (should be in scripts/)

### 2. **Library Directory (`lib/`) Issues**
- **Duplicate Files**: 
  - `memory-task-analyzer.js` and `memory-task-analyzer.cjs` (same functionality, different formats)
  - Multiple analyzer classes with potentially overlapping functionality
- **Feature Creep**: Many advanced features that may not be in active use:
  - `claude-historian-features.js` (experimental feature)
  - `behavioral-analyzer.js` (not referenced in main server)
  - `conversation-monitor.js` (appears unused)
- **Inconsistent Module Formats**: Mix of .js and .cjs files

### 3. **Source Directory (`src/`) Organization**
- **CSS Sprawl**: Multiple theme-related CSS files in root of src/:
  - `animate.css`, `dropdown-fix.css`, `fix-theme.css`, `light-theme-fixes.css`
  - `theme-improvements.css`, `theme-reset.css`
  - Should be consolidated in `src/styles/`
- **Test Files**: `test-theme.html` in src/ should be in tests/
- **Duplicate Functionality**: Multiple theme-related components:
  - `ThemeSelector.tsx`, `SimpleThemeSelector.tsx`, `ThemeTest.tsx`, `ThemeDebug.tsx`
  - `ThemeForceUpdate.tsx`, `ThemeProvider.tsx`

### 4. **Build Artifacts & Distribution**
- **Multiple DXT Directories**:
  - `dist-dxt/` - Contains test builds including unrelated `comfy-guru.dxt` (1.2MB)
  - `dist-dxt-production/` - Production builds
  - Both contain extracted directories that should be cleaned
- **Python Port Directory**: Large directory with many experimental builds:
  - 15+ different .dxt files with various naming schemes
  - Multiple build scripts doing similar things
  - Temporary extraction directories

### 5. **Data & Backups**
- **Backup Accumulation**: 25 backup directories totaling 61MB
  - Recommend keeping only last 10 backups
  - Implement automated cleanup policy
- **Test Data**: Various test memories scattered across projects:
  - `mcp-test/`, `mcp-testing/`, `persistence-test/`
  - Should be consolidated or removed

### 6. **Documentation Organization**
- **Successfully Reorganized**: Docs are now properly organized in subdirectories
- **Orphaned References**: Git status shows many files marked as deleted that have been moved
- **Duplicate Content**: Some guides may have overlapping information

### 7. **Test Files**
- **Large Test Suite**: 40 test files in tests/ directory
- **Mixed Formats**: Combination of .js, .cjs, .mjs, .sh, .py files
- **Test Reports**: Multiple JSON test report files that could be cleaned

### 8. **Configuration Files**
- **Multiple Manifest Files**: Found across various directories
- **Settings Duplication**: Both default and active settings files
- **Build Configurations**: Multiple TypeScript configs that could be consolidated

## Recommended Actions

### Immediate Cleanup (High Priority)
1. **Move session dropoff files** from root to `docs/releases/`
2. **Delete duplicate `memory-task-analyzer.cjs`** (keep .js version)
3. **Remove `comfy-guru.dxt`** from dist-dxt/
4. **Clean up old backups** - keep only last 10
5. **Fix template filename** with bash variable syntax
6. **Move `claude_auto_resume.py`** to scripts/

### Code Organization (Medium Priority)
1. **Consolidate theme CSS files** into `src/styles/themes/`
2. **Remove duplicate theme components** - keep only necessary ones
3. **Standardize module format** in lib/ (prefer .js)
4. **Clean python-port directory** - archive old builds

### Long-term Improvements (Low Priority)
1. **Implement automated backup rotation**
2. **Create feature flags** for experimental features
3. **Consolidate test utilities**
4. **Document active vs deprecated features**

## Space Savings Estimate
- Removing old backups: ~40MB
- Cleaning python-port builds: ~20MB
- Removing duplicate DXT files: ~3MB
- **Total potential savings: ~63MB**

## Risk Assessment
- **Low Risk**: Moving documentation, cleaning backups
- **Medium Risk**: Removing duplicate libraries (need testing)
- **High Risk**: Removing experimental features (may break edge cases)

## Conclusion

The project has grown organically with many experimental features and approaches. A systematic cleanup focusing on the high-priority items would significantly improve project organization without breaking functionality. The python-port directory particularly needs attention as it contains many experimental builds and scripts that are no longer needed.

### Next Steps
1. Create a backup before cleanup
2. Address high-priority items first
3. Test thoroughly after each change
4. Update documentation to reflect new structure
5. Implement automated cleanup policies for future