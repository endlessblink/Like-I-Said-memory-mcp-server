@echo off
echo Testing Like-I-Said v2.3.1 Production Version in Docker
echo =========================================================
echo.

echo Building Docker image...
docker-compose build

echo.
echo Running automated tests...
docker-compose run --rm like-i-said-test

echo.
echo Available Docker services:
echo 1. docker-compose run --rm like-i-said-test        - Run automated tests
echo 2. docker-compose up like-i-said-dashboard         - Start dashboard (http://localhost:3001)
echo 3. docker-compose run --rm like-i-said-interactive - Interactive shell for manual testing
echo 4. docker-compose up like-i-said-mcp              - Run MCP server
echo.

echo Quick test commands:
echo ---------------------
echo.

echo # Test tools list (should show only 6 memory tools):
echo docker-compose run --rm like-i-said-interactive sh -c "echo {\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"} | npx @endlessblink/like-i-said-v2 start | jq .result.tools[].name"
echo.

echo # Test memory creation:
echo docker-compose run --rm like-i-said-interactive sh -c "echo {\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/call\", \"params\": {\"name\": \"add_memory\", \"arguments\": {\"content\": \"Docker test memory\", \"tags\": [\"docker\", \"test\"]}}} | npx @endlessblink/like-i-said-v2 start | jq"
echo.

echo # Start interactive testing:
echo docker-compose run --rm like-i-said-interactive
echo.

echo # Clean up:
echo docker-compose down -v