# File Move Instructions for Claude Code

## CRITICAL: Read Before Moving Any Files

This project has interdependent files. Moving files without checking can break the application.

## Required Process for Moving Files

### 1. First, Check the Risk Level

Look in `.claude/file-safety-rules.json` to determine the file's risk category:
- **Critical**: DO NOT MOVE without user approval and extensive checking
- **High Risk**: Run full checklist before moving
- **Medium Risk**: Check references before moving  
- **Safe**: Can move with basic verification

### 2. Always Run Safety Checks

```bash
# ALWAYS run this first:
npm run check:refs <filename>

# For critical/high-risk files also run:
npm run check:move <filename>
```

### 3. Decision Tree

```
Is the file in criticalFiles list?
├─ YES → DO NOT MOVE. Suggest alternative to user.
└─ NO → Continue
   │
   ├─ Is it in highRiskFiles?
   │  ├─ YES → Run check:move, fix all issues first
   │  └─ NO → Continue
   │     │
   │     ├─ Run check:refs
   │     ├─ Any references found?
   │     │  ├─ YES → Update all references first
   │     │  └─ NO → Safe to move
   │     └─ Move file and test
```

### 4. Files That Should NEVER Be Moved

These files are hardcoded in various places:
- `server-markdown.js` - Main MCP entry point
- `server.js` - MCP server alias
- `dashboard-server-bridge.js` - API server
- `package.json` - NPM configuration
- `lib/*.js` - Core libraries with circular dependencies
- `.env` files - Environment configuration

### 5. Common Reference Locations

When moving files, check these locations:
1. Import/require statements in JS/TS files
2. `package.json` scripts section
3. Configuration files (`*.config.js`, `tsconfig.json`)
4. Documentation files (especially README.md)
5. The CLAUDE.md file itself
6. GitHub workflows in `.github/`

### 6. Example Safe Move Process

```bash
# User asks: "Move docs/old-guide.md to docs/guides/new-guide.md"

# 1. Check references
npm run check:refs docs/old-guide.md

# 2. If references found, update them
# 3. Move the file
mv docs/old-guide.md docs/guides/new-guide.md

# 4. Verify
npm test
npm run dev:full
```

### 7. What To Tell Users

When a user asks to move a critical file:
```
"The file [filename] is a critical system file with multiple dependencies. 
Moving it would require updating [X] references across the codebase and could 
break core functionality. 

Would you like me to:
1. Show you all the references that would need updating?
2. Suggest an alternative approach?
3. Proceed with caution after running safety checks?"
```

### 8. After Moving Files

Always:
1. Run `npm test`
2. Check if services start: `npm run dev:full`
3. Create a memory about the file move for future reference
4. Update `.claude/file-safety-rules.json` if needed

## Special Cases

### memory-quality-standards.md
- Current location: `docs/memory-quality-standards.md`
- Referenced in: `lib/standards-config-parser.cjs:13`, `dashboard-server-bridge.js:526`
- Both references have comments pointing to each other

### Any file in lib/ directory
- These files often have circular dependencies
- Always run full test suite after moving
- Check for dynamic requires using string concatenation

### Documentation Files
- Generally safer to move
- Still check for references in README.md and other docs
- Update any relative links within the moved file

## Remember

1. **When in doubt, check first**: `npm run check:refs`
2. **Critical files = Don't move**: Suggest alternatives
3. **Always test after moving**: `npm test && npm run dev:full`
4. **Document the change**: Create a memory about what was moved and why

This process prevents the errors we just fixed from happening again!