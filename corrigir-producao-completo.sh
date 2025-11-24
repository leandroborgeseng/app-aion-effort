#!/bin/bash

echo "🚀 CORREÇÃO COMPLETA EM PRODUÇÃO"
echo "================================="
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

echo "3. Verificando último commit..."
LATEST_COMMIT=$(git log -1 --oneline)
echo "   Último commit: $LATEST_COMMIT"
echo ""

echo "4. Rebuildando e reiniciando backend..."
docker-compose stop backend
docker-compose build backend
docker-compose up -d backend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar/restartar backend"
    exit 1
fi

echo "   ✅ Backend rebuildado e reiniciado"
echo ""

echo "5. Aguardando backend inicializar..."
sleep 10
echo ""

echo "6. Verificando se backend está funcionando..."
BACKEND_STATUS=$(docker-compose ps backend | grep -q "Up" && echo "OK" || echo "FALHOU")

if [ "$BACKEND_STATUS" != "OK" ]; then
    echo "   ❌ Backend não está funcionando"
    echo "   Logs:"
    docker-compose logs --tail=30 backend
    exit 1
fi

echo "   ✅ Backend está funcionando"
echo ""

echo "7. Testando endpoint de usuários..."
sleep 3
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:4000/api/users 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    USER_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l || echo "0")
    echo "   ✅ Endpoint respondeu (HTTP $HTTP_CODE)"
    echo "   Usuários encontrados: $USER_COUNT"
else
    echo "   ⚠️  Endpoint retornou HTTP $HTTP_CODE"
    echo "   Verifique os logs: docker-compose logs backend"
fi
echo ""

echo "8. Corrigindo frontend..."
echo "   Parando frontend..."
docker-compose stop frontend
docker-compose rm -f frontend

echo "   Removendo container antigo..."
OLD_CONTAINER=$(docker ps -a | grep "aion-effort-frontend" | awk '{print $1}')
if [ -n "$OLD_CONTAINER" ]; then
    docker stop $OLD_CONTAINER 2>/dev/null || true
    docker rm -f $OLD_CONTAINER 2>/dev/null || true
fi

echo "   Rebuildando frontend (isso pode demorar alguns minutos)..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar frontend"
    exit 1
fi

echo "   ✅ Frontend rebuildado"
echo ""

echo "9. Iniciando frontend..."
docker-compose up -d frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao iniciar frontend"
    echo "   Tentando criar container manualmente..."
    docker-compose up -d --force-recreate frontend
fi

echo "   Aguardando frontend inicializar..."
sleep 10

FRONTEND_STATUS=$(docker-compose ps frontend | grep -q "Up" && echo "OK" || echo "FALHOU")
if [ "$FRONTEND_STATUS" != "OK" ]; then
    echo "   ⚠️  Frontend pode não estar funcionando corretamente"
    echo "   Verifique: docker-compose logs frontend"
else
    echo "   ✅ Frontend está funcionando"
fi
echo ""

echo "10. Verificando assets do frontend..."
ASSET_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" 2>/dev/null || echo "0")
if [ "$ASSET_COUNT" -gt "0" ]; then
    echo "   ✅ $ASSET_COUNT arquivo(s) JS encontrado(s)"
else
    echo "   ⚠️  Nenhum asset JS encontrado"
fi
echo ""

echo "✅ CORREÇÃO COMPLETA CONCLUÍDA!"
echo ""
echo "📋 Status final:"
echo "   Backend: $BACKEND_STATUS"
echo "   Frontend: $FRONTEND_STATUS"
echo "   Assets JS: $ASSET_COUNT arquivo(s)"
echo ""
echo "💡 Próximos passos:"
echo "   1. Acesse: https://av.aion.eng.br"
echo "   2. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   3. Vá em Usuários e verifique se:"
echo "      - Os usuários aparecem"
echo "      - O campo 'Senha' aparece ao criar novo usuário"
echo ""
echo "📋 Se ainda houver problemas:"
echo "   - Backend: docker-compose logs -f backend"
echo "   - Frontend: docker-compose logs -f frontend"
echo "   - Diagnóstico usuários: ./diagnosticar-usuarios.sh"

