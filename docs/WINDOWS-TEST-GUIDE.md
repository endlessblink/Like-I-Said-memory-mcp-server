# Windows Test Guide for Like-I-Said v2

## Test Location
`D:\MY PROJECTS\AI\LLM\AI Code Gen\my-builds\My MCP\like-i-said-npm-test`

## Step-by-Step Testing Instructions

### 1. Open Command Prompt or PowerShell
Navigate to your test directory:
```cmd
cd "D:\MY PROJECTS\AI\LLM\AI Code Gen\my-builds\My MCP\like-i-said-npm-test"
```

### 2. Clone the Repository
```cmd
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git .
```

Note: The `.` at the end clones into the current directory.

### 3. Install Dependencies
```cmd
npm install
```

### 4. Build the Frontend
```cmd
npm run build
```

### 5. Start the Full Stack
```cmd
npm run dev:full
```

This starts:
- API Server: http://localhost:3002
- Dashboard: http://localhost:5173

### 6. Test the Path Configuration

1. Open your browser to http://localhost:5173
2. Click on the **Settings** tab
3. You should see the **Path Configuration** section

### 7. Configure Your Paths

In the Path Configuration section, you can set custom paths like:
- Memory Directory: `D:\MY PROJECTS\AI\LLM\AI Code Gen\my-builds\My MCP\memories`
- Task Directory: `D:\MY PROJECTS\AI\LLM\AI Code Gen\my-builds\My MCP\tasks`

Or use one of the suggested configurations.

### 8. Test Memory Creation

1. Go to the Memories tab
2. Click "New Memory"
3. Create a test memory with:
   - Content: "Test memory from fresh Windows installation"
   - Project: "test-project"
   - Tags: "test", "windows"
4. Save the memory
5. Check that the memory appears in the dashboard
6. Verify the memory file exists in your configured directory

### 9. Test Real-time Updates

1. Keep the dashboard open
2. In another terminal, navigate to your memories directory
3. Create a new markdown file manually:

```cmd
echo --- > "test-manual.md"
echo id: test-manual-123 >> "test-manual.md"
echo timestamp: 2025-01-16T12:00:00Z >> "test-manual.md"
echo project: test-project >> "test-manual.md"
echo --- >> "test-manual.md"
echo This is a manually created test memory >> "test-manual.md"
```

4. The dashboard should automatically show this new memory

## Expected Results

✅ **Dashboard Features Working:**
- Path Configuration in Settings tab
- Visual indicators for path validity
- Ability to update paths without restart
- Memory creation and display
- Real-time WebSocket updates

✅ **File System Integration:**
- Memories saved to configured directory
- Tasks saved to configured directory
- Path changes reflected immediately

## Troubleshooting Windows-Specific Issues

### Node.js Version
Ensure you have Node.js 18+ installed:
```cmd
node --version
```

### Long Path Names
If you get path too long errors:
```cmd
git config --system core.longpaths true
```

### Permission Issues
Run Command Prompt as Administrator if you get permission errors.

### Firewall/Antivirus
Add exceptions for:
- Node.js
- Ports 3002 and 5173

### Build Errors
If the build fails:
```cmd
npm cache clean --force
npm install
npm run build
```

## Quick Verification Checklist

- [ ] Repository cloned successfully
- [ ] Dependencies installed without errors
- [ ] `npm run dev:full` starts both servers
- [ ] Dashboard loads at http://localhost:5173
- [ ] Settings tab shows Path Configuration
- [ ] Can update memory/task paths
- [ ] Can create new memories
- [ ] Real-time updates work

## Next Steps

After verifying the dashboard works:

1. **Test the NPX Installer:**
   ```cmd
   npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
   ```

2. **Configure Claude Desktop:**
   Use the path configuration in the dashboard to match your Claude Desktop setup

3. **Test MCP Tools:**
   Ask Claude: "What MCP tools do you have available?"

## Support

If you encounter issues:
1. Check the browser console (F12) for errors
2. Check the terminal for server errors
3. Verify all paths use proper Windows format
4. Ensure no other processes are using ports 3002 or 5173