import fs from 'fs';
import path from 'path';
import httpProxy from 'http-proxy-middleware';

export function fullDynamicProxyPlugin() {
  let apiPort = 3001; // Default fallback
  
  return {
    name: 'full-dynamic-proxy',
    configureServer(server) {
      // Function to read current port
      const getApiPort = () => {
        try {
          const portFile = path.join(process.cwd(), '.dashboard-port');
          if (fs.existsSync(portFile)) {
            const port = parseInt(fs.readFileSync(portFile, 'utf-8').trim());
            if (!isNaN(port) && port > 0) {
              apiPort = port;
            }
          }
        } catch (error) {
          console.warn('Could not read port file:', error);
        }
        return apiPort;
      };

      // Create proxy middleware
      const apiProxy = httpProxy.createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
        logLevel: 'warn',
        router: (req) => {
          // Dynamically get port for each request
          const currentPort = getApiPort();
          return `http://localhost:${currentPort}`;
        },
        onError: (err, req, res) => {
          console.error('Proxy error:', err.message);
          // Try to read port again in case it changed
          const currentPort = getApiPort();
          console.log(`Current API port: ${currentPort}`);
        }
      });

      // Use the proxy for all /api routes
      server.middlewares.use('/api', apiProxy);
      
      // Also handle WebSocket upgrade
      server.httpServer?.on('upgrade', (request, socket, head) => {
        if (request.url?.startsWith('/ws')) {
          apiProxy.upgrade(request, socket, head);
        }
      });
    }
  };
}