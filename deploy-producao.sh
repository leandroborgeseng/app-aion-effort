#!/bin/bash

echo "🚀 DEPLOY PARA PRODUÇÃO"
echo "======================"
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
git pull origin main

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao atualizar código"
    exit 1
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

echo "4. Verificando mudanças no frontend..."
HAS_FRONTEND_CHANGES=$(git diff HEAD@{1} HEAD --name-only | grep -E "src/web|src/utils" | wc -l)
HAS_DOCKERFILE_CHANGES=$(git diff HEAD@{1} HEAD --name-only | grep -E "(Dockerfile|package.json|pnpm-lock.yaml)" | wc -l)

if [ "$HAS_FRONTEND_CHANGES" -gt 0 ] || [ "$HAS_DOCKERFILE_CHANGES" -gt 0 ]; then
    if [ "$HAS_FRONTEND_CHANGES" -gt 0 ]; then
        echo "   ⚠️  Mudanças no código do frontend detectadas"
        echo "   O frontend precisa ser rebuildado"
    fi
    
    if [ "$HAS_DOCKERFILE_CHANGES" -gt 0 ]; then
        echo "   ⚠️  Mudanças em Dockerfiles ou dependências detectadas"
    fi
    
    echo "   Rebuildando backend..."
    docker-compose build backend
    
    echo "   Rebuildando frontend (isso pode demorar alguns minutos)..."
    docker-compose build frontend
    
    if [ $? -ne 0 ]; then
        echo "   ❌ Erro ao rebuildar containers"
        exit 1
    fi
    echo "   ✅ Containers rebuildados"
else
    echo "   ✅ Nenhuma mudança que exija rebuild"
fi
echo ""

echo "5. Reiniciando serviços..."
docker-compose restart backend frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao reiniciar serviços"
    exit 1
fi

echo "   ✅ Serviços reiniciados"
echo ""

echo "6. Aguardando serviços inicializarem..."
sleep 5
echo ""

echo "7. Verificando saúde dos serviços..."
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
else
    echo "   ✅ Todos os serviços estão rodando"
fi
echo ""

echo "8. Verificando logs recentes..."
echo "   Backend (últimas 5 linhas):"
docker-compose logs --tail=5 backend | grep -E "(error|Error|ERROR|listening|started)" || echo "   Nenhum log relevante"
echo ""

echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Teste a aplicação em: https://av.aion.eng.br"
echo "   2. Verifique se consegue criar um novo usuário"
echo "   3. Verifique se os nomes dos setores estão corretos"
echo ""
echo "📋 Se houver problemas:"
echo "   - Ver logs: docker-compose logs -f backend frontend"
echo "   - Restaurar backup: cp $BACKUP_FILE prisma/dev.db"
echo "   - Reverter: git reset --hard HEAD@{1} && docker-compose restart backend frontend"

