# Dashboard Ports Explained 🚪

## The Simple Truth

**The Like-I-Said dashboard runs on ONE PORT** (usually 3002).

When you run `npm run start:dashboard`, it starts a single server that provides:
- The web dashboard interface
- The API endpoints
- WebSocket for real-time updates

## Why the Confusion?

You might see references to port 5173 in some places. Here's why:

### Port 3002 (or similar) - THIS IS WHAT YOU USE
- The main dashboard server
- Serves the built React app
- Handles all API requests
- **This is the URL shown after "DASHBOARD READY!"**

### Port 5173 - IGNORE THIS
- Vite development server
- ONLY used when developing React components
- Provides hot module replacement for developers
- **Normal users should never need this**

## Common Scenarios

### Starting the Dashboard
```bash
npm run start:dashboard
```
Output:
```
============================================================
✨ DASHBOARD READY! Access it at:

   🌐 http://localhost:3002

============================================================
```
**USE THIS URL!** ☝️

### If You See Port 5173 Messages
When running `npm run dev:full`, you might see:
```
[UI]   ➜  Local:   http://localhost:5173/
```
**IGNORE THIS!** Use the port shown for the API server instead.

### Port Already in Use?
The server automatically finds an available port:
- If 3002 is busy, it tries 3003, 3004, etc.
- Always check the console for the actual URL
- Look for "DASHBOARD READY!" message

## Quick Reference

| Command | What it does | Port to use |
|---------|--------------|-------------|
| `npm run start:dashboard` | Production dashboard | Check console (usually 3002) |
| `npm run dev:full` | Development mode | Check console for API port |
| `npm run dev` | Vite dev server only | 5173 (developers only) |

## Bottom Line

✅ **Always use the URL shown in the console after "DASHBOARD READY!"**

❌ **Never manually navigate to port 5173 unless you're developing**

## Still Confused?

Just run:
```bash
npm run start:dashboard
```

And open whatever URL it shows you. That's it! 🎉