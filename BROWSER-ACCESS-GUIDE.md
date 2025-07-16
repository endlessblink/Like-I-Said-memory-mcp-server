# Browser Access Guide

## Accessing from Different Browsers/Devices

### Issue: Dashboard not loading from other browsers or devices

#### Solution 1: Clear Browser Cache (for UI fixes)
If the UI bottom panel fix isn't working:
1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear browser cache**: 
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Or open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"
3. **Incognito/Private mode**: Test in a new incognito window

#### Solution 2: Access from Other Devices on Same Network

1. **Find your computer's IP address**:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address under your active network adapter
   
   # Linux/Mac
   ifconfig
   # or
   ip addr show
   ```

2. **Access the dashboard using your IP**:
   - Instead of: `http://localhost:5173`
   - Use: `http://YOUR_IP:5173` (e.g., `http://192.168.5.45:5173`)

3. **Ensure both servers are running**:
   ```bash
   npm run dev:full
   ```

4. **Check Windows Firewall**:
   - Windows may block incoming connections
   - Allow Node.js through Windows Firewall when prompted
   - Or manually add rules for ports 3001 and 5173

#### Solution 3: Network Configuration

If still not accessible:

1. **Check if servers are listening on all interfaces**:
   ```bash
   # Should show 0.0.0.0:5173 and 0.0.0.0:3001
   netstat -an | grep -E "5173|3001"
   ```

2. **Restart the development servers**:
   ```bash
   # Stop current servers (Ctrl+C)
   # Start again
   npm run dev:full
   ```

3. **Use the Network URLs shown in console**:
   When you start the dev server, it shows:
   ```
   [UI]   ➜  Local:   http://localhost:5173/
   [UI]   ➜  Network: http://192.168.5.45:5173/  ← Use this!
   ```

## Troubleshooting

### "This site can't be reached" error
- Ensure you're on the same network
- Check firewall settings
- Verify the IP address is correct
- Try using a different browser

### API connection errors
- The UI now uses relative URLs in development
- This is handled by Vite's proxy configuration
- No manual API URL configuration needed

### WebSocket connection issues
- WebSocket connections are also proxied through Vite
- Should work automatically when accessing via network IP

## Security Note
Only allow access from trusted devices on your local network. The development server is not secured for public internet access.