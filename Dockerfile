# Like-I-Said V2 Docker Image
FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build the dashboard
RUN npm run build

# Create memories directory
RUN mkdir -p memories/default

# Expose ports
EXPOSE 3001 5173

# Create a startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Like-I-Said V2 services..."' >> /app/start.sh && \
    echo 'node dashboard-server-bridge.js &' >> /app/start.sh && \
    echo 'echo "Dashboard API running on http://localhost:3001"' >> /app/start.sh && \
    echo 'echo "Access dashboard at http://localhost:5173"' >> /app/start.sh && \
    echo 'npm run preview -- --host 0.0.0.0' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start services
CMD ["/app/start.sh"]