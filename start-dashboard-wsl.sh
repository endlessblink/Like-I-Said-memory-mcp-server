#!/bin/bash

echo "🚀 Starting Like-I-Said Dashboard for WSL2..."
echo ""

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "dashboard-server-bridge" 2>/dev/null || true
pkill -f "node.*3[0-9][0-9][0-9]" 2>/dev/null || true
pkill -f "node.*8080" 2>/dev/null || true
sleep 2

# Check if dist exists
if [ ! -f "dist/index.html" ]; then
    echo "⚠️  No production build found. Building now..."
    npm run build
fi

# Find available port
PORT=3010
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo "Port $PORT is busy, trying $((PORT+1))..."
    PORT=$((PORT+1))
done

echo "✅ Found available port: $PORT"
echo ""

# Start the server
echo "Starting server on port $PORT..."
PORT=$PORT node dashboard-server-bridge.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Get WSL IP
WSL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "✨ Dashboard is ready! ✨"
echo ""
echo "Access from WITHIN WSL2:"
echo "  → http://localhost:$PORT"
echo "  → http://127.0.0.1:$PORT"
echo ""
echo "Access from WINDOWS Firefox:"
echo "  → http://localhost:$PORT (if port forwarding is set up)"
echo "  → http://$WSL_IP:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Keep script running
wait $SERVER_PID