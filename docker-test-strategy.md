# Docker Testing Strategy for DXT Validation

## Overview

Testing the DXT package in Docker environments to simulate real user installations across different platforms.

## Challenges & Solutions

### ❌ **Claude Desktop in Docker Issues**

**Problem**: Claude Desktop is a GUI application that:
- Requires X11/Wayland display server
- Has complex authentication flows
- Needs access to user directories
- May have licensing restrictions for automated testing

**Better Approach**: Test the MCP server components directly and simulate Claude Desktop's behavior.

## 🐳 **Docker Test Strategy**

### 1. MCP Server Testing Containers

Test the DXT package in clean environments that simulate what Claude Desktop would do:

```dockerfile
# Test on Ubuntu (simulates Linux users)
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y nodejs npm unzip curl
COPY like-i-said-memory-v2.dxt /tmp/
# Extract and test MCP server

# Test on Alpine (simulates minimal environments)
FROM node:18-alpine
RUN apk add --no-cache unzip
COPY like-i-said-memory-v2.dxt /tmp/
# Test in minimal environment

# Test on Windows Server Core (simulates Windows)
FROM mcr.microsoft.com/windows/servercore:ltsc2022
# Install Node.js and test
```

### 2. Multi-Platform Testing Matrix

| Platform | Base Image | Node.js | Purpose |
|----------|------------|---------|---------|
| **Linux x64** | `ubuntu:22.04` | 18, 20, 22 | Most common Linux |
| **Linux ARM64** | `ubuntu:22.04` | 18, 20, 22 | ARM-based systems |
| **Alpine** | `node:18-alpine` | 18 | Minimal environments |
| **Windows** | `mcr.microsoft.com/windows/nanoserver` | 18 | Windows containers |
| **CentOS** | `centos:8` | 18 | Enterprise Linux |

### 3. Dashboard Testing

Test the React dashboard in containerized environments:

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3001 5173
CMD ["npm", "run", "dev:full"]
```

## 🧪 **Comprehensive Test Plan**

### Phase 1: DXT Package Validation
- Extract DXT in each container
- Verify all files present
- Test MCP server startup
- Validate all 11 tools work
- Check memory/task persistence

### Phase 2: Integration Testing  
- Simulate Claude Desktop MCP communication
- Test JSON-RPC protocol compliance
- Verify error handling
- Performance testing under load

### Phase 3: Cross-Platform Compatibility
- Test on different Node.js versions
- Verify path handling across platforms  
- Test environment variable configuration
- Validate file permissions

### Phase 4: Dashboard Integration
- Test API server in containers
- Verify WebSocket connections
- Test real-time updates
- Cross-browser compatibility