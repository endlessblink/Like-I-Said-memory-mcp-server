# Claude Code Configuration

## Quality Assurance Directive
Before marking any task as complete, you MUST:
1. **Test the functionality** - run builds, start servers, test APIs
2. **Check for errors** - run lint/typecheck if available 
3. **Verify the solution works** - don't just implement, but validate
4. **Report what you tested** - show me the verification steps you took
5. **Only mark complete after successful verification**

If testing reveals issues, mark task as 'in_progress' and fix them first. Never assume something works without testing it.

## Project Context
- Like-I-Said v2 memory management system
- MCP server architecture with markdown storage
- React frontend with TypeScript
- AI enhancement with OpenAI/Anthropic integration
- Separate GitHub MCP server for development tools

## Testing Commands
- `npm run build` - Build the frontend
- `npm run dev` - Start development server
- `npm run lint` - Run linting (if available)
- `npm run typecheck` - Type checking (if available)
- `node server-markdown.js` - Test Like-I-Said MCP server
- `node github-mcp-server.js` - Test GitHub MCP server