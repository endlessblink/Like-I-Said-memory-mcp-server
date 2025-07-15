# Debugging Guide for Like-I-Said DXT

## Debug DXT Created

I've created `like-i-said-v2-debug.dxt` which includes extensive logging to help diagnose why the DXT fails in Claude Desktop.

## How to Test and Debug

1. **Install the Debug DXT in Claude Desktop**
   - Double-click `like-i-said-v2-debug.dxt`
   - Try to use the test_tool

2. **Check the Log Files**
   After attempting to use the DXT, check these log files:
   
   - `~/like-i-said-debug.log` - Debug wrapper logs
   - `~/like-i-said-server.log` - Server operation logs
   
   On Windows, these will be in your user directory:
   - `C:\Users\[YourUsername]\like-i-said-debug.log`
   - `C:\Users\[YourUsername]\like-i-said-server.log`

3. **What to Look For**
   - Does the wrapper even start? (Check debug.log)
   - Are there Python import errors?
   - Does the server receive the initialize message?
   - Are there any error messages?

## Manual Testing

The server works correctly when tested manually:
```bash
python test_manual_server.py
```

This confirms the JSON-RPC protocol implementation is correct.

## Common Issues and Solutions

### Issue: "Server disconnected" immediately
**Possible causes:**
1. Python not found
2. Import errors
3. Crash on startup

**Check:** Look at the very beginning of the debug.log file

### Issue: No log files created
**Possible causes:**
1. Server never started
2. Permission issues
3. Wrong Python path

**Solution:** The debug DXT uses the system Python, which might not be available in Claude Desktop's environment

### Issue: Server starts but doesn't respond
**Possible causes:**
1. stdout/stdin buffering issues
2. JSON parsing errors
3. Protocol mismatch

**Check:** Look for "Message received" entries in the logs

## Next Steps Based on Findings

Once you check the logs, we can:

1. **If Python not found**: Create a self-contained DXT with embedded Python
2. **If import errors**: Bundle all dependencies properly
3. **If protocol issues**: Adjust the JSON-RPC implementation
4. **If buffering issues**: Add more flush() calls or adjust buffering

## Alternative Approach

If the debug DXT also fails, we might need to:
1. Use a different server type (Node.js wrapper around Python)
2. Create a fully compiled executable
3. Use a different MCP implementation approach

Please test the debug DXT and share what you find in the log files!