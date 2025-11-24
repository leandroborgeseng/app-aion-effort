#!/bin/bash

echo "🧹 LIMPEZA COMPLETA E REBUILD"
echo "============================="
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

echo "2. Parando TODOS os containers..."
docker-compose down --remove-orphans
echo "   ✅ Containers parados"
echo ""

echo "3. Removendo containers órfãos e parados..."
docker-compose rm -f -v backend frontend caddy 2>/dev/null || true
docker container prune -f
echo "   ✅ Containers removidos"
echo ""

echo "4. Removendo imagens antigas..."
docker rmi app-aion-effort-backend:latest 2>/dev/null || true
docker rmi app-aion-effort-frontend:latest 2>/dev/null || true
docker rmi aion-effort-backend:latest 2>/dev/null || true
docker rmi aion-effort-frontend:latest 2>/dev/null || true
docker image prune -f
echo "   ✅ Imagens antigas removidas"
echo ""

echo "5. Atualizando código do GitHub..."
git fetch origin

# Verificar se há mudanças locais no banco
if git diff --quiet prisma/dev.db 2>/dev/null; then
    echo "   ✅ Nenhuma mudança local no banco"
else
    echo "   ⚠️  Mudanças locais detectadas no banco de dados"
    echo "   Descartando mudanças locais..."
    git checkout -- prisma/dev.db 2>/dev/null || true
    rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
    echo "   ✅ Mudanças locais descartadas"
fi

git pull origin main

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao atualizar código"
    exit 1
fi

echo "   ✅ Código atualizado"
echo ""

echo "6. Verificando mudanças no schema do Prisma..."
HAS_SCHEMA_CHANGES=$(git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "prisma/schema.prisma" && echo "sim" || echo "não")

if [ "$HAS_SCHEMA_CHANGES" = "sim" ]; then
    echo "   ⚠️  Mudanças no schema detectadas"
else
    echo "   ✅ Nenhuma mudança no schema"
fi
echo ""

echo "7. Rebuildando backend (do zero)..."
docker-compose build --no-cache backend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar backend"
    exit 1
fi
echo "   ✅ Backend rebuildado"
echo ""

echo "8. Rebuildando frontend (do zero - pode demorar alguns minutos)..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar frontend"
    exit 1
fi
echo "   ✅ Frontend rebuildado"
echo ""

echo "9. Criando e iniciando containers do zero..."
docker-compose up -d --force-recreate

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao criar containers"
    echo "   Tentando método alternativo..."
    
    # Tentar criar um por um
    docker-compose up -d backend
    sleep 3
    docker-compose up -d frontend
    sleep 3
    docker-compose up -d caddy
    
    if [ $? -ne 0 ]; then
        echo "   ❌ Erro mesmo com método alternativo"
        exit 1
    fi
fi

echo "   ✅ Containers criados e iniciados"
echo ""

echo "10. Sincronizando schema do Prisma (se necessário)..."
if [ "$HAS_SCHEMA_CHANGES" = "sim" ]; then
    echo "   Executando sincronização do banco..."
    docker-compose run --rm backend pnpm prisma:db:push
    if [ $? -ne 0 ]; then
        echo "   ⚠️  Erro ao sincronizar schema, mas continuando..."
    else
        echo "   ✅ Schema sincronizado"
    fi
fi
echo ""

echo "11. Aguardando serviços inicializarem..."
sleep 10
echo ""

echo "12. Verificando saúde dos serviços..."
BACKEND_HEALTH=$(docker-compose ps backend | grep -q "Up" && echo "OK" || echo "FALHOU")
FRONTEND_HEALTH=$(docker-compose ps frontend | grep -q "Up" && echo "OK" || echo "FALHOU")
CADDY_HEALTH=$(docker-compose ps caddy | grep -q "Up" && echo "OK" || echo "FALHOU")

echo "   Backend: $BACKEND_HEALTH"
echo "   Frontend: $FRONTEND_HEALTH"
echo "   Caddy: $CADDY_HEALTH"

if [ "$BACKEND_HEALTH" != "OK" ] || [ "$FRONTEND_HEALTH" != "OK" ]; then
    echo ""
    echo "   ⚠️  Alguns serviços não estão funcionando corretamente"
    echo ""
    echo "   Verificando logs do backend:"
    docker-compose logs --tail=20 backend | tail -10
    echo ""
    echo "   Verificando logs do frontend:"
    docker-compose logs --tail=20 frontend | tail -10
    echo ""
    echo "   📋 Para ver logs completos:"
    echo "   docker-compose logs -f backend"
    echo "   docker-compose logs -f frontend"
else
    echo "   ✅ Todos os serviços estão rodando"
fi
echo ""

echo "13. Verificando status dos containers..."
docker-compose ps
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
echo "   - Ver status: docker-compose ps"

