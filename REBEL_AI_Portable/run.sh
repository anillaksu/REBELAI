#!/bin/bash
# ==========================================
# 🚀 REBEL AI - Dijkstra Edition Launcher
# ==========================================
# Linux/macOS Portable Launcher Script

echo ""
echo "=========================================="
echo "🚀 REBEL AI - Dijkstra Edition"
echo "=========================================="
echo "Portable AI Terminal Starting..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored text
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if portable Node.js exists
if [ -f "bin/node" ]; then
    print_status "Using portable Node.js"
    NODE_PATH="./bin/node"
    chmod +x "$NODE_PATH" 2>/dev/null
elif command -v node >/dev/null 2>&1; then
    print_status "Using system Node.js"
    NODE_PATH="node"
else
    print_error "Node.js not found!"
    echo ""
    echo "Please install Node.js or add portable Node.js to bin folder"
    echo "Download Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi

# Check Node.js version and validate
NODE_VERSION=$($NODE_PATH --version 2>/dev/null)
if [ $? -eq 0 ]; then
    print_info "Node.js version: $NODE_VERSION"
    # Check minimum version (v16+)
    VERSION_NUMBER=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    if [ "$VERSION_NUMBER" -lt 16 ]; then
        print_warning "Node.js version $NODE_VERSION detected. Recommended: v16+"
    fi
else
    print_error "Failed to get Node.js version"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found!"
    echo ""
    echo "📦 This is a portable offline application"
    echo "💡 Dependencies should be pre-installed for offline operation"
    echo ""
    if [ -f "package.json" ]; then
        print_info "Found package.json - for initial setup run: npm install"
    else
        print_error "package.json not found - this may not be a valid REBEL AI directory"
        exit 1
    fi
    echo ""
    echo "❌ Cannot continue without dependencies"
    echo "📋 To set up dependencies for offline use:"
    echo "   1. Ensure you have internet connection"
    echo "   2. Run: npm install"
    echo "   3. Copy the complete directory for offline use"
    echo "   4. Then run this script again"
    echo ""
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "data/logs"

# Set environment variables
export REBEL_PORTABLE=true
export REBEL_LOG_LEVEL=info

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down REBEL AI Server..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🚀 Starting REBEL AI Server..."
echo "🌐 Access the terminal at: http://127.0.0.1:3000"
echo "🔒 Security: Localhost access only - Authentication required"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the server
$NODE_PATH src/server.js --portable

# If we get here, the server stopped
echo ""
echo "🛑 REBEL AI Server stopped"