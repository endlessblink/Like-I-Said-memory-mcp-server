# Windows Setup Guide

## 🪟 **Running on Windows (without WSL)**

### Option 1: Use WSL (Recommended)
```cmd
# In Windows Command Prompt
wsl
cd /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2
npm run dev:full
```

### Option 2: Native Windows Setup

#### 1. Fix File Paths
```cmd
# Replace Linux paths with Windows paths in dashboard-server-bridge.js
# Change: '/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/memories'
# To: 'D:\\APPSNospaces\\Like-I-said-mcp-server-v2\\memories'
```

#### 2. Start API Server
```cmd
node dashboard-server-bridge.js
```

#### 3. Start React Dev Server (separate terminal)
```cmd
npm run dev
```

### Option 3: Docker Alternative (No WSL needed)

#### 1. Create Docker Compose for Full Stack
```cmd
# Start everything in containers
docker-compose up -d
```

## 🔧 **Fixing the React Error**

The React error #130 is likely due to:

1. **Missing Environment Variables**
2. **Path Resolution Issues**
3. **Component Import Problems**

### Quick Fix:

#### 1. Clear and Rebuild
```bash
rm -rf dist/ node_modules/.vite
npm run build
```

#### 2. Check Environment
```bash
# Make sure all components are properly imported
npm run dev
# Then visit http://localhost:5173 (not localhost:3001)
```

#### 3. Alternative: Use Production Build
```bash
# Start API
npm run start:dashboard

# Visit the built dashboard
http://localhost:3001
```

## 🎯 **Simplified Testing**

### Test 1: API Only
```bash
npm run start:dashboard
curl http://localhost:3001/api/status
```

### Test 2: MCP Server
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server-markdown.js
```

### Test 3: Neo4j (if using)
```bash
npm run neo4j:start
npm run neo4j:test
```

## 🚨 **Troubleshooting**

### If React Won't Start:
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Use the built dashboard at `http://localhost:3001`

### If Paths Don't Work:
1. Stay in WSL for development
2. Or modify all paths to use Windows format
3. Use the Docker approach for isolation

### If WebSocket Fails:
1. Check firewall settings
2. Use `localhost` instead of `0.0.0.0`
3. Restart the dashboard server