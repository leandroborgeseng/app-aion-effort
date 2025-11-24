#!/bin/bash

echo "🔨 REBUILD COMPLETO PARA PRODUÇÃO"
echo "=================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Fazendo backup do banco de dados..."
if [ -f "prisma/dev.db" ]; then
    BACKUP_FILE="prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp prisma/dev.db "$BACKUP_FILE"
    echo "   ✅ Backup criado: $BACKUP_FILE"
else
    echo "   ⚠️  Banco de dados não encontrado"
fi
echo ""

echo "2. Atualizando código do GitHub..."
git fetch origin

# Verificar se há mudanças locais no banco que podem causar conflito
if git diff --quiet prisma/dev.db 2>/dev/null; then
    echo "   ✅ Nenhuma mudança local no banco"
else
    echo "   ⚠️  Mudanças locais detectadas no banco de dados"
    echo "   Descartando mudanças locais (backup já foi feito no passo 1)..."
    git checkout -- prisma/dev.db 2>/dev/null || true
    rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
    echo "   ✅ Mudanças locais descartadas"
fi

git pull origin main

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao atualizar código"
    echo "   Tentando resolver conflitos..."
    git checkout -- prisma/dev.db 2>/dev/null || true
    rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
    git pull origin main
    
    if [ $? -ne 0 ]; then
        echo "   ❌ Ainda há erros. Execute manualmente:"
        echo "   git status"
        echo "   ./resolver-conflicto-banco.sh"
        exit 1
    fi
fi

echo "   ✅ Código atualizado"
echo ""

echo "3. Verificando mudanças no schema do Prisma..."
HAS_SCHEMA_CHANGES=$(git diff HEAD@{1} HEAD --name-only | grep -q "prisma/schema.prisma" && echo "sim" || echo "não")

if [ "$HAS_SCHEMA_CHANGES" = "sim" ]; then
    echo "   ⚠️  Mudanças no schema detectadas"
    echo "   Executando sincronização do banco..."
    docker-compose run --rm backend pnpm prisma:db:push
    if [ $? -ne 0 ]; then
        echo "   ❌ Erro ao sincronizar schema"
        exit 1
    fi
    echo "   ✅ Schema sincronizado"
else
    echo "   ✅ Nenhuma mudança no schema"
fi
echo ""

echo "4. Parando serviços antes do rebuild..."
docker-compose stop frontend backend
echo "   ✅ Serviços parados"
echo ""

echo "5. Removendo containers e imagens antigas do frontend..."
docker-compose rm -f frontend || true
docker rmi app-aion-effort-frontend:latest 2>/dev/null || true
echo "   ✅ Containers antigos removidos"
echo ""

echo "6. Rebuildando backend (com cache)..."
docker-compose build backend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar backend"
    exit 1
fi
echo "   ✅ Backend rebuildado"
echo ""

echo "7. Rebuildando frontend SEM CACHE (isso pode demorar alguns minutos)..."
echo "   Isso garante que todas as alterações sejam aplicadas..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar frontend"
    exit 1
fi
echo "   ✅ Frontend rebuildado completamente"
echo ""

echo "8. Iniciando serviços..."
docker-compose up -d backend frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao iniciar serviços"
    exit 1
fi

echo "   ✅ Serviços iniciados"
echo ""

echo "9. Aguardando serviços inicializarem..."
sleep 8
echo ""

echo "10. Verificando saúde dos serviços..."
BACKEND_HEALTH=$(docker-compose ps backend | grep -q "Up" && echo "OK" || echo "FALHOU")
FRONTEND_HEALTH=$(docker-compose ps frontend | grep -q "Up" && echo "OK" || echo "FALHOU")

echo "   Backend: $BACKEND_HEALTH"
echo "   Frontend: $FRONTEND_HEALTH"

if [ "$BACKEND_HEALTH" != "OK" ] || [ "$FRONTEND_HEALTH" != "OK" ]; then
    echo ""
    echo "   ⚠️  Alguns serviços não estão funcionando corretamente"
    echo "   Verifique os logs:"
    echo "   docker-compose logs backend"
    echo "   docker-compose logs frontend"
    echo ""
    echo "   Tentando reiniciar serviços com força..."
    docker-compose restart backend frontend
    sleep 5
    
    BACKEND_HEALTH=$(docker-compose ps backend | grep -q "Up" && echo "OK" || echo "FALHOU")
    FRONTEND_HEALTH=$(docker-compose ps frontend | grep -q "Up" && echo "OK" || echo "FALHOU")
    
    echo "   Backend (após reinício): $BACKEND_HEALTH"
    echo "   Frontend (após reinício): $FRONTEND_HEALTH"
else
    echo "   ✅ Todos os serviços estão rodando"
fi
echo ""

echo "11. Verificando logs recentes..."
echo "   Backend (últimas 10 linhas):"
docker-compose logs --tail=10 backend | tail -5
echo ""
echo "   Frontend (últimas 10 linhas):"
docker-compose logs --tail=10 frontend | tail -5
echo ""

echo "✅ REBUILD COMPLETO CONCLUÍDO!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Teste a aplicação em: https://av.aion.eng.br"
echo "   2. Verifique se o modal de solicitações de compra está funcionando"
echo "   3. Teste o filtro de OS (Abertas/Fechadas/Todas)"
echo "   4. Teste se o botão de salvar está funcionando"
echo ""
echo "📋 Se houver problemas:"
echo "   - Ver logs: docker-compose logs -f backend frontend"
echo "   - Restaurar backup: cp $BACKUP_FILE prisma/dev.db"
echo "   - Ver status dos containers: docker-compose ps"

