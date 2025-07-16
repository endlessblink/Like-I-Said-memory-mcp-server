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
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
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