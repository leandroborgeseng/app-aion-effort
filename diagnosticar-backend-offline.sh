#!/bin/bash

echo "🔍 DIAGNÓSTICO: Backend não está subindo"
echo "========================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando status do container backend..."
docker-compose ps backend
echo ""

echo "2. Verificando logs recentes do backend (últimas 50 linhas)..."
docker-compose logs --tail=50 backend
echo ""

echo "3. Verificando erros nos logs..."
docker-compose logs backend | grep -iE "error|erro|exception|fatal|failed" | tail -20
echo ""

echo "4. Tentando iniciar o backend e ver erros em tempo real..."
echo "   (Pressione Ctrl+C após ver os erros)"
docker-compose up backend 2>&1 | head -100

