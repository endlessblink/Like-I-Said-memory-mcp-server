// Cached API port - use localStorage for cross-tab consistency
let cachedApiPort: number | null = null;

// Get the API base URL dynamically
export async function getApiPort(): Promise<number> {
  // Check localStorage first for cross-tab consistency
  const storedPort = localStorage.getItem('like-i-said-api-port');
  if (storedPort && !cachedApiPort) {
    cachedApiPort = parseInt(storedPort);
  }
  
  // Return cached port if available
  if (cachedApiPort !== null) {
    return cachedApiPort;
  }

  // Always try to get the port from the port discovery endpoint first
  try {
    const response = await fetch('/api-port', {
      method: 'GET',
      signal: AbortSignal.timeout(1000) // 1 second timeout
    });
    if (response.ok) {
      const data = await response.json();
      if (data.port) {
        cachedApiPort = data.port;
        localStorage.setItem('like-i-said-api-port', data.port.toString());
        console.log(`✅ API server port discovered: ${data.port}`);
        return data.port;
      } else if (data.ports) {
        // If we get a list of ports to try, use them
        console.log('📋 Got list of ports to try:', data.ports);
        for (const port of data.ports) {
          try {
            const testResponse = await fetch(`http://localhost:${port}/api/status`, {
              method: 'GET',
              mode: 'cors',
              signal: AbortSignal.timeout(500) // 500ms timeout for each port
            });
            
            if (testResponse.ok) {
              const testData = await testResponse.json();
              if (testData.server === 'Dashboard Bridge' || testData.message === 'Like-I-Said MCP Server Dashboard API') {
                cachedApiPort = port;
                localStorage.setItem('like-i-said-api-port', port.toString());
                console.log(`✅ API server found on port ${port}`);
                return port;
              }
            }
          } catch {
            // Continue to next port
          }
        }
      }
    }
  } catch (error) {
    console.log('Port discovery endpoint not available, falling back to port scanning');
  }

  // Fallback: try common ports in sequence
  // Updated priority based on Desktop Commander findings
  const commonPorts = [3001, 3002, 3008, 3007, 3006, 3005, 3004, 3003];
  
  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://localhost:${port}/api/status`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        // Only accept servers that identify as Like-I-Said dashboard
        if (data.server === 'Dashboard Bridge' || data.message === 'Like-I-Said MCP Server Dashboard API') {
          cachedApiPort = port;
          localStorage.setItem('like-i-said-api-port', port.toString());
          console.log(`✅ API server found on port ${port}`);
          return port;
        }
      }
    } catch {
      // Continue to next port
    }
  }

  // Default to 3001 if no server found
  console.warn('No API server found, defaulting to port 3001');
  cachedApiPort = 3001;
  localStorage.setItem('like-i-said-api-port', '3001');
  return 3001;
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
  localStorage.removeItem('like-i-said-api-port');
}

// Force clear all caches and rediscover port
export async function forceRediscoverPort(): Promise<number> {
  resetApiPortCache();
  return await getApiPort();
}