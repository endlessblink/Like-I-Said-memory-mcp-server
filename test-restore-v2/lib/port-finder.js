import net from 'net';
import fs from 'fs';
import path from 'path';

/**
 * Find an available port starting from the preferred port
 */
export async function findAvailablePort(preferredPort = 3001, maxAttempts = 100) {
  for (let port = preferredPort; port < preferredPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${preferredPort}`);
}

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    let resolved = false;
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        server.removeAllListeners();
        server.close();
      }
    };
    
    server.once('error', (err) => {
      cleanup();
      if (err.code === 'EADDRINUSE') {
        console.log(`🔍 Port ${port} is in use (${err.code})`);
        resolve(false);
      } else {
        console.log(`🔍 Port ${port} error: ${err.code}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      cleanup();
      console.log(`✅ Port ${port} is available`);
      resolve(true);
    });
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        console.log(`⏰ Port ${port} check timed out`);
        resolve(false);
      }
    }, 1000);
    
    server.listen(port, '0.0.0.0');
  });
}

/**
 * Write the discovered port to a file for the frontend to read
 */
export function writePortFile(port) {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  fs.writeFileSync(portFile, port.toString(), 'utf-8');
  console.log(`✅ Wrote port ${port} to ${portFile}`);
}

/**
 * Read the port from the file
 */
export function readPortFile() {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  try {
    if (fs.existsSync(portFile)) {
      const port = parseInt(fs.readFileSync(portFile, 'utf-8').trim());
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }
  } catch (error) {
    console.warn('Failed to read port file:', error);
  }
  return null;
}

/**
 * Clean up the port file
 */
export function cleanupPortFile() {
  const portFile = path.join(process.cwd(), '.dashboard-port');
  try {
    if (fs.existsSync(portFile)) {
      fs.unlinkSync(portFile);
      console.log('🧹 Cleaned up port file');
    }
  } catch (error) {
    console.warn('Failed to cleanup port file:', error);
  }
}