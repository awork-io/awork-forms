#!/bin/bash

# Development script to start both frontend and backend
# Usage: ./dev.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting awork Forms development servers..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "Starting backend (http://localhost:5100)..."
cd "$PROJECT_DIR/backend"
dotnet run > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:5100/api/health > /dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    sleep 1
done

# Start frontend
echo "Starting frontend (http://localhost:5173)..."
cd "$PROJECT_DIR/frontend"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "Waiting for frontend..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "Frontend ready!"
        break
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo "  awork Forms Development Servers"
echo "=========================================="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5100"
echo ""
echo "  Logs:"
echo "    Backend:  tail -f /tmp/backend.log"
echo "    Frontend: tail -f /tmp/frontend.log"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "=========================================="

# Wait for both processes
wait
