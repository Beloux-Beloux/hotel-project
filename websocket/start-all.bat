#!/bin/bash

echo "Starting Hotel Management System..."

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Démarrer le serveur WebSocket
echo -e "${BLUE}Starting WebSocket server...${NC}"
cd websocket
npm start &
WS_PID=$!
echo -e "${GREEN}WebSocket server started (PID: $WS_PID)${NC}"

# Attendre que le serveur WebSocket soit prêt
sleep 2

# Démarrer Laravel
echo -e "${BLUE}Starting Laravel backend...${NC}"
cd ../backend
php artisan serve &
LARAVEL_PID=$!
echo -e "${GREEN}Laravel backend started (PID: $LARAVEL_PID)${NC}"

# Démarrer Next.js
echo -e "${BLUE}Starting Next.js frontend...${NC}"
cd ../frontend
npm run dev &
NEXT_PID=$!
echo -e "${GREEN}Next.js frontend started (PID: $NEXT_PID)${NC}"

echo ""
echo -e "${GREEN}All services started!${NC}"
echo "WebSocket: ws://localhost:3001"
echo "Laravel API: http://localhost:8000"
echo "Next.js: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Fonction pour arrêter tous les services
cleanup() {
    echo ""
    echo -e "${BLUE}Stopping all services...${NC}"
    kill $WS_PID 2>/dev/null
    kill $LARAVEL_PID 2>/dev/null
    kill $NEXT_PID 2>/dev/null
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Intercepter Ctrl+C
trap cleanup SIGINT SIGTERM

# Attendre
wait