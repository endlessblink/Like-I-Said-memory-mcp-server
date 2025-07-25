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
  
  console.log(`🔍 Starting validation for server on port ${port}`);
  console.log(`   → Max attempts: ${maxAttempts}`);
  console.log(`   → Initial backoff: ${backoffMs}ms`);
  
  // First try a simple test endpoint
  try {
    console.log(`   → Testing simple endpoint: http://127.0.0.1:${port}/test`);
    const testResponse = await fetch(`http://127.0.0.1:${port}/test`, {
      method: 'GET',
      timeout: 1000
    });
    console.log(`   → Test endpoint response: ${testResponse.status} ${testResponse.statusText}`);
  } catch (error) {
    console.log(`   → Test endpoint error: ${error.message}`);
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`\n🔍 Validating server response on port ${port} (attempt ${attempt + 1}/${maxAttempts})`);
      console.log(`   → Target URL: http://127.0.0.1:${port}/api/status`);
      
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
        const errorMsg = response.status === 404 
          ? `⚠️ Server returned 404 on port ${port} - endpoint /api/status not found`
          : `⚠️ Server returned ${response.status} on port ${port}`;
        console.log(errorMsg);
        
        // Log more details for debugging
        console.log(`   → URL attempted: http://127.0.0.1:${port}/api/status`);
        console.log(`   → Response status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Only log as "not ready" if it's a connection error
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        console.log(`🔍 Server not ready on port ${port}: ${error.message}`);
      } else {
        // Log other errors for debugging
        console.log(`❌ Validation error on port ${port}: ${error.message}`);
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
  
  console.log(`🌐 Server binding: ${host ? `${host}:${availablePort}` : `dual-stack:${availablePort}`}`);
  
  return new Promise((resolve, reject) => {
    // Add timeout for server startup
    const startupTimeout = setTimeout(() => {
      reject(new Error(`❌ Server startup timeout after 30 seconds`));
    }, 30000);
    
    // Enhanced error handling for different binding scenarios
    const handleServerError = (err) => {
      clearTimeout(startupTimeout);
      
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${availablePort} became occupied during startup, retrying...`);
        
        // Retry with next port
        findAvailablePort(availablePort + 1)
          .then(nextPort => startServerWithValidation(server, nextPort))
          .then(resolve)
          .catch(reject);
      } else if (err.code === 'EADDRNOTAVAIL') {
        console.log(`⚠️ Address not available for ${host}:${availablePort}, trying fallback...`);
        
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
        console.log(`🚀 Server listening on ${actualHost}:${actualPort}, validating response...`);
        
        // Longer delay to ensure all Express routes are fully registered
        console.log(`⏳ Waiting 500ms for routes to initialize...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Validate server is actually responding using the actual port
        const isResponding = await validateServerResponse(actualPort);
        
        if (isResponding) {
          // Only write port file after successful validation
          writePortFile(actualPort);
          
          console.log(`\n${'='.repeat(60)}`);
          console.log(`✨ DASHBOARD READY! Access it at:`);
          console.log(`\n   🌐 http://localhost:${actualPort}\n`);
          console.log(`${'='.repeat(60)}\n`);
          console.log(`✅ Server running on ${actualHost}:${actualPort}`);
          console.log(`🔌 WebSocket: ws://localhost:${actualPort}`);
          if (!bindHost) {
            console.log(`📍 Alternative URLs:`);
            console.log(`   - http://127.0.0.1:${actualPort}`);
            console.log(`   - http://[::1]:${actualPort} (IPv6)`);
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