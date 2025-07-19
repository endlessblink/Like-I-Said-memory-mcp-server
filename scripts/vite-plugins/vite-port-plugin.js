import fs from 'fs';
import path from 'path';

export function portDiscoveryPlugin() {
  return {
    name: 'port-discovery',
    configureServer(server) {
      server.middlewares.use('/api-port', (req, res) => {
        try {
          const portFile = path.join(process.cwd(), '.dashboard-port');
          if (fs.existsSync(portFile)) {
            const port = fs.readFileSync(portFile, 'utf-8').trim();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ port: parseInt(port) }));
          } else {
            // Default port if file doesn't exist
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ port: 3002 }));
          }
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read port file' }));
        }
      });
    }
  };
}