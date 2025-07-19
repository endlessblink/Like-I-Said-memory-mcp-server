# Testing Like-I-Said v2 Fresh Installation

## Quick Test Procedure

### 1. Clone the Repository
```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Full Development Environment
```bash
npm run dev:full
```

This will start:
- API Server on http://localhost:3002
- React Dashboard on http://localhost:5173

### 4. Test the Path Configuration Feature

1. Open http://localhost:5173 in your browser
2. Navigate to the Settings tab
3. You should see the Path Configuration section with:
   - Current memory and task directory paths
   - Visual indicators (green/red folders) showing if paths exist
   - Input fields to change paths
   - Suggested path configurations

### 5. Test Path Updates

1. Try changing the memory path to a different directory
2. Click "Update Paths"
3. Verify the dashboard shows success message
4. Check that the path status indicators update correctly

### 6. Test Memory Creation

1. Go to the Memories tab
2. Click "New Memory"
3. Create a test memory
4. Verify it appears in the dashboard
5. Check that the memory file is created in the configured directory

## Expected Results

- ✅ Dashboard loads without errors
- ✅ Settings tab shows Path Configuration
- ✅ Path validation works (green = exists, red = not found)
- ✅ Path updates apply without server restart
- ✅ Memories are saved to the configured directory
- ✅ Real-time updates work via WebSocket

## Common Issues

### Port Already in Use
If you get a port error, you may have another instance running:
```bash
# Kill processes on ports
lsof -ti:3002 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Missing Dependencies
If you see module errors:
```bash
npm install
npm run build
```

### Path Configuration Not Showing
Make sure you're on the latest commit with:
```bash
git pull origin main
```

## For NPX Installation Testing

To test the NPX installer:
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

Choose option 1 for auto-setup and follow the prompts.