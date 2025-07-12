#!/bin/bash

# Development startup script
echo "Starting development server..."
echo "Note: Authentication is disabled by default. Enable it in settings if needed."

# Kill any existing process on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start server (authentication controlled by settings)
npm run start:dashboard