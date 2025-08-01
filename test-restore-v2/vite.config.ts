import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteServePort } from './scripts/vite-plugins/vite-serve-port.js'

export default defineConfig({
  plugins: [react(), viteServePort()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
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
    sourcemap: true
  }
})