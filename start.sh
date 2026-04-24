#!/bin/bash

# AI Floor Plan Analyzer - Start Script
# This script initializes and starts the application

set -e

echo "=========================================="
echo "  AI Floor Plan Analyzer - Startup Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_NAME="floorplan_db"
DB_USER="floorplan_user"
DB_PASSWORD="floorplan_pass"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on a port (aggressive)
kill_port() {
    local port=$1
    echo -e "${YELLOW}Cleaning up port $port...${NC}"
    # Kill all processes using this port
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    # Also kill any node processes that might be holding the port
    pkill -9 -f "node.*$port" 2>/dev/null || true
    sleep 2
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

echo -e "${BLUE}Step 1: Cleaning up ports...${NC}"
echo ""

# Kill any existing processes on the ports we need
if check_port $BACKEND_PORT; then
    kill_port $BACKEND_PORT
    echo -e "${GREEN}✓ Cleaned port $BACKEND_PORT${NC}"
fi

if check_port $FRONTEND_PORT; then
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}✓ Cleaned port $FRONTEND_PORT${NC}"
fi

# Also check for port 5000 (which we're avoiding)
if check_port 5000; then
    echo -e "${YELLOW}Note: Port 5000 is in use (we're avoiding it)${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Checking PostgreSQL...${NC}"
echo ""

# Check if PostgreSQL is running
if command -v pg_isready &> /dev/null; then
    if pg_isready -q; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}Starting PostgreSQL...${NC}"
        if command -v brew &> /dev/null; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        fi
        sleep 3
    fi
else
    echo -e "${YELLOW}pg_isready not found, assuming PostgreSQL is running${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Setting up database...${NC}"
echo ""

# Create database and user if they don't exist
if command -v psql &> /dev/null; then
    # Check if database exists
    if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" 2>/dev/null; then
        echo "Creating database and user..."
        psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
        psql postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
        psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
        echo -e "${GREEN}✓ Database created${NC}"
    else
        echo -e "${GREEN}✓ Database already exists${NC}"
    fi
else
    echo -e "${YELLOW}psql not found, please ensure PostgreSQL is set up manually${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Installing dependencies...${NC}"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}Step 5: Seeding database...${NC}"
echo ""

# Seed the database
cd "$SCRIPT_DIR/backend"
echo "Running database seed..."
node seed.js
echo -e "${GREEN}✓ Database seeded with sample data${NC}"

cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}Step 6: Starting application with hot reload...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend with nodemon for hot reloading
echo "Starting backend server with hot reload on port $BACKEND_PORT..."
cd "$SCRIPT_DIR/backend"

# Make sure port is free before starting
kill_port $BACKEND_PORT 2>/dev/null || true

npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if check_port $BACKEND_PORT; then
    echo -e "${GREEN}✓ Backend server started on port $BACKEND_PORT${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi

# Start frontend with Vite for hot reloading
echo "Starting frontend server with hot reload on port $FRONTEND_PORT..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if check_port $FRONTEND_PORT; then
    echo -e "${GREEN}✓ Frontend server started on port $FRONTEND_PORT${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
    exit 1
fi

cd "$SCRIPT_DIR"

echo ""
echo "=========================================="
echo -e "${GREEN}  Application Started Successfully!${NC}"
echo "=========================================="
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
echo -e "  ${BLUE}Backend:${NC}   http://localhost:$BACKEND_PORT"
echo ""
echo -e "  ${YELLOW}Demo Credentials:${NC}"
echo "    Email:    demo@example.com"
echo "    Password: password123"
echo ""
echo -e "  ${YELLOW}AI Features:${NC}"
echo "    • AI Room Detector - Detect rooms from floor plans"
echo "    • AI Home Staging Advisor - Real estate staging tips"
echo "    • AI Furniture Placer - Optimal furniture placement"
echo "    • AI Maintenance Predictor - Predict maintenance needs"
echo "    • AI Energy Efficiency Auditor - Energy savings analysis"
echo "    • AI Home Inspection Reporter - Generate inspection reports"
echo ""
echo -e "  ${YELLOW}Development:${NC}"
echo "    • Hot reload enabled for both frontend and backend"
echo "    • Changes to code will automatically reload"
echo "    • Database seeded with 15+ items per feature"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop the servers"
echo "=========================================="
echo ""

# Wait for background processes
wait
