#!/bin/bash

echo "Restarting server with latest settings..."

# Kill any existing servers
echo "Stopping existing servers..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

echo "Starting API server on port 3001..."
npm run start:dashboard &

# Wait for server to start
sleep 5

echo "Starting React dev server on port 5173..."
npm run dev &

echo "Servers starting... Check http://localhost:5173"