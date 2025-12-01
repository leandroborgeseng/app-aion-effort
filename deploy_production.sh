#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Production Deployment...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker Desktop and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}1. Building Docker containers...${NC}"
docker-compose build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}2. Starting services...${NC}"
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start services!${NC}"
    exit 1
fi

echo -e "${GREEN}3. Checking service health...${NC}"
echo "Waiting for services to initialize (30s)..."
sleep 30

check_health() {
    local container_name=$1
    local status=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null)
    
    if [ "$status" == "healthy" ]; then
        echo -e "${GREEN}$container_name is Healthy!${NC}"
        return 0
    else
        echo -e "${RED}$container_name health check failed! Status: ${status:-unknown}${NC}"
        echo "Check logs with: docker logs $container_name"
        return 1
    fi
}

# Check backend health
check_health "aion-effort-backend"

# Check frontend health
check_health "aion-effort-frontend"

echo -e "${GREEN}Deployment Process Finished.${NC}"
echo "If services are healthy, access the application at: https://av.aion.eng.br"
