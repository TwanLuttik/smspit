#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export NODE_ENV=${NODE_ENV:-development}
export TWILIO_PORT=${TWILIO_PORT:-4010}
export WEB_PORT=${WEB_PORT:-4011}
export API_URL=${API_URL:-http://localhost:4010}

show_help() {
  echo "SMSPit - Twilio SMS Mock Server"
  echo ""
  echo "Usage: ./run.sh [command]"
  echo ""
  echo "Commands:"
  echo "  dev          Run in development mode (separate terminals)"
  echo "  dev:all      Run server and web in same terminal (development)"
  echo "  build        Build for production"
  echo "  start        Run production server"
  echo "  start:all    Run server and web together (production)"
  echo "  stop         Stop all running processes"
  echo "  clean        Remove build artifacts and database"
  echo "  help         Show this help message"
  echo ""
  echo "Environment variables:"
  echo "  TWILIO_PORT  API server port (default: 4010)"
  echo "  WEB_PORT     Web UI port (default: 4011)"
  echo "  API_URL      API URL for web client (default: http://localhost:4010)"
  echo "  DB_PATH      Path to SQLite database"
}

stop_processes() {
  echo "Stopping SMSPit processes..."
  pkill -f "node dist/index.js" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  pkill -f "tsx" 2>/dev/null || true
  lsof -ti:4010 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:4011 2>/dev/null | xargs kill -9 2>/dev/null || true
  echo "All processes stopped."
}

clean_build() {
  echo "Cleaning build artifacts..."
  rm -rf server/dist
  rm -rf web/dist
  rm -f server/smspit.db server/smspit.db-shm server/smspit.db-wal
  echo "Clean complete."
}

build_all() {
  echo "Building SMSPit..."
  cd server && npm run build && cd ..
  cd web && npm run build && cd ..
  echo "Build complete."
}

start_server() {
  cd server
  rm -f smspit.db 2>/dev/null || true
  node dist/index.js
}

start_web() {
  cd web
  vite --host 0.0.0.0 --port $WEB_PORT
}

start_web_prod() {
  cd web/dist
  npx http-server . -p $WEB_PORT -c-1 --cors
}

case "${1:-}" in
  dev)
    echo "Starting SMSPit in development mode..."
    echo "Run these commands in separate terminals:"
    echo ""
    echo "Terminal 1 (API Server):"
    echo "  cd $SCRIPT_DIR/server && npm run dev"
    echo ""
    echo "Terminal 2 (Web UI):"
    echo "  cd $SCRIPT_DIR/web && npm run dev"
    echo ""
    echo "Then open http://localhost:$WEB_PORT in your browser"
    ;;
  dev:all)
    echo "Starting development mode (single terminal)..."
    echo "Starting API server on port $TWILIO_PORT..."
    cd server
    npm run dev &
    SERVER_PID=$!
    sleep 2
    echo "Starting Web UI on port $WEB_PORT..."
    cd ../web
    npm run dev &
    WEB_PID=$!
    sleep 2
    echo ""
    echo "SMSPit running:"
    echo "  API:   http://localhost:$TWILIO_PORT"
    echo "  Web:   http://localhost:$WEB_PORT"
    echo ""
    echo "Press Ctrl+C to stop"
    wait
    ;;
  build)
    build_all
    ;;
  start)
    echo "Starting production API server on port $TWILIO_PORT..."
    build_all
    start_server
    ;;
start:all)
    echo "Starting SMSPit (production mode)..."
    build_all
    echo "Starting API server on port $TWILIO_PORT..."
    cd "$SCRIPT_DIR/server"
    node dist/index.js &
    SERVER_PID=$!
    sleep 2
    echo "Starting Web UI on port $WEB_PORT..."
    npx http-server "$SCRIPT_DIR/web/dist" -p $WEB_PORT -c-1 --cors &
    WEB_PID=$!
    sleep 2
    echo ""
    echo "SMSPit running:"
    echo "  API:   http://localhost:$TWILIO_PORT"
    echo "  Web:   http://localhost:$WEB_PORT"
    echo ""
    echo "Press Ctrl+C to stop"
    wait $SERVER_PID $WEB_PID
    ;;
  stop)
    stop_processes
    ;;
  clean)
    clean_build
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: ${1:-}"
    echo ""
    show_help
    exit 1
    ;;
esac