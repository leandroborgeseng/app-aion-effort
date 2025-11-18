#!/bin/bash

# Script para remover containers corrompidos e órfãos

set -e

echo "=========================================="
echo "Removendo containers corrompidos e órfãos"
echo "=========================================="

# 1. Parar docker-compose
echo ""
echo "1. Parando docker-compose..."
docker-compose down --remove-orphans 2>/dev/null || true

# 2. Remover containers manualmente pelo nome
echo ""
echo "2. Removendo containers pelo nome..."
for container in aion-effort-app aion-effort-backend aion-effort-frontend; do
    echo "   Removendo $container..."
    docker rm -f $container 2>/dev/null || true
done

# 3. Remover containers órfãos relacionados ao projeto
echo ""
echo "3. Removendo containers órfãos..."
docker ps -a --filter "name=aion-effort" -q | xargs -r docker rm -f 2>/dev/null || true

# 4. Remover containers que estão usando as portas
echo ""
echo "4. Removendo containers nas portas 3000 e 4000..."
docker ps -a --filter "publish=3000" -q | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "publish=4000" -q | xargs -r docker rm -f 2>/dev/null || true

# 5. Remover containers com erro ou parados relacionados
echo ""
echo "5. Removendo containers parados relacionados..."
docker ps -a | grep -E "(aion|3724af6f09ce)" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 6. Limpar volumes órfãos
echo ""
echo "6. Limpando volumes órfãos..."
docker volume prune -f 2>/dev/null || true

# 7. Verificar se ainda há containers
echo ""
echo "7. Containers restantes relacionados ao projeto:"
docker ps -a | grep -E "(aion|3724af6f09ce)" || echo "   Nenhum container encontrado"

# 8. Limpar imagens antigas (opcional)
echo ""
echo "8. Removendo imagens antigas do projeto..."
docker images | grep -E "(aion-effort|app-aion-effort)" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo ""
echo "=========================================="
echo "Limpeza concluída!"
echo "=========================================="
echo ""
echo "Agora você pode executar:"
echo "  docker-compose build --no-cache"
echo "  docker-compose up -d"
echo ""

