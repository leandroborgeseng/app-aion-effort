#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Detected Docker Compose error. Starting cleanup...${NC}"

# 1. Stop and remove containers
echo -e "${GREEN}1. Removing existing containers...${NC}"
docker-compose down --remove-orphans
docker rm -f aion-effort-backend aion-effort-frontend aion-effort-caddy 2>/dev/null

# 2. Remove specific images to force rebuild
echo -e "${GREEN}2. Removing application images...${NC}"
docker rmi -f app-aion-effort_backend app-aion-effort_frontend 2>/dev/null

# 3. Prune builder cache (optional but helps)
echo -e "${GREEN}3. Pruning build cache...${NC}"
docker builder prune -f

# 4. Retry build and deploy
echo -e "${GREEN}4. Retrying deployment...${NC}"
./deploy_production.sh
