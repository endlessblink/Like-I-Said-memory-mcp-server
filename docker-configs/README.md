# Docker Configurations

This directory contains Docker configurations for advanced users who want to deploy using Docker.

## Available Configurations

### Dockerfile.production
Multi-stage build with React dashboard and optimized production setup.

### Dockerfile.minimal  
Minimal Node.js server only (no React build).

### Dockerfile.development
Development setup with all dependencies.

## Usage

Copy any Dockerfile to the root directory and rename it to `Dockerfile`:

```bash
# For production deployment
cp docker-configs/Dockerfile.production ./Dockerfile

# For minimal server only
cp docker-configs/Dockerfile.minimal ./Dockerfile
```

## Smithery with Docker

To use Docker with Smithery, update `smithery.yaml`:

```yaml
version: 1
build:
  dockerfile: Dockerfile
  dockerBuildPath: .
start:
  command: ["node", "server-http-fixed.js"]
  port: 3001
```

## Note

Docker files were removed from the root to prevent auto-detection by Smithery. 
The default deployment uses Node.js directly for simplicity.