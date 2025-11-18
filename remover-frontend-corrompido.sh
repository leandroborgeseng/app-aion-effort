#!/bin/bash

# Script para remover container frontend corrompido

set -e

echo "=========================================="
echo "Removendo container frontend corrompido"
echo "=========================================="

# 1. Parar o frontend
echo ""
echo "1. Parando frontend..."
docker-compose stop frontend 2>/dev/null || true

# 2. Remover container pelo nome
echo ""
echo "2. Removendo container aion-effort-frontend..."
docker rm -f aion-effort-frontend 2>/dev/null || true

# 3. Remover containers relacionados ao frontend
echo ""
echo "3. Removendo containers relacionados..."
docker ps -a | grep frontend | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 4. Remover containers na porta 3000
echo ""
echo "4. Removendo containers na porta 3000..."
docker ps -a --filter "publish=3000" -q | xargs -r docker rm -f 2>/dev/null || true

# 5. Verificar se foi removido
echo ""
echo "5. Verificando containers restantes..."
docker ps -a | grep frontend || echo "   Nenhum container frontend encontrado"

echo ""
echo "=========================================="
echo "Container removido!"
echo "=========================================="
echo ""
echo "Agora você pode executar:"
echo "  docker-compose build --no-cache frontend"
echo "  docker-compose up -d frontend"
echo ""

