#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
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

# Check backend health
if curl -s http://localhost:4000/health | grep -q "true"; then
    echo -e "${GREEN}Backend is Healthy!${NC}"
else
    echo -e "${RED}Backend health check failed!${NC}"
    echo "Check logs with: docker-compose logs backend"
fi

# Check frontend health
if curl -s http://localhost/health | grep -q "200"; then
    echo -e "${GREEN}Frontend is Healthy!${NC}"
else
    echo -e "${RED}Frontend health check failed!${NC}"
    echo "Check logs with: docker-compose logs frontend"
fi

echo -e "${GREEN}Deployment Complete!${NC}"
echo "Access the application at: http://localhost"
