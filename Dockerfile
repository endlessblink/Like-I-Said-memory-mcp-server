# Test Docker container for Like-I-Said v2.3.1 production version
FROM node:20-alpine

# Install critical dependencies for canvas rendering and graphics libraries
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    fontconfig \
    ttf-freefont \
    glib-dev \
    python3 \
    py3-pip \
    wget

# Install glibc compatibility layer (required for native modules)
RUN wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r1/glibc-2.35-r1.apk && \
    apk add --no-cache glibc-2.35-r1.apk && \
    rm glibc-2.35-r1.apk

# Set node-gyp Python path
ENV npm_config_python=/usr/bin/python3

# Set working directory
WORKDIR /app

# Install the production version from NPM
RUN npm install -g @endlessblink/like-i-said-v2@2.3.2

# Rebuild native modules for Alpine compatibility
RUN npm rebuild --update-binary

# Create memories directory
RUN mkdir -p /app/memories

# Copy memories from build context (will be copied during build)
COPY memories/ /app/memories/

# Expose ports
EXPOSE 3001 5173

# Create test script
RUN echo '#!/bin/sh' > /app/test.sh && \
    echo 'echo "Testing Like-I-Said v2.3.1 from NPM..."' >> /app/test.sh && \
    echo 'echo' >> /app/test.sh && \
    echo 'echo "1. Testing MCP server tools list:"' >> /app/test.sh && \
    echo 'echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}" | npx @endlessblink/like-i-said-v2 start | jq -r ".result.tools[].name" | head -10' >> /app/test.sh && \
    echo 'echo' >> /app/test.sh && \
    echo 'echo "2. Testing test_tool:"' >> /app/test.sh && \
    echo 'echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/call\", \"params\": {\"name\": \"test_tool\", \"arguments\": {\"message\": \"Docker test v2.3.1\"}}}" | npx @endlessblink/like-i-said-v2 start | jq -r ".result.content[0].text"' >> /app/test.sh && \
    echo 'echo' >> /app/test.sh && \
    echo 'echo "3. Checking for GitHub tools (should be empty):"' >> /app/test.sh && \
    echo 'echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}" | npx @endlessblink/like-i-said-v2 start | jq -r ".result.tools[].name" | grep -i github || echo "✅ No GitHub tools found (as expected)"' >> /app/test.sh && \
    chmod +x /app/test.sh

# Default command runs the test
CMD ["/app/test.sh"]