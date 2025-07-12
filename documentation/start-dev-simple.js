#!/usr/bin/env node

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5174; // Different port to avoid conflicts

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// API proxy to the main server
app.use('/api', (req, res) => {
  // Simple proxy to localhost:3001
  const url = `http://localhost:3001${req.url}`;
  
  fetch(url, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  })
  .then(response => response.json())
  .then(data => res.json(data))
  .catch(error => {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  });
});

// Handle React Router routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Simple dashboard server running on http://localhost:${PORT}`);
  console.log('📊 This serves the built React app with API proxy');
  console.log('🔧 If you still see React errors, there are component issues to fix');
});