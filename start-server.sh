#!/bin/bash

# Set PATH to include Homebrew binaries
export PATH="/opt/homebrew/bin:$PATH"

# Verify Node.js is available
if ! command -v node &> /dev/null
then
    echo "Node.js is not available. Please install Node.js first."
    exit 1
fi

echo "Starting 100K Pathway development server..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""
echo "Server will be available at http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server in development mode with Chaos Monkey and Auto-Repair
cd "/Users/vishwa/Desktop/100k Pathway"
export NODE_ENV=development
export CHAOS_ENABLED=true
export CHAOS_FAILURE_RATE=0.1
export AUTO_REPAIR_ENABLED=true
node --expose-gc api/server.js