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
        
        try {
          if (fs.existsSync(portFile)) {
            const port = fs.readFileSync(portFile, 'utf-8').trim();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ port: parseInt(port) }));
          } else {
            // If no port file exists, return a list of ports to try
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ 
              ports: [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008],
              message: 'No port file found, try these ports'
            }));
          }
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}