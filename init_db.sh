#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Initializing Database...${NC}"

# Run migrations
echo "Running Prisma migrations..."
docker-compose exec -T backend pnpm prisma migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Migrations applied successfully!${NC}"
else
    echo -e "${RED}Failed to apply migrations!${NC}"
    exit 1
fi

# Seed database (optional, ask user or just do it if safe)
# For now, let's just create the admin user if needed
echo "Creating default admin user..."
docker-compose exec -T backend pnpm create:admin

echo -e "${GREEN}Database initialized!${NC}"
