/**
 * Discover the API server port dynamically
 */

let cachedPort: number | null = null;
let discoveryPromise: Promise<number> | null = null;

export async function discoverApiPort(): Promise<number> {
  // Return cached port if available
  if (cachedPort !== null) {
    return cachedPort;
  }

  // Return existing promise if discovery is in progress
  if (discoveryPromise !== null) {
    return discoveryPromise;
  }

  // Start discovery
  discoveryPromise = performDiscovery();
  
  try {
    cachedPort = await discoveryPromise;
    return cachedPort;
  } finally {
    discoveryPromise = null;
  }
}

async function performDiscovery(): Promise<number> {
  // Try to get port from Vite plugin endpoint
  try {
    const response = await fetch('/api-port');
    if (response.ok) {
      const data = await response.json();
      if (data.port && typeof data.port === 'number') {
        console.log(`🔍 Discovered API port from file: ${data.port}`);
        return data.port;
      }
    }
  } catch (error) {
    console.warn('Failed to get port from /api-port:', error);
  }

  // Try common ports in order
  const portsToTry = [8776, 3002, 3001, 3003, 3004, 3005];
  
  for (const port of portsToTry) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ Found API server on port ${port}`);
        return port;
      }
    } catch (error) {
      // Port not available, try next
      continue;
    }
  }

  // Fallback to default
  console.warn('⚠️ Could not discover API port, using default 8776');
  return 8776;
}

export function resetPortCache() {
  cachedPort = null;
  discoveryPromise = null;
}

export async function getApiUrl(path: string = ''): Promise<string> {
  const port = await discoverApiPort();
  return `http://localhost:${port}${path}`;
}

export async function getWsUrl(): Promise<string> {
  const port = await discoverApiPort();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//localhost:${port}`;
}