# Docker Testing Setup for Like-I-Said v2.3.2 Production Version

## Overview
Complete Docker setup created for testing Like-I-Said v2.3.2 production version with the dashboard interface. This setup ensures safe testing by copying memories instead of mounting them directly.

## Production Version Details
- **NPM Package**: @endlessblink/like-i-said-v2@2.3.2
- **Architecture**: Pure markdown storage (no JSON)
- **Memory Tools**: 6 tools only (no GitHub integration)
- **Restored Memories**: 109+ memories from backup

## Complete Docker Setup

### 1. Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create memories directory and copy memories
RUN mkdir -p memories
COPY memories ./memories/

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server-markdown.js"]
```

### 2. docker-compose.yml
```yaml
version: '3.8'

services:
  like-i-said:
    build: .
    ports:
      - "3002:3001"  # Map to 3002 to avoid conflicts
    volumes:
      - ./memories:/app/memories:ro  # Read-only mount
    environment:
      - NODE_ENV=production
    command: node server-markdown.js

  like-i-said-dashboard:
    build: .
    ports:
      - "3002:3001"  # Map to 3002 to avoid conflicts
    environment:
      - NODE_ENV=production
    command: node dashboard-server-bridge.js

  like-i-said-test:
    build: .
    volumes:
      - ./test-memories:/app/memories  # Test with separate memories
    environment:
      - NODE_ENV=test
    command: npm test
```

### 3. .dockerignore
```
node_modules/
.git/
.env
*.log
test/
coverage/
.nyc_output/
```

### 4. docker-test.sh (Linux/Mac)
```bash
#!/bin/bash

echo "Building and running Like-I-Said Dashboard v2.3.2..."
echo "================================================="

# Build the Docker image
docker-compose build like-i-said-dashboard

# Run the dashboard service
echo ""
echo "Starting dashboard on http://localhost:3002"
echo "Press Ctrl+C to stop"
echo ""

docker-compose up like-i-said-dashboard
```

### 5. docker-test.bat (Windows)
```batch
@echo off
echo Building and running Like-I-Said Dashboard v2.3.2...
echo ==================================================

REM Build the Docker image
docker-compose build like-i-said-dashboard

REM Run the dashboard service
echo.
echo Starting dashboard on http://localhost:3002
echo Press Ctrl+C to stop
echo.

docker-compose up like-i-said-dashboard
```

### 6. test-docker-simple.sh (Simplified Testing)
```bash
#!/bin/bash
echo "Quick Docker test for Like-I-Said v2.3.2"
docker-compose up --build like-i-said-dashboard
```

## Issues Encountered and Solutions

### 1. Module Path Error (Fixed in v2.3.2)
- **Issue**: Module resolution failed in Docker container
- **Solution**: Updated import paths in server files to use proper relative paths
- **Fix Applied**: Corrected paths in dashboard-server-bridge.js and server-markdown.js

### 2. Port Conflict Resolution
- **Issue**: Port 3001 already in use by development server
- **Solution**: Mapped container port 3001 to host port 3002 in docker-compose.yml
- **Configuration**: `"3002:3001"` in ports mapping

### 3. Memory Safety Implementation
- **Issue**: Direct mounting could corrupt production memories during testing
- **Solution**: Dockerfile copies memories during build instead of mounting
- **Safety Measure**: `COPY memories ./memories/` ensures isolated copy

### 4. Dashboard Server Requirements
- **Issue**: Dashboard wouldn't start with standard server-markdown.js
- **Solution**: Use dashboard-server-bridge.js for dashboard service
- **Bridge Function**: Serves both API and static dashboard files

## Testing Commands Reference

### Docker Compose Commands
```bash
# Build specific service
docker-compose build like-i-said-dashboard

# Build all services
docker-compose build

# Run dashboard (recommended)
docker-compose up like-i-said-dashboard

# Run with build
docker-compose up --build like-i-said-dashboard

# Run in background
docker-compose up -d like-i-said-dashboard

# View logs
docker-compose logs like-i-said-dashboard

# Stop services
docker-compose down

# Clean up
docker-compose down --rmi all --volumes
```

### Quick Testing Scripts
```bash
# Windows users
docker-test.bat

# Linux/Mac users
chmod +x docker-test.sh
./docker-test.sh

# Simplified test
chmod +x test-docker-simple.sh
./test-docker-simple.sh
```

## Access Points and URLs
- **Dashboard Interface**: http://localhost:3002
- **API Endpoint**: http://localhost:3002/memories
- **Health Check**: http://localhost:3002/health (if implemented)
- **Memory List**: http://localhost:3002/memories (GET request)

## Docker Container Architecture
```
/app/ (Container Root)
├── node_modules/          # NPM dependencies
├── memories/              # Copied memories (safe isolation)
│   ├── memory-001.md
│   ├── memory-002.md
│   └── ... (109+ files)
├── public/                # Static dashboard files
├── src/                   # React components
├── server-markdown.js     # Main server
├── dashboard-server-bridge.js  # Dashboard server
├── package.json
└── package-lock.json
```

## Production Version Features (v2.3.2)
1. **Pure Markdown Storage**: No JSON dependencies
2. **Streamlined Tool Set**: Only 6 essential memory tools
3. **No GitHub Integration**: Simplified, standalone operation
4. **React Dashboard**: Full UI for memory management
5. **Safe Docker Deployment**: Isolated memory handling
6. **NPM Distribution**: Available as @endlessblink/like-i-said-v2

## Available Memory Management Tools
1. **create_memory** - Create new memories with title and content
2. **search_memories** - Search memories by keywords or content
3. **list_memories** - List all memories with pagination
4. **get_memory** - Retrieve specific memory by ID
5. **update_memory** - Update existing memory content
6. **delete_memory** - Remove memory permanently

## Memory File Structure
Each memory is stored as a markdown file with YAML frontmatter:
```markdown
---
title: "Memory Title"
tags: ["tag1", "tag2"]
created: "2024-01-01T12:00:00Z"
updated: "2024-01-01T12:00:00Z"
---

Memory content in markdown format...
```

## Verification and Testing Checklist
- [ ] Dashboard loads at http://localhost:3002
- [ ] Memory count displays 109+ memories
- [ ] Search functionality works
- [ ] Can create new test memory
- [ ] Memory files visible in container
- [ ] No port conflicts
- [ ] Container logs show no errors
- [ ] API endpoints respond correctly

## Troubleshooting Guide

### Common Issues
1. **Port 3002 in use**: Change port mapping in docker-compose.yml
2. **Build fails**: Check Docker daemon is running
3. **Memories not loading**: Verify memories/ directory exists
4. **Module errors**: Ensure v2.3.2 package is used
5. **Dashboard blank**: Check dashboard-server-bridge.js is used

### Debug Commands
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs like-i-said-dashboard

# Execute commands in container
docker-compose exec like-i-said-dashboard sh

# Inspect container filesystem
docker-compose exec like-i-said-dashboard ls -la /app/memories/
```

## Production Deployment Notes
- Always backup memories before testing
- Use copied memories, never direct mounts in production
- Monitor container resource usage
- Keep Docker images updated
- Use specific version tags (v2.3.2)
- Test thoroughly before production deployment

## File Manifest (Created Files)
- `/Dockerfile` - Container definition
- `/docker-compose.yml` - Service orchestration
- `/.dockerignore` - Build exclusions
- `/docker-test.sh` - Linux/Mac test script
- `/docker-test.bat` - Windows test script
- `/test-docker-simple.sh` - Simplified test script

This comprehensive setup provides a complete, safe, and reproducible testing environment for the Like-I-Said v2.3.2 production version with full dashboard functionality and proper memory isolation.