#!/bin/bash

echo "🐳 Simple Docker Test for Like-I-Said Memory App"
echo "Building Docker image..."

# Build the image
if docker build -t like-i-said-test . ; then
    echo "✅ Docker build successful"
    
    echo "🚀 Starting container..."
    
    # Run the container
    if docker run -d --name like-i-said-test-container -p 3001:3001 like-i-said-test ; then
        echo "✅ Container started"
        
        # Wait for startup
        echo "⏳ Waiting for app to start..."
        sleep 10
        
        # Test health endpoint
        echo "🧪 Testing health endpoint..."
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "✅ Health check passed - Docker test successful!"
        else
            echo "❌ Health check failed"
            echo "📝 Container logs:"
            docker logs like-i-said-test-container
        fi
        
        # Cleanup
        echo "🧹 Cleaning up..."
        docker stop like-i-said-test-container
        docker rm like-i-said-test-container
    else
        echo "❌ Failed to start container"
    fi
    
    # Remove image
    docker rmi like-i-said-test
else
    echo "❌ Docker build failed"
fi

echo "🏁 Docker test complete"