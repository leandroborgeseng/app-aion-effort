#!/bin/bash

# Script para limpar tudo e reiniciar do zero com dois containers

set -e

echo "=========================================="
echo "Limpando TUDO e reiniciando do zero"
echo "=========================================="

# 1. Parar todos os containers relacionados
echo ""
echo "1. Parando todos os containers..."
docker-compose down 2>/dev/null || true

# 2. Remover containers manualmente (caso docker-compose não funcione)
echo ""
echo "2. Removendo containers manualmente..."
docker rm -f aion-effort-app 2>/dev/null || true
docker rm -f aion-effort-backend 2>/dev/null || true
docker rm -f aion-effort-frontend 2>/dev/null || true

# 3. Parar containers que estão usando as portas 3000 e 4000
echo ""
echo "3. Parando containers nas portas 3000 e 4000..."
docker ps --filter "publish=3000" --filter "publish=4000" -q | xargs -r docker stop 2>/dev/null || true
docker ps --filter "publish=3000" --filter "publish=4000" -q | xargs -r docker rm -f 2>/dev/null || true

# 4. Verificar processos usando as portas
echo ""
echo "4. Verificando processos nas portas..."
if command -v lsof &> /dev/null; then
    echo "   Porta 3000:"
    sudo lsof -i :3000 2>/dev/null || echo "   Nenhum processo na porta 3000"
    echo "   Porta 4000:"
    sudo lsof -i :4000 2>/dev/null || echo "   Nenhum processo na porta 4000"
fi

# 5. Remover imagens antigas (opcional, descomente se quiser)
# echo ""
# echo "5. Removendo imagens antigas..."
# docker rmi aion-effort-app aion-effort-backend aion-effort-frontend 2>/dev/null || true

# 6. Limpar volumes órfãos (cuidado: isso remove volumes não usados)
echo ""
echo "6. Limpando volumes órfãos..."
docker volume prune -f 2>/dev/null || true

# 7. Verificar se docker-compose.yml existe
echo ""
echo "7. Verificando arquivos necessários..."
if [ ! -f "docker-compose.yml" ]; then
    echo "✗ Erro: docker-compose.yml não encontrado!"
    exit 1
fi
echo "✓ docker-compose.yml encontrado"

if [ ! -f "Dockerfile.backend" ]; then
    echo "✗ Erro: Dockerfile.backend não encontrado!"
    exit 1
fi
echo "✓ Dockerfile.backend encontrado"

if [ ! -f "Dockerfile.frontend" ]; then
    echo "✗ Erro: Dockerfile.frontend não encontrado!"
    exit 1
fi
echo "✓ Dockerfile.frontend encontrado"

# 8. Fazer pull das mudanças
echo ""
echo "8. Fazendo pull das mudanças do Git..."
git pull origin main || echo "⚠ Aviso: Não foi possível fazer pull do Git"

# 9. Build dos containers
echo ""
echo "9. Fazendo build dos containers..."
echo "   - Backend..."
docker-compose build --no-cache backend

echo "   - Frontend..."
docker-compose build --no-cache frontend

# 10. Iniciar containers
echo ""
echo "10. Iniciando containers..."
docker-compose up -d

# 11. Aguardar containers iniciarem
echo ""
echo "11. Aguardando containers iniciarem..."
sleep 10

# 12. Verificar status
echo ""
echo "12. Status dos containers:"
docker-compose ps

# 13. Verificar logs
echo ""
echo "13. Últimas linhas dos logs:"
echo "   Backend:"
docker-compose logs --tail=10 backend 2>/dev/null || echo "   Backend não iniciou"
echo ""
echo "   Frontend:"
docker-compose logs --tail=10 frontend 2>/dev/null || echo "   Frontend não iniciou"

# 14. Testar endpoints
echo ""
echo "14. Testando endpoints..."
echo "   Backend health:"
curl -s http://localhost:4000/health || echo "   ✗ Backend não está respondendo"
echo ""
echo "   Frontend health:"
curl -s http://localhost:3000/health || echo "   ✗ Frontend não está respondendo"

echo ""
echo "=========================================="
echo "Limpeza e reinício concluídos!"
echo "=========================================="
echo ""
echo "Para ver logs em tempo real:"
echo "  docker-compose logs -f"
echo ""
echo "Para ver status:"
echo "  docker-compose ps"
echo ""

