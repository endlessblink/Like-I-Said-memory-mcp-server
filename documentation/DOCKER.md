# 🐳 Docker Usage Guide - Like I Said v2.3.3

## Quick Start

### 1. Install from NPM
```bash
npm install -g @endlessblink/like-i-said-v2@2.3.3
```

### 2. Run with Docker
```bash
# Simple dashboard
docker run -p 3002:3001 -v ./memories:/app/memories @endlessblink/like-i-said-v2:latest

# Access dashboard at: http://localhost:3002
```

### 3. Docker Compose (Recommended)
```yaml
version: '3.8'
services:
  like-i-said-dashboard:
    image: node:20-alpine
    container_name: like-i-said-memory
    ports:
      - "3002:3001"
    volumes:
      - ./memories:/app/memories
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
```

## Why Docker for Like I Said? 🚀

### **Enterprise & Team Deployments**
- **Isolated Memory Systems**: Each team gets their own containerized memory
- **Consistent Environments**: Same behavior across dev, staging, production
- **Easy Scaling**: Kubernetes-ready for enterprise deployments

### **AI Development Workflows**
- **Persistent Memory**: Survives container restarts and host reboots
- **Cross-Platform**: Works identically on Windows, Mac, Linux
- **No Conflicts**: Isolated from local development dependencies

### **Cloud & Server Deployments** 
- **AWS/Azure/GCP Ready**: Deploy on any cloud platform
- **Auto-Scaling**: Kubernetes orchestration support
- **Load Balancing**: Multiple memory instances behind load balancer

### **Self-Hosted Privacy**
- **Complete Data Control**: Your memories never leave your infrastructure
- **Security**: Network isolation and custom security policies
- **Compliance**: Meet enterprise data residency requirements

## Production Docker Setup

### Full Production Configuration
```yaml
version: '3.8'
services:
  like-i-said-mcp:
    image: node:20-alpine
    container_name: like-i-said-mcp-server
    volumes:
      - ./memories:/app/memories
      - ./backups:/app/backups
    environment:
      - NODE_ENV=production
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start"
    restart: unless-stopped

  like-i-said-dashboard:
    image: node:20-alpine
    container_name: like-i-said-dashboard
    ports:
      - "3002:3001"
    volumes:
      - ./memories:/app/memories:ro
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
    restart: unless-stopped
    depends_on:
      - like-i-said-mcp

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - like-i-said-dashboard
    restart: unless-stopped
```

## Alpine Linux Compatibility ✅

### v2.3.3 Includes Full Alpine Support
- **Canvas Rendering**: cairo, pango, fontconfig libraries included
- **Graphics Dependencies**: All required Alpine packages
- **Native Modules**: Proper glibc compatibility layer
- **React Force Graph**: Full relationships visualization support

### What's Fixed in v2.3.3:
```dockerfile
# These dependencies are now automatically handled
RUN apk add --no-cache \
    build-base cairo-dev pango-dev fontconfig \
    ttf-freefont glib-dev python3 wget
```

## Memory Persistence

### Recommended Volume Structure
```
./memories/                 # Main memory storage
├── 2025-06-22--memory-1.md
├── 2025-06-22--memory-2.md
└── ...

./backups/                  # Automated backups
├── daily/
├── weekly/
└── monthly/

./config/                   # Configuration
├── docker-compose.yml
└── nginx.conf
```

### Backup Strategy
```bash
# Daily backup cron job
0 2 * * * docker exec like-i-said-mcp-server tar -czf /app/backups/daily/memories-$(date +\%Y-\%m-\%d).tar.gz /app/memories/
```

## Claude/Cursor Integration

### MCP Configuration for Docker
```json
{
  "mcpServers": {
    "like-i-said-memory": {
      "command": "docker",
      "args": ["exec", "like-i-said-mcp-server", "npx", "@endlessblink/like-i-said-v2", "start"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### VS Code/Cursor Dev Container
```json
{
  "name": "Like I Said Memory Environment",
  "dockerComposeFile": "docker-compose.yml",
  "service": "like-i-said-dashboard",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  }
}
```

## Performance & Scaling

### Resource Requirements
- **Minimum**: 512MB RAM, 1 CPU core
- **Recommended**: 1GB RAM, 2 CPU cores  
- **Storage**: 10GB+ for large memory collections
- **Network**: Port 3001 (dashboard), 3000 (MCP server)

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: like-i-said-memory
spec:
  replicas: 3
  selector:
    matchLabels:
      app: like-i-said
  template:
    metadata:
      labels:
        app: like-i-said
    spec:
      containers:
      - name: like-i-said
        image: node:20-alpine
        command: ["/bin/sh", "-c"]
        args: 
          - "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
        ports:
        - containerPort: 3001
        volumeMounts:
        - name: memory-storage
          mountPath: /app/memories
        env:
        - name: NODE_ENV
          value: "production"
      volumes:
      - name: memory-storage
        persistentVolumeClaim:
          claimName: like-i-said-pvc
```

## Troubleshooting

### Common Issues

#### 1. Graph Not Rendering
**Problem**: Relationships graph shows blank
**Solution**: Ensure using v2.3.3+ with Alpine dependencies

#### 2. Memory Persistence
**Problem**: Memories lost on container restart  
**Solution**: Verify volume mounting: `-v ./memories:/app/memories`

#### 3. Port Conflicts
**Problem**: Port 3001 already in use
**Solution**: Change port mapping: `-p 3003:3001`

#### 4. Permission Issues
**Problem**: Cannot write to memory directory
**Solution**: Fix permissions: `chmod 755 ./memories`

### Debug Commands
```bash
# Check container status
docker ps | grep like-i-said

# View logs
docker logs like-i-said-dashboard

# Test MCP server
docker exec like-i-said-mcp-server npx @endlessblink/like-i-said-v2 test

# Verify memory files
docker exec like-i-said-dashboard ls -la /app/memories
```

## Security Considerations

### Production Security
- **Network Isolation**: Use custom Docker networks
- **Read-Only Filesystems**: Mount memories as read-only where possible
- **User Namespaces**: Run containers as non-root user
- **Secret Management**: Use Docker secrets for sensitive config

### Example Secure Setup
```yaml
services:
  like-i-said:
    image: node:20-alpine
    user: "1000:1000"  # Non-root user
    read_only: true    # Read-only filesystem
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

## Support & Updates

### Version Management
```bash
# Check current version
docker exec like-i-said-dashboard npm list -g @endlessblink/like-i-said-v2

# Update to latest
docker exec like-i-said-dashboard npm update -g @endlessblink/like-i-said-v2

# Specific version
docker exec like-i-said-dashboard npm install -g @endlessblink/like-i-said-v2@2.3.3
```

### Getting Help
- **GitHub Issues**: [Like-I-Said-Memory-V2/issues](https://github.com/endlessblink/Like-I-Said-Memory-V2/issues)
- **Docker Hub**: Production Docker images
- **NPM**: [@endlessblink/like-i-said-v2](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)

---

🚀 **Like I Said v2.3.3** - Production-ready Docker memory system for AI development workflows!