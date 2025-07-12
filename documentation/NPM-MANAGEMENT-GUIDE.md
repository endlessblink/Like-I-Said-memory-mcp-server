# NPM Package Management Guide

## 📦 Where NPM Installs Everything

### **NPX (Temporary Install)**
```bash
npx @endlessblink/like-i-said-v2 install
```
- **Location**: `%USERPROFILE%\.npm\_npx\` (temporary cache)
- **Behavior**: Downloads, runs, then deletes
- **Use case**: One-time installation commands

### **Global Install**
```bash
npm install -g @endlessblink/like-i-said-v2
```
- **Windows**: `%APPDATA%\npm\node_modules\@endlessblink\like-i-said-v2\`
- **macOS**: `/usr/local/lib/node_modules/@endlessblink/like-i-said-v2/`
- **Linux**: `/usr/local/lib/node_modules/@endlessblink/like-i-said-v2/`

### **Local Install**
```bash
npm install @endlessblink/like-i-said-v2
```
- **Location**: `./node_modules/@endlessblink/like-i-said-v2/`
- **Use case**: When you want to run the dashboard locally

## 🚀 Running the Dashboard

### **Method 1: After NPX Install (Recommended)**
```bash
# 1. Install MCP server
npx @endlessblink/like-i-said-v2 install

# 2. Install locally for dashboard
npm install @endlessblink/like-i-said-v2

# 3. Navigate to package
cd node_modules/@endlessblink/like-i-said-v2

# 4. Start dashboard
npm run dev:full
```

### **Method 2: Global Install**
```bash
# 1. Install globally
npm install -g @endlessblink/like-i-said-v2

# 2. Navigate to global location
cd %APPDATA%\npm\node_modules\@endlessblink\like-i-said-v2

# 3. Start dashboard
npm run dev:full
```

### **Method 3: Clone and Develop**
```bash
# 1. Clone repository
git clone https://github.com/endlessblink/like-i-said-mcp-server.git
cd like-i-said-mcp-server

# 2. Install dependencies
npm install

# 3. Start dashboard
npm run dev:full
```

## 📊 Dashboard Access Points

### **Development Mode**
```bash
npm run dev:full
```
- **React Frontend**: http://localhost:5173
- **API Backend**: http://localhost:3001
- **Features**: Hot reload, React DevTools, full UI

### **Production Mode**
```bash
npm run dashboard
```
- **Simple Dashboard**: http://localhost:3001
- **Features**: Basic HTML interface, no build required

### **API Only**
```bash
npm run start:dashboard
```
- **API Server**: http://localhost:3001/api/memories
- **Simple Interface**: http://localhost:3001 (HTML fallback)

## 🔧 NPM Package Management

### **Publishing Updates**
```bash
# 1. Make changes to your code
# 2. Commit changes
git add .
git commit -m "Description of changes"

# 3. Bump version
npm version patch    # 2.0.1 → 2.0.2 (bug fixes)
npm version minor    # 2.0.1 → 2.1.0 (new features)
npm version major    # 2.0.1 → 3.0.0 (breaking changes)

# 4. Publish
npm publish --access public

# 5. Push to GitHub
git push
git push --tags
```

### **Testing Before Publishing**
```bash
# 1. Test locally
npm pack
tar -tzf endlessblink-like-i-said-v2-*.tgz

# 2. Test installation
npm install -g ./endlessblink-like-i-said-v2-*.tgz
like-i-said-v2 install

# 3. Clean up
npm uninstall -g @endlessblink/like-i-said-v2
rm endlessblink-like-i-said-v2-*.tgz
```

### **Managing Dependencies**
```bash
# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Install new dependency
npm install package-name

# Install dev dependency
npm install --save-dev package-name
```

## 🌐 Web Interface Requirements

### **Current Status**
✅ **API Server**: Working (Express on port 3001)
✅ **Simple HTML Dashboard**: Working 
⚠️ **React Frontend**: Needs verification

### **React Frontend Issues to Check**

1. **Missing Functions**: Ensure all helper functions are defined
2. **Import Paths**: Verify all `@/components` imports resolve
3. **API Endpoints**: Check React app connects to Express API
4. **Build Process**: Ensure Vite builds without errors

### **Debug React Issues**
```bash
# 1. Start development mode
npm run dev:full

# 2. Check browser console at http://localhost:5173
# Look for JavaScript errors

# 3. Check API connectivity
# Visit http://localhost:3001/api/memories

# 4. Test build process
npm run build
npm run preview
```

### **React Dependencies Check**
```bash
# Verify all UI components are installed
npm list @radix-ui/react-dialog
npm list @radix-ui/react-label
npm list lucide-react
npm list class-variance-authority
```

## 📋 Complete Testing Checklist

### **Pre-Publish Tests**
- [ ] `npm run build` succeeds
- [ ] `npm run dev:full` starts without errors
- [ ] http://localhost:5173 loads without console errors
- [ ] http://localhost:3001 shows simple dashboard
- [ ] `node server.js` returns 6 MCP tools
- [ ] `node cli.js install` configures clients successfully

### **Post-Publish Tests**
- [ ] `npx @endlessblink/like-i-said-v2 install` works
- [ ] MCP tools appear in Claude Desktop after restart
- [ ] `npm install @endlessblink/like-i-said-v2` installs locally
- [ ] Dashboard runs from node_modules location

## 🆘 Troubleshooting

### **Dashboard Won't Start**
```bash
# Check if port is in use
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# Kill processes using ports
taskkill /PID <process_id> /F
```

### **React Build Fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build 2>&1 | tee build.log
```

### **MCP Tools Don't Appear**
```bash
# Verify server works
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server.js

# Check config files
type "%APPDATA%\Claude\claude_desktop_config.json"
type "%USERPROFILE%\.cursor\mcp.json"
```

## 🎯 Quick Commands Reference

```bash
# Install MCP + Configure clients
npx @endlessblink/like-i-said-v2 install

# Install for dashboard use
npm install @endlessblink/like-i-said-v2

# Start full dashboard
cd node_modules/@endlessblink/like-i-said-v2 && npm run dev:full

# Publish updates
git add . && git commit -m "Update" && npm version patch && npm publish

# Test package
npm pack && npm install -g ./endlessblink-like-i-said-v2-*.tgz
```

---

**Next Step**: Let's fix the React frontend issues completely before publishing!