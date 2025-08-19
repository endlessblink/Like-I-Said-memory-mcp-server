import fs from 'fs';
import path from 'path';

export function dynamicProxyPlugin() {
  return {
    name: 'dynamic-proxy',
    configureServer(server) {
      // Override proxy configuration dynamically
      const originalProxyMiddleware = server.middlewares.stack.find(
        layer => layer.route === undefined && layer.handle && layer.handle.name === 'proxyMiddleware'
      );

      if (originalProxyMiddleware) {
        const originalHandle = originalProxyMiddleware.handle;
        
        originalProxyMiddleware.handle = async (req, res, next) => {
          // Read the current port from file
          try {
            const portFile = path.join(process.cwd(), '.dashboard-port');
            if (fs.existsSync(portFile)) {
              const port = parseInt(fs.readFileSync(portFile, 'utf-8').trim());
              
              // Update proxy target dynamically
              if (!isNaN(port) && port > 0) {
                // Update the request URL to use the discovered port
                const target = `http://localhost:${port}`;
                req.headers['x-proxy-target'] = target;
              }
            }
          } catch (error) {
            console.warn('Failed to read port file for proxy:', error);
          }
          
          return originalHandle(req, res, next);
        };
      }
    },
    config(config) {
      // Ensure proxy config exists
      if (!config.server) config.server = {};
      if (!config.server.proxy) config.server.proxy = {};
      
      // Read port from file or use default
      let apiPort = 3002;
      try {
        const portFile = path.join(process.cwd(), '.dashboard-port');
        if (fs.existsSync(portFile)) {
          const filePort = parseInt(fs.readFileSync(portFile, 'utf-8').trim());
          if (!isNaN(filePort) && filePort > 0) {
            apiPort = filePort;
          }
        }
      } catch (error) {
        console.warn('Using default port for proxy config');
      }

      // Update proxy configuration
      config.server.proxy['/api'] = {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Use dynamic port if available
            const dynamicTarget = req.headers['x-proxy-target'];
            if (dynamicTarget) {
              const url = new URL(dynamicTarget);
              proxyReq.setHeader('host', url.host);
              proxyReq.host = url.hostname;
              proxyReq.port = url.port;
            }
          });
        }
      };
      
      config.server.proxy['/ws'] = {
        target: `ws://localhost:${apiPort}`,
        ws: true,
        changeOrigin: true
      };
      
      return config;
    }
  };
}