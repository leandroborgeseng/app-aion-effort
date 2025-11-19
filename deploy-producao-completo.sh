#!/bin/bash

# Script completo e robusto para atualizar produção
# Este script faz tudo necessário para garantir que as mudanças sejam aplicadas

set -e  # Parar em caso de erro

echo "🚀 DEPLOY COMPLETO PARA PRODUÇÃO"
echo "================================="
echo ""

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erro: docker-compose.yml não encontrado. Execute este script no diretório do projeto."
    exit 1
fi

# 1. Verificar status do Git
echo "📋 1. Verificando status do Git..."
git status
echo ""

# 2. Fazer pull das mudanças
echo "📋 2. Fazendo pull das mudanças do repositório..."
if ! git pull origin main; then
    echo "❌ Erro ao fazer pull. Verifique:"
    echo "   - Conexão com a internet"
    echo "   - Permissões do repositório"
    echo "   - Se há mudanças locais não commitadas"
    exit 1
fi

# Verificar se houve mudanças
LAST_COMMIT=$(git log -1 --oneline)
echo "✅ Último commit: $LAST_COMMIT"
echo ""

# 3. Parar todos os containers
echo "📋 3. Parando todos os containers..."
docker-compose down --remove-orphans
echo ""

# 4. Limpar imagens antigas (opcional, mas ajuda a garantir atualização)
echo "📋 4. Limpando imagens antigas..."
docker-compose rm -f || true
echo ""

# 5. Rebuild completo do backend SEM cache
echo "📋 5. Fazendo rebuild COMPLETO do backend (sem cache)..."
if ! docker-compose build --no-cache --pull backend; then
    echo "❌ Erro ao fazer build do backend."
    echo "📋 Verificando logs do build..."
    docker-compose build --no-cache backend 2>&1 | tail -50
    exit 1
fi
echo "✅ Backend buildado com sucesso"
echo ""

# 6. Rebuild completo do frontend SEM cache
echo "📋 6. Fazendo rebuild COMPLETO do frontend (sem cache)..."
if ! docker-compose build --no-cache --pull frontend; then
    echo "❌ Erro ao fazer build do frontend."
    echo "📋 Verificando logs do build..."
    docker-compose build --no-cache frontend 2>&1 | tail -50
    exit 1
fi
echo "✅ Frontend buildado com sucesso"
echo ""

# 7. Subir containers
echo "📋 7. Subindo containers..."
if ! docker-compose up -d; then
    echo "❌ Erro ao subir containers."
    exit 1
fi
echo ""

# 8. Aguardar containers iniciarem
echo "📋 8. Aguardando containers iniciarem (30 segundos)..."
sleep 30
echo ""

# 9. Verificar status dos containers
echo "📋 9. Verificando status dos containers..."
docker-compose ps
echo ""

# 10. Verificar saúde dos containers
echo "📋 10. Verificando saúde dos containers..."
for i in {1..6}; do
    echo "Tentativa $i/6..."
    HEALTH_BACKEND=$(docker-compose ps backend | grep -o "healthy\|unhealthy" || echo "unknown")
    HEALTH_FRONTEND=$(docker-compose ps frontend | grep -o "healthy\|unhealthy" || echo "unknown")
    
    echo "  Backend: $HEALTH_BACKEND"
    echo "  Frontend: $HEALTH_FRONTEND"
    
    if [ "$HEALTH_BACKEND" = "healthy" ] && [ "$HEALTH_FRONTEND" = "healthy" ]; then
        echo "✅ Ambos os containers estão saudáveis!"
        break
    fi
    
    if [ $i -lt 6 ]; then
        sleep 10
    fi
done
echo ""

# 11. Verificar logs do backend
echo "📋 11. Últimas 50 linhas dos logs do backend:"
echo "--------------------------------------------"
docker-compose logs --tail=50 backend
echo ""

# 12. Verificar logs do frontend
echo "📋 12. Últimas 30 linhas dos logs do frontend:"
echo "--------------------------------------------"
docker-compose logs --tail=30 frontend
echo ""

# 13. Testar endpoints
echo "📋 13. Testando endpoints..."
echo ""

# Health check backend
echo "Testando /health do backend..."
if curl -f -s http://localhost:4000/health > /dev/null; then
    echo "✅ Backend health check OK"
else
    echo "⚠️  Backend health check falhou"
fi

# Health check frontend
echo "Testando /health do frontend..."
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo "✅ Frontend health check OK"
else
    echo "⚠️  Frontend health check falhou"
fi

# Testar API de setores
echo "Testando /api/ecm/investments/sectors/list..."
if curl -f -s http://localhost:4000/api/ecm/investments/sectors/list > /dev/null; then
    echo "✅ API de setores respondendo"
    SECTORS_COUNT=$(curl -s http://localhost:4000/api/ecm/investments/sectors/list | grep -o '"sectors"' | wc -l || echo "0")
    echo "   Setores encontrados na resposta"
else
    echo "⚠️  API de setores não respondeu"
fi

echo ""

# 14. Verificar versões das imagens
echo "📋 14. Verificando versões das imagens Docker..."
docker-compose images
echo ""

# 15. Resumo final
echo "=========================================="
echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "📋 Resumo:"
echo "  - Último commit: $LAST_COMMIT"
echo "  - Backend: $HEALTH_BACKEND"
echo "  - Frontend: $HEALTH_FRONTEND"
echo ""
echo "📋 URLs para testar:"
echo "  - Frontend: http://189.90.139.222:3000"
echo "  - Backend API: http://189.90.139.222:4000"
echo "  - Investimentos: http://189.90.139.222:3000/investimentos"
echo ""
echo "📋 O que foi atualizado:"
echo "  - Campo Setor busca da API /api/ecm/investments/sectors/list"
echo "  - Melhor tratamento de loading e erros"
echo "  - Exibição de ID junto com nome do setor"
echo ""
echo "📋 Se algo não funcionar:"
echo "  - Ver logs: docker-compose logs -f backend"
echo "  - Ver logs: docker-compose logs -f frontend"
echo "  - Ver status: docker-compose ps"
echo "  - Verificar código: git log --oneline -5"
echo ""

