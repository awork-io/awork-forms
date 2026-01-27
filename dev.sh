#!/bin/bash

# Development script to start both frontend and backend
# Usage: ./dev.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting awork Forms development servers..."
echo ""

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$PROJECT_DIR/.env"
    set +a
fi

# Require JWT secret for backend
if [ -z "$JWT_SECRET_KEY" ] || [ ${#JWT_SECRET_KEY} -lt 32 ]; then
    echo "JWT_SECRET_KEY missing or too short. Set it in .env (min 32 chars)."
    exit 1
fi

# Start PostgreSQL via Docker Compose
echo "Starting PostgreSQL..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "PostgreSQL ready!"
        break
    fi
    sleep 1
done

# Set DATABASE_URL for local development
export DATABASE_URL="Host=localhost;Database=awork_forms;Username=postgres;Password=postgres"

# Build backend
echo "Building backend..."
dotnet build "$PROJECT_DIR/backend/backend.csproj" > /tmp/backend_build.log 2>&1 || {
    echo "Backend build failed. See /tmp/backend_build.log"
    exit 1
}

# Build frontend
echo "Building frontend..."
cd "$PROJECT_DIR/frontend"
npm run build > /tmp/frontend_build.log 2>&1 || {
    echo "Frontend build failed. See /tmp/frontend_build.log"
    exit 1
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Keep postgres running for faster restarts (use 'docker compose down' to stop)
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run migrations
echo "Running database migrations..."
cd "$PROJECT_DIR/backend"
dotnet ef database update > /tmp/migrations.log 2>&1 || {
    echo "Migration failed. See /tmp/migrations.log"
    cat /tmp/migrations.log
    exit 1
}
echo "Migrations applied!"

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
