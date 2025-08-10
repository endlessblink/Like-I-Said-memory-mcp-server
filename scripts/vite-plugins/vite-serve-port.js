import fs from 'fs';
import path from 'path';

/**
 * Vite plugin to serve the dashboard port file
 * This allows the frontend to discover which port the backend is running on
 */
export function viteServePort() {
  return {
    name: 'vite-serve-port',
    configureServer(server) {
      // Serve the .dashboard-port file
      server.middlewares.use('/api-port', (req, res, next) => {
        const portFile = path.join(process.cwd(), '.dashboard-port');
        
        // Set CORS headers for all responses
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }
        
        try {
          if (fs.existsSync(portFile)) {
            const content = fs.readFileSync(portFile, 'utf-8').trim();
            const port = parseInt(content);
            
            // Validate port number
            if (!isNaN(port) && port > 0 && port < 65536) {
              console.log(`📡 Vite serving API port discovery: ${port}`);
              res.end(JSON.stringify({ 
                port: port,
                source: 'file',
                file: portFile,
                timestamp: Date.now()
              }));
            } else {
              console.warn(`⚠️ Invalid port in file: ${content}`);
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: 'Invalid port in file',
                content: content,
                ports: [8776, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008]
              }));
            }
          } else {
            // If no port file exists, return a list of ports to try
            console.log(`📋 Port file not found, providing fallback ports`);
            res.end(JSON.stringify({ 
              ports: [8776, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008],
              message: 'No port file found, try these ports',
              source: 'fallback',
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error(`❌ Port discovery error:`, error.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ 
            error: error.message,
            ports: [8776, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008],
            source: 'error-fallback'
          }));
        }
      });
    }
  };
}