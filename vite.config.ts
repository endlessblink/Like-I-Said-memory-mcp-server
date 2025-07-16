import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { portDiscoveryPlugin } from './vite-port-plugin.js'
import { dynamicProxyPlugin } from './vite-dynamic-proxy.js'

export default defineConfig({
  plugins: [react(), portDiscoveryPlugin(), dynamicProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 100
    },
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:3002',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
