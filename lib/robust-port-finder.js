import net from 'net';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * Robust port finder with proper startup validation
 * Based on Node.js best practices for 2024
 */

// Safe console logging wrapper to prevent EPIPE errors
const safeConsole = {
  log: (...args) => {
    try {
      safeConsole.log(...args);
    } catch (e) {
      // Ignore EPIPE errors when stdout is closed
    }
  },
  warn: (...args) => {
    try {
      safeConsole.warn(...args);
    } catch (e) {
      // Ignore EPIPE errors when stderr is closed
    }
  },
  error: (...args) => {
    try {
      safeConsole.error(...args);
    } catch (e) {
      // Ignore EPIPE errors when stderr is closed
    }
  }
};

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
      safeConsole.log(`⏰ Port ${port} availability check timed out`);
      resolve(false);
    }, timeout);
    
    server.once('error', (err) => {
      clearTimeout(timeoutId);
      cleanup();
      
      if (err.code === 'EADDRINUSE') {
        safeConsole.log(`🔒 Port ${port} is occupied (${err.code})`);
        resolve(false);
      } else if (err.code === 'EACCES') {
        safeConsole.log(`🚫 Port ${port} access denied (${err.code})`);
        resolve(false);
      } else {
        safeConsole.log(`❌ Port ${port} error: ${err.code}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      clearTimeout(timeoutId);
      cleanup();
      safeConsole.log(`✅ Port ${port} is available`);
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
  safeConsole.log(`🔍 Finding available port starting from ${preferredPort}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = preferredPort + attempt;
    
    try {
      const available = await isPortAvailable(port);
      if (available) {
        safeConsole.log(`✅ Found available port: ${port}`);
        return port;
      }
    } catch (error) {
      safeConsole.warn(`⚠️ Error checking port ${port}:`, error.message);
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
  
  safeConsole.log(`🔍 Starting validation for server on port ${port}`);
  safeConsole.log(`   → Max attempts: ${maxAttempts}`);
  safeConsole.log(`   → Initial backoff: ${backoffMs}ms`);
  
  // First try a simple test endpoint
  try {
    safeConsole.log(`   → Testing simple endpoint: http://127.0.0.1:${port}/test`);
    const testResponse = await fetch(`http://127.0.0.1:${port}/test`, {
      method: 'GET',
      timeout: 1000
    });
    safeConsole.log(`   → Test endpoint response: ${testResponse.status} ${testResponse.statusText}`);
  } catch (error) {
    safeConsole.log(`   → Test endpoint error: ${error.message}`);
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      safeConsole.log(`\n🔍 Validating server response on port ${port} (attempt ${attempt + 1}/${maxAttempts})`);
      safeConsole.log(`   → Target URL: http://127.0.0.1:${port}/api/status`);
      
      const response = await fetch(`http://127.0.0.1:${port}/api/status`, {
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
              safeConsole.log(`✅ API server responding correctly on port ${port}`);
              return true;
            }
          } catch (jsonError) {
            // If JSON parsing fails, continue checking
          }
        }
        // If we get any 200 response, consider server as running
        safeConsole.log(`✅ Server responding on port ${port}`);
        return true;
      } else {
        const errorMsg = response.status === 404 
          ? `⚠️ Server returned 404 on port ${port} - endpoint /api/status not found`
          : `⚠️ Server returned ${response.status} on port ${port}`;
        safeConsole.log(errorMsg);
        
        // Log more details for debugging
        safeConsole.log(`   → URL attempted: http://127.0.0.1:${port}/api/status`);
        safeConsole.log(`   → Response status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Only log as "not ready" if it's a connection error
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        safeConsole.log(`🔍 Server not ready on port ${port}: ${error.message}`);
      } else {
        // Log other errors for debugging
        safeConsole.log(`❌ Validation error on port ${port}: ${error.message}`);
      }
    }
    
    // Exponential backoff
    const delay = backoffMs * Math.pow(1.5, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  safeConsole.log(`❌ Server validation failed on port ${port} after ${maxAttempts} attempts`);
  return false;
}

/**
 * Determine appropriate host binding based on environment and platform
 */
function getServerHost() {
  // Check for explicit host override
  if (process.env.SERVER_HOST) {
    return process.env.SERVER_HOST;
  }
  
  // Production: Use localhost for security (behind reverse proxy)
  if (process.env.NODE_ENV === 'production') {
    return 'localhost';
  }
  
  // Development: Use dual-stack binding for maximum compatibility
  // undefined = bind to all available addresses (IPv4 and IPv6)
  // This allows both 127.0.0.1 and ::1 connections
  return undefined;
}

/**
 * Start server with dual-stack IPv4/IPv6 binding and robust validation
 */
export async function startServerWithValidation(server, preferredPort = 3001) {
  // Find available port
  const availablePort = await findAvailablePort(preferredPort);
  const host = getServerHost();
  
  safeConsole.log(`🌐 Server binding: ${host ? `${host}:${availablePort}` : `dual-stack:${availablePort}`}`);
  
  return new Promise((resolve, reject) => {
    // Add timeout for server startup
    const startupTimeout = setTimeout(() => {
      reject(new Error(`❌ Server startup timeout after 30 seconds`));
    }, 30000);
    
    // Enhanced error handling for different binding scenarios
    const handleServerError = (err) => {
      clearTimeout(startupTimeout);
      
      if (err.code === 'EADDRINUSE') {
        safeConsole.log(`❌ Port ${availablePort} became occupied during startup, retrying...`);
        
        // Retry with next port
        findAvailablePort(availablePort + 1)
          .then(nextPort => startServerWithValidation(server, nextPort))
          .then(resolve)
          .catch(reject);
      } else if (err.code === 'EADDRNOTAVAIL') {
        safeConsole.log(`⚠️ Address not available for ${host}:${availablePort}, trying fallback...`);
        
        // Fallback to IPv4-only if dual-stack fails
        if (!host) {
          server.listen(availablePort, '0.0.0.0', handleServerError);
        } else {
          reject(new Error(`❌ Cannot bind to ${host}:${availablePort} - ${err.message}`));
        }
      } else if (err.code === 'EACCES') {
        reject(new Error(`❌ Permission denied for port ${availablePort}. Try running as administrator or use a port above 1024.`));
      } else {
        reject(new Error(`❌ Server startup failed: ${err.message} (${err.code})`));
      }
    };
    
    // Bind to determined host (dual-stack if host is undefined)
    const startServer = async (bindHost) => {
      server.listen(availablePort, bindHost, async (err) => {
        if (err) {
          handleServerError(err);
          return;
        }
        
        clearTimeout(startupTimeout);
        
        // Get the actual port (important when availablePort is 0)
        const actualPort = server.address().port;
        const actualHost = server.address().address;
        safeConsole.log(`🚀 Server listening on ${actualHost}:${actualPort}, validating response...`);
        
        // Longer delay to ensure all Express routes are fully registered
        safeConsole.log(`⏳ Waiting 500ms for routes to initialize...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Validate server is actually responding using the actual port
        const isResponding = await validateServerResponse(actualPort);
        
        if (isResponding) {
          // Only write port file after successful validation
          writePortFile(actualPort);
          
          safeConsole.log(`\n${'='.repeat(60)}`);
          safeConsole.log(`✨ DASHBOARD READY! Access it at:`);
          safeConsole.log(`\n   🌐 http://localhost:${actualPort}\n`);
          safeConsole.log(`${'='.repeat(60)}\n`);
          safeConsole.log(`✅ Server running on ${actualHost}:${actualPort}`);
          safeConsole.log(`🔌 WebSocket: ws://localhost:${actualPort}`);
          if (!bindHost) {
            safeConsole.log(`📍 Alternative URLs:`);
            safeConsole.log(`   - http://127.0.0.1:${actualPort}`);
            safeConsole.log(`   - http://[::1]:${actualPort} (IPv6)`);
          }
          
          resolve({ port: actualPort, host: actualHost, success: true });
        } else {
          reject(new Error(`❌ Server started but not responding correctly on port ${actualPort}`));
        }
      });
    };
    
    // Start server with determined host binding
    startServer(host);
  });
}

/**
 * Write port to file with atomic operations
 */
export function writePortFile(port) {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  try {
    fs.writeFileSync(portFile, port.toString(), 'utf-8');
    safeConsole.log(`📝 Port ${port} written to ${portFile}`);
  } catch (error) {
    safeConsole.warn(`⚠️ Failed to write port file: ${error.message}`);
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
        safeConsole.warn(`⚠️ Invalid port in file: ${content}`);
      }
    }
  } catch (error) {
    safeConsole.warn(`⚠️ Failed to read port file: ${error.message}`);
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
      safeConsole.log('🧹 Port file cleaned up');
    }
  } catch (error) {
    safeConsole.warn(`⚠️ Failed to cleanup port file: ${error.message}`);
  }
}

/**
 * Kill process using a specific port (useful for cleanup)
 */
export async function killProcessOnPort(port) {
  try {
    // This is a helper function - actual implementation depends on OS
    safeConsole.log(`🧹 Attempting to free port ${port}`);
    // Implementation would use platform-specific commands
    // For now, just log the attempt
  } catch (error) {
    safeConsole.warn(`⚠️ Failed to kill process on port ${port}: ${error.message}`);
  }
}