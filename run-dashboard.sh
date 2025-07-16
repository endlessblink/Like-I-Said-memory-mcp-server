#!/bin/bash

echo "Starting Like-I-Said Dashboard..."
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies!"
        exit 1
    fi
    echo
fi

# Check if dist folder exists (built dashboard)
if [ ! -d "dist" ]; then
    echo "Building dashboard..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "Failed to build dashboard!"
        exit 1
    fi
    echo
fi

# Start both servers
echo "Starting API server on port 3001..."
echo "Starting React dashboard on port 5173..."
echo
echo "Once started, open your browser to: http://localhost:5173"
echo

npm run dev:full