#!/bin/bash

echo "🚀 Starting Like-I-Said MCP Server v2 Dashboard"
echo "==============================================="

# Kill any existing processes gracefully first
echo "🧹 Cleaning up existing processes..."
pkill -f "dashboard-server-bridge" 2>/dev/null || true
pkill -f "vite.*--port 5173" 2>/dev/null || true
sleep 2

# Force kill if still running
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 3

echo "📡 Starting API server (port 3001)..."
npm run start:dashboard &
API_PID=$!

# Wait for API server to start
sleep 8

# Test if API server is ready
echo "🔍 Checking API server..."
if curl -s "http://localhost:3001/api/status" > /dev/null; then
    echo "✅ API server is ready"
else
    echo "❌ API server failed to start"
    exit 1
fi

echo "🎨 Starting React development server (port 5173)..."
npm run dev &
DEV_PID=$!

echo ""
echo "✅ Dashboard starting up!"
echo "📊 Dashboard URL: http://localhost:5173"
echo "🔌 API Server:   http://localhost:3001"
echo ""
echo "📝 Note: Authentication is disabled by default"
echo "   Enable it in settings if needed for production"
echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $API_PID 2>/dev/null || true
    kill $DEV_PID 2>/dev/null || true
    wait
    echo "✅ Servers stopped"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Wait for user to stop
wait