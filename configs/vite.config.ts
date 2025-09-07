import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteServePort } from '../scripts/vite-plugins/vite-serve-port.js'

export default defineConfig({
  plugins: [react(), viteServePort()],
  root: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src')
    }
  },
  server: {
    port: 8777,
    host: true,
    open: false,  // Don't open browser automatically
    cors: true
  },
  preview: {
    port: 4173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Simplified build config to avoid React import issues
    rollupOptions: {
      input: path.resolve(__dirname, '../public/index.html'),
      output: {
        // Use content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})