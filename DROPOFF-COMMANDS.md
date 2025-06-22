# Like-I-Said v2.3.2 Docker Testing - Quick Commands

## Dashboard Testing (Recommended)
```bash
# Stop any running containers first
docker-compose down

# Build and run dashboard with fixed memory path and environment variables
docker-compose up --build like-i-said-dashboard

# View at: http://localhost:3002
# Should show: "📁 Watching: /app/memories" in logs
# Memories should now load correctly (110+ memories)
```

## Alternative Testing Commands
```bash
# Test MCP server only
docker-compose up like-i-said-mcp

# Interactive testing environment  
docker-compose up like-i-said-interactive

# Clean rebuild
docker-compose down --rmi all --volumes
docker-compose up --build like-i-said-dashboard
```

## Production Package Details
- **NPM Package**: @endlessblink/like-i-said-v2@2.3.2
- **Dashboard URL**: http://localhost:3002
- **Memory Count**: 110+ memories restored
- **Tools**: 6 core memory tools (no GitHub integration)

## Verification Checklist
- [ ] Dashboard loads at http://localhost:3002
- [ ] Memory count shows 110+ memories
- [ ] Graph relationships render properly
- [ ] Search functionality works
- [ ] Can create/edit memories
- [ ] No console errors

## Quick Fixes Applied
1. Fixed Docker memory path issue (MEMORIES_DIR=/app/memories)
2. Updated dashboard to use environment variable for memory directory
3. Memories are safely copied to container (not mounted)
4. Port mapped to 3002 to avoid conflicts

## Files Created/Modified in Session
- `Dockerfile` - Container definition for testing
- `docker-compose.yml` - Service orchestration (fixed memory path)
- `dashboard-server-bridge.js` - Added MEMORIES_DIR environment support
- `DOCKER-TESTING-MEMORY.md` - Complete documentation
- `DROPOFF-COMMANDS.md` - This file

The dashboard should now properly load all 110+ memories in the Docker environment with full functionality.