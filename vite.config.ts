import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    commonjsOptions: {
      include: [/react-force-graph/, /d3/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          reactForceGraph: ['react-force-graph-2d', 'd3', 'd3-force'],
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react-force-graph-2d', 'd3', 'd3-force', 'd3-selection', 'd3-zoom']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
