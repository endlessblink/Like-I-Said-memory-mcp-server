# Port Configuration Update

## Summary
Updated the dashboard API server to use port 3002 instead of 3001 to avoid conflicts with other services like Flowise.

## Changes Made

### 1. Dashboard Server (dashboard-server-bridge.js)
- Changed default port from 3001 to 3002
- Updated CORS configuration to use port 3002

### 2. Frontend Configuration
- Updated App.tsx WebSocket connection to port 3002
- Updated vite.config.ts proxy to port 3002
- Updated PathConfiguration.tsx to use dynamic API discovery

### 3. Dynamic Port Detection (Future Enhancement)
The system has been prepared for automatic port detection:
- Server can find available ports automatically
- Frontend can discover API port dynamically
- This will prevent port conflicts in the future

## Usage
The dashboard now runs on:
- API Server: http://localhost:3002
- Dashboard UI: http://localhost:5173

## Migration
If you have existing configurations pointing to port 3001, update them to use port 3002.