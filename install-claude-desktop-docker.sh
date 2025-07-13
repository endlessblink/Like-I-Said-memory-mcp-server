#!/bin/bash

echo "🖥️ Claude Desktop Docker Installation Helper"
echo "=========================================="
echo ""
echo "This script helps you install Claude Desktop in Docker"
echo ""

# Check if user provided installer
if [ -z "$1" ]; then
    echo "Option 1: Download Claude Desktop manually"
    echo "  1. Go to: https://claude.ai/download"
    echo "  2. Download the Linux .deb or .AppImage file"
    echo "  3. Save it to this directory"
    echo "  4. Run: ./install-claude-desktop-docker.sh claude-desktop.deb"
    echo ""
    echo "Option 2: Provide download URL"
    echo "  If you have a direct download URL:"
    echo "  ./install-claude-desktop-docker.sh https://download-url..."
    echo ""
    exit 1
fi

INSTALLER="$1"

# Build Docker image with Claude Desktop
cat > Dockerfile.claude-desktop-install << 'EOF'
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget curl \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libgtk-3-0 libgbm1 libasound2 \
    xvfb x11vnc \
    novnc websockify \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m claude && echo "claude:claude" | chpasswd

WORKDIR /home/claude

# Copy installer (will be added during build)
ARG INSTALLER_FILE
COPY ${INSTALLER_FILE} /tmp/claude-installer

# Install Claude Desktop
RUN if [[ "/tmp/claude-installer" == *.deb ]]; then \
        dpkg -i /tmp/claude-installer || apt-get -f install -y; \
    elif [[ "/tmp/claude-installer" == *.AppImage ]]; then \
        chmod +x /tmp/claude-installer && \
        mv /tmp/claude-installer /opt/claude-desktop.AppImage; \
    fi && \
    rm -f /tmp/claude-installer

# Copy DXT file
COPY dist-dxt/like-i-said-memory-v2.dxt /home/claude/Downloads/

# Setup display
ENV DISPLAY=:99

# Start script
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1280x720x24 &\n\
sleep 2\n\
x11vnc -display :99 -forever -nopw -xkb &\n\
websockify --web=/usr/share/novnc 6080 localhost:5900 &\n\
echo "Access at: http://localhost:6080/vnc.html"\n\
if [ -f /opt/claude-desktop.AppImage ]; then\n\
    /opt/claude-desktop.AppImage --no-sandbox\n\
else\n\
    claude-desktop --no-sandbox\n\
fi' > /start.sh && chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
EOF

# Handle installer
if [[ "$INSTALLER" == http* ]]; then
    echo "📥 Downloading Claude Desktop..."
    wget -O claude-installer "$INSTALLER"
    INSTALLER_FILE="claude-installer"
else
    INSTALLER_FILE="$INSTALLER"
fi

echo "🔨 Building Docker image with Claude Desktop..."
docker build \
    --build-arg INSTALLER_FILE="$INSTALLER_FILE" \
    -f Dockerfile.claude-desktop-install \
    -t claude-desktop-real .

echo ""
echo "🚀 Starting Claude Desktop in Docker..."
echo "   Access via browser: http://localhost:6080/vnc.html"
echo ""

docker run --rm \
    -p 6080:6080 \
    --name claude-desktop-real \
    claude-desktop-real