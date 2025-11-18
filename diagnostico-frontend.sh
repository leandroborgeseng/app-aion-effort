#!/bin/bash

echo "=========================================="
echo "Diagnóstico do Frontend"
echo "=========================================="

echo ""
echo "1. Verificando docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    echo "✓ docker-compose.yml existe"
    echo ""
    echo "Serviços configurados:"
    grep -A 5 "services:" docker-compose.yml | head -20
else
    echo "✗ docker-compose.yml não encontrado!"
    exit 1
fi

echo ""
echo "2. Verificando Dockerfile.frontend..."
if [ -f "Dockerfile.frontend" ]; then
    echo "✓ Dockerfile.frontend existe"
else
    echo "✗ Dockerfile.frontend não encontrado!"
    exit 1
fi

echo ""
echo "3. Verificando nginx.conf..."
if [ -f "nginx.conf" ]; then
    echo "✓ nginx.conf existe"
else
    echo "✗ nginx.conf não encontrado!"
    exit 1
fi

echo ""
echo "4. Verificando status dos containers..."
docker-compose ps

echo ""
echo "5. Verificando logs do frontend..."
echo "Últimas 20 linhas:"
docker-compose logs --tail=20 frontend 2>&1 || echo "Container frontend não existe ou não está rodando"

echo ""
echo "6. Tentando build do frontend..."
docker-compose build frontend 2>&1 | tail -30

echo ""
echo "=========================================="
echo "Diagnóstico concluído"
echo "=========================================="

