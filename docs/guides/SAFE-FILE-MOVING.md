# Safe File Moving Guide

This guide helps you safely move or rename files in the Like-I-Said MCP Server codebase without breaking references.

## Quick Start

Before moving any file, run these checks:

```bash
# Check for references to a specific file
npm run check:refs memory-quality-standards.md

# Run full pre-move safety checklist
npm run check:move memory-quality-standards.md
```

## Available Tools

### 1. File Reference Checker (`check:refs`)

Searches the entire codebase for references to a file.

```bash
# Check single file
npm run check:refs filename.md

# Check with move plan
npm run check:refs old-path.js new-path.js

# Check all documentation files
npm run check:refs -- --all-docs
```

### 2. Pre-Move Checklist (`check:move`)

Runs comprehensive safety checks before moving a file:
- Verifies file exists
- Searches for direct references
- Checks import/require statements
- Scans package.json scripts
- Checks configuration files
- Runs tests (if available)

```bash
npm run check:move filename.md
```

## Common Scenarios

### Moving Documentation Files

1. **Check for references:**
   ```bash
   npm run check:refs docs/old-guide.md
   ```

2. **Update any found references**

3. **Move the file:**
   ```bash
   mv docs/old-guide.md docs/guides/new-guide.md
   ```

4. **Verify everything works:**
   ```bash
   npm test
   npm run dev:full
   ```

### Moving Source Code Files

1. **Run full checklist:**
   ```bash
   npm run check:move src/old-component.js
   ```

2. **Update all imports/requires in the listed files**

3. **Move the file:**
   ```bash
   mv src/old-component.js src/components/new-component.js
   ```

4. **Update any relative imports within the moved file**

5. **Run tests:**
   ```bash
   npm test
   ```

## Files That Commonly Have References

### High-Risk Files (Many References)
- `server-markdown.js` - Main MCP server
- `dashboard-server-bridge.js` - API server
- `memory-quality-standards.md` - Quality configuration
- `package.json` - Build configuration
- Any file in `lib/` directory

### Medium-Risk Files
- Documentation in `docs/`
- Configuration files (`*.config.js`)
- Scripts in `scripts/`

### Low-Risk Files
- Markdown files in subdirectories
- Test files
- Example files

## Best Practices

1. **Always check before moving:**
   ```bash
   npm run check:move <filename>
   ```

2. **Update references before moving the file**
   - This ensures the code still works during the transition

3. **Move files in small batches**
   - Easier to track what broke if something goes wrong

4. **Run tests after each move:**
   ```bash
   npm test
   npm run test:api
   npm run test:mcp
   ```

5. **Check the running application:**
   ```bash
   npm run dev:full
   # Then test the dashboard at http://localhost:5173
   ```

## Handling Special Cases

### Files Referenced in Multiple Places

If `check:refs` finds many references:

1. Create a list of all files to update
2. Update them systematically
3. Consider using find-and-replace tools:
   ```bash
   # Example with sed (be careful!)
   find . -name "*.js" -exec sed -i 's/old-file.md/new-file.md/g' {} +
   ```

### Configuration Files

Some files are referenced in configuration:
- `.env` files
- `vite.config.ts`
- `tsconfig.json`
- GitHub workflows in `.github/`

Always check these manually!

### Cross-Reference Comments

When files reference each other (like we added for `memory-quality-standards.md`), update both:
- The reference in the comment
- The actual file path

## Recovery

If something breaks after moving files:

1. **Check git status:**
   ```bash
   git status
   git diff
   ```

2. **Revert if needed:**
   ```bash
   git checkout -- .
   ```

3. **Or selectively undo:**
   ```bash
   git checkout -- path/to/broken-file.js
   ```

## Adding Cross-Reference Comments

When files depend on each other, add comments:

```javascript
// IMPORTANT: This file is referenced in:
// - dashboard-server-bridge.js:524
// - lib/some-other-file.js:100
// Update those references if you move this file!
```

This helps future developers (and yourself!) avoid breaking things.

---

Remember: A few minutes of checking can save hours of debugging! 🛡️