// Cached API port
let cachedApiPort: number | null = null;

// Get the API base URL dynamically
export async function getApiPort(): Promise<number> {
  // Return cached port if available
  if (cachedApiPort !== null) {
    return cachedApiPort;
  }

  try {
    // Try to get the port from the Vite server endpoint
    const response = await fetch('/api-port');
    if (response.ok) {
      const data = await response.json();
      cachedApiPort = data.port;
      return cachedApiPort;
    }
  } catch (error) {
    console.warn('Failed to fetch API port from server:', error);
  }

  // Fallback: try common ports in sequence
  const commonPorts = [3002, 3001, 3003, 3004, 3005];
  
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
  // When using Vite proxy, just use relative URLs
  if (import.meta.env.DEV) {
    return path; // This will use Vite's proxy
  }
  
  // In production, use the same host as the frontend
  const port = await getApiPort();
  return `${window.location.protocol}//${window.location.hostname}:${port}${path}`;
}

// Get WebSocket URL
export async function getWebSocketUrl(): Promise<string> {
  // When using Vite proxy, use relative WebSocket
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  // In production, use the same host as the frontend
  const port = await getApiPort();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:${port}`;
}

// Reset cached port (useful for retrying connection)
export function resetApiPortCache(): void {
  cachedApiPort = null;
}