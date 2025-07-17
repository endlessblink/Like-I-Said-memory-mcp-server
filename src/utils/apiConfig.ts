// Cached API port
let cachedApiPort: number | null = null;

// Get the API base URL dynamically
export async function getApiPort(): Promise<number> {
  // Return cached port if available
  if (cachedApiPort !== null) {
    return cachedApiPort;
  }

  // Skip the /api-port check in development mode to avoid console errors
  // The fallback port detection below works reliably
  if (import.meta.env.DEV) {
    // In development, go straight to port detection
  } else {
    try {
      // In production, try to get the port from the server endpoint
      const response = await fetch('/api-port');
      if (response.ok) {
        const data = await response.json();
        cachedApiPort = data.port;
        return cachedApiPort;
      }
    } catch (error) {
      console.warn('Failed to fetch API port from server:', error);
    }
  }

  // Fallback: try common ports in sequence
  // Updated priority based on Desktop Commander findings
  const commonPorts = [3008, 3007, 3006, 3005, 3004, 3002, 3001, 3003];
  
  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://localhost:${port}/api/status`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      
      if (response.ok) {
        cachedApiPort = port;
        console.log(`✅ API server found on port ${port}`);
        return port;
      }
    } catch {
      // Continue to next port
    }
  }

  // Default to 3002 if no server found
  console.warn('No API server found, defaulting to port 3002');
  cachedApiPort = 3002;
  return 3002;
}

// Get the full API URL
export async function getApiUrl(path: string): Promise<string> {
  const port = await getApiPort();
  // Use window.location.hostname to support network access
  const host = window.location.hostname;
  return `http://${host}:${port}${path}`;
}

// Get WebSocket URL
export async function getWebSocketUrl(): Promise<string> {
  const port = await getApiPort();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use window.location.hostname to support network access
  const host = window.location.hostname;
  return `${protocol}//${host}:${port}`;
}

// Reset cached port (useful for retrying connection)
export function resetApiPortCache(): void {
  cachedApiPort = null;
}