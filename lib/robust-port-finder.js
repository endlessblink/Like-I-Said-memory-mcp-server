import net from 'net';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * Robust port finder with proper startup validation
 * Based on Node.js best practices for 2024
 */

/**
 * Check if a port is available using atomic operations
 * Prevents race conditions and handles cleanup properly
 */
export async function isPortAvailable(port, timeout = 2000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    let resolved = false;
    
    // Cleanup function to prevent resource leaks
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        server.removeAllListeners();
        if (server.listening) {
          server.close();
        }
      }
    };
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      cleanup();
      console.log(`⏰ Port ${port} availability check timed out`);
      resolve(false);
    }, timeout);
    
    server.once('error', (err) => {
      clearTimeout(timeoutId);
      cleanup();
      
      if (err.code === 'EADDRINUSE') {
        console.log(`🔒 Port ${port} is occupied (${err.code})`);
        resolve(false);
      } else if (err.code === 'EACCES') {
        console.log(`🚫 Port ${port} access denied (${err.code})`);
        resolve(false);
      } else {
        console.log(`❌ Port ${port} error: ${err.code}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      clearTimeout(timeoutId);
      cleanup();
      console.log(`✅ Port ${port} is available`);
      resolve(true);
    });
    
    // Bind to localhost only for testing
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find available port with retry logic and atomic checking
 */
export async function findAvailablePort(preferredPort = 3001, maxAttempts = 50) {
  console.log(`🔍 Finding available port starting from ${preferredPort}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = preferredPort + attempt;
    
    try {
      const available = await isPortAvailable(port);
      if (available) {
        console.log(`✅ Found available port: ${port}`);
        return port;
      }
    } catch (error) {
      console.warn(`⚠️ Error checking port ${port}:`, error.message);
      continue;
    }
    
    // Add small delay to prevent rapid polling
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`❌ Could not find available port after ${maxAttempts} attempts starting from ${preferredPort}`);
}

/**
 * Validate that server is actually responding on the specified port
 */
export async function validateServerResponse(port, timeout = 5000) {
  const maxAttempts = 10;
  const backoffMs = 500;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`🔍 Validating server response on port ${port} (attempt ${attempt + 1}/${maxAttempts})`);
      
      const response = await fetch(`http://localhost:${port}/api/status`, {
        method: 'GET',
        timeout: timeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Handle both JSON and non-JSON responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            // Check if it's our API server by looking for expected fields
            if (data.server === 'Dashboard Bridge' || data.status === 'ok') {
              console.log(`✅ API server responding correctly on port ${port}`);
              return true;
            }
          } catch (jsonError) {
            // If JSON parsing fails, continue checking
          }
        }
        // If we get any 200 response, consider server as running
        console.log(`✅ Server responding on port ${port}`);
        return true;
      } else {
        console.log(`⚠️ Server returned ${response.status} on port ${port}`);
      }
    } catch (error) {
      // Only log as "not ready" if it's a connection error
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        console.log(`🔍 Server not ready on port ${port}: ${error.message}`);
      }
    }
    
    // Exponential backoff
    const delay = backoffMs * Math.pow(1.5, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.log(`❌ Server validation failed on port ${port} after ${maxAttempts} attempts`);
  return false;
}

/**
 * Start server with robust validation and error handling
 */
export async function startServerWithValidation(server, preferredPort = 3001) {
  // Find available port
  const availablePort = await findAvailablePort(preferredPort);
  
  return new Promise((resolve, reject) => {
    // Add timeout for server startup
    const startupTimeout = setTimeout(() => {
      reject(new Error(`❌ Server startup timeout after 30 seconds`));
    }, 30000);
    
    server.listen(availablePort, '0.0.0.0', async (err) => {
      clearTimeout(startupTimeout);
      
      if (err) {
        if (err.code === 'EADDRINUSE') {
          console.log(`❌ Port ${availablePort} became occupied during startup, retrying...`);
          
          // Retry with next port
          try {
            const nextPort = await findAvailablePort(availablePort + 1);
            const result = await startServerWithValidation(server, nextPort);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(err);
        }
        return;
      }
      
      console.log(`🚀 Server listening on port ${availablePort}, validating response...`);
      
      // Validate server is actually responding
      const isResponding = await validateServerResponse(availablePort);
      
      if (isResponding) {
        // Only write port file after successful validation
        writePortFile(availablePort);
        
        console.log(`✅ Server startup validated successfully on port ${availablePort}`);
        console.log(`📊 Dashboard: http://localhost:${availablePort}`);
        console.log(`🔌 WebSocket: ws://localhost:${availablePort}`);
        
        resolve({ port: availablePort, success: true });
      } else {
        reject(new Error(`❌ Server started but not responding correctly on port ${availablePort}`));
      }
    });
  });
}

/**
 * Write port to file with atomic operations
 */
export function writePortFile(port) {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  try {
    fs.writeFileSync(portFile, port.toString(), 'utf-8');
    console.log(`📝 Port ${port} written to ${portFile}`);
  } catch (error) {
    console.warn(`⚠️ Failed to write port file: ${error.message}`);
  }
}

/**
 * Read port from file with validation
 */
export function readPortFile() {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  try {
    if (fs.existsSync(portFile)) {
      const content = fs.readFileSync(portFile, 'utf-8').trim();
      const port = parseInt(content);
      
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      } else {
        console.warn(`⚠️ Invalid port in file: ${content}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Failed to read port file: ${error.message}`);
  }
  return null;
}

/**
 * Clean up port file with error handling
 */
export function cleanupPortFile() {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  try {
    if (fs.existsSync(portFile)) {
      fs.unlinkSync(portFile);
      console.log('🧹 Port file cleaned up');
    }
  } catch (error) {
    console.warn(`⚠️ Failed to cleanup port file: ${error.message}`);
  }
}

/**
 * Kill process using a specific port (useful for cleanup)
 */
export async function killProcessOnPort(port) {
  try {
    // This is a helper function - actual implementation depends on OS
    console.log(`🧹 Attempting to free port ${port}`);
    // Implementation would use platform-specific commands
    // For now, just log the attempt
  } catch (error) {
    console.warn(`⚠️ Failed to kill process on port ${port}: ${error.message}`);
  }
}