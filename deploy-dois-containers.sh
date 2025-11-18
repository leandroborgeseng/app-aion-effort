#!/bin/bash

# Script para fazer deploy com dois containers separados
# Backend na porta 4000 e Frontend na porta 3000

set -e

echo "=========================================="
echo "Deploy Aion Effort - Dois Containers"
echo "=========================================="

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "Erro: docker-compose.yml não encontrado!"
    echo "Execute este script no diretório raiz do projeto."
    exit 1
fi

# Parar containers antigos
echo ""
echo "1. Parando containers antigos..."
docker-compose down || true

# Remover containers antigos se existirem
echo ""
echo "2. Removendo containers antigos..."
docker rm -f aion-effort-app aion-effort-backend aion-effort-frontend 2>/dev/null || true

# Fazer pull das mudanças
echo ""
echo "3. Fazendo pull das mudanças do Git..."
git pull origin main || echo "Aviso: Não foi possível fazer pull do Git"

# Build dos containers
echo ""
echo "4. Fazendo build dos containers..."
echo "   - Backend (Express API)..."
docker-compose build --no-cache backend

echo "   - Frontend (Nginx)..."
docker-compose build --no-cache frontend

# Iniciar containers
echo ""
echo "5. Iniciando containers..."
docker-compose up -d

# Aguardar containers iniciarem
echo ""
echo "6. Aguardando containers iniciarem..."
sleep 5

# Verificar status
echo ""
echo "7. Status dos containers:"
docker-compose ps

# Verificar logs
echo ""
echo "8. Últimas linhas dos logs:"
echo "   Backend:"
docker-compose logs --tail=10 backend
echo ""
echo "   Frontend:"
docker-compose logs --tail=10 frontend

# Verificar saúde
echo ""
echo "9. Verificando saúde dos containers..."
echo "   Backend health:"
curl -s http://localhost:4000/health || echo "   Backend não está respondendo"
echo ""
echo "   Frontend health:"
curl -s http://localhost:3000/health || echo "   Frontend não está respondendo"

echo ""
echo "=========================================="
echo "Deploy concluído!"
echo "=========================================="
echo ""
echo "Acesse:"
echo "  - Frontend: http://SEU_IP:3000"
echo "  - Backend API: http://SEU_IP:4000"
echo ""
echo "Para ver logs em tempo real:"
echo "  docker-compose logs -f"
echo ""

