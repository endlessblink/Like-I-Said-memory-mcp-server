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
    sourcemap: true,
    // Optimize chunking for better code splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Group vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('react-force-graph') || id.includes('d3-')) {
              return 'visualization';
            }
            if (id.includes('monaco-editor')) {
              return 'editor';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // All other vendor code
            return 'vendor';
          }
        },
        // Use content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit slightly since we're splitting properly
    chunkSizeWarningLimit: 600
  }
})