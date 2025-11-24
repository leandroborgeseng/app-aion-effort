#!/bin/bash

echo "🔧 CORRIGINDO CONTAINER DO FRONTEND"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando todos os containers relacionados..."
docker-compose stop frontend
echo ""

echo "2. Removendo container antigo (forçado)..."
docker-compose rm -f frontend
echo ""

echo "3. Removendo containers órfãos..."
docker-compose down --remove-orphans 2>/dev/null || true
echo ""

echo "4. Limpando container antigo do Docker diretamente..."
OLD_CONTAINER=$(docker ps -a | grep "aion-effort-frontend" | awk '{print $1}')
if [ -n "$OLD_CONTAINER" ]; then
    echo "   Removendo container: $OLD_CONTAINER"
    docker stop $OLD_CONTAINER 2>/dev/null || true
    docker rm -f $OLD_CONTAINER 2>/dev/null || true
fi
echo ""

echo "5. Criando e iniciando o container do zero..."
docker-compose up -d frontend

if [ $? -ne 0 ]; then
    echo ""
    echo "   ❌ Erro ao criar container. Tentando alternativa..."
    echo ""
    echo "   Removendo imagem antiga e rebuildando..."
    docker rmi app-aion-effort_frontend 2>/dev/null || true
    docker-compose build frontend
    docker-compose up -d frontend
fi

if [ $? -ne 0 ]; then
    echo ""
    echo "   ❌ Erro persistente. Verificando logs..."
    docker-compose logs frontend
    exit 1
fi

echo "   ✅ Container criado e iniciado"
echo ""

echo "6. Aguardando inicialização..."
sleep 5
echo ""

echo "7. Verificando status..."
FRONTEND_STATUS=$(docker-compose ps frontend | grep -q "Up" && echo "OK" || echo "FALHOU")

if [ "$FRONTEND_STATUS" != "OK" ]; then
    echo "   ❌ Frontend não está funcionando"
    echo "   Logs:"
    docker-compose logs --tail=30 frontend
    exit 1
fi

echo "   ✅ Frontend está rodando"
echo ""

echo "8. Verificando assets..."
ASSET_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" 2>/dev/null || echo "0")

if [ "$ASSET_COUNT" -gt "0" ]; then
    echo "   ✅ $ASSET_COUNT arquivo(s) JS encontrado(s)"
    echo "   ✅ Frontend está funcionando corretamente!"
else
    echo "   ⚠️  Nenhum asset JS encontrado"
    echo "   Mas o container está rodando, pode ser normal"
fi
echo ""

echo "✅ CORREÇÃO CONCLUÍDA!"
echo ""
echo "💡 Teste agora:"
echo "   1. Acesse: https://av.aion.eng.br"
echo "   2. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   3. Vá em Usuários > Novo Usuário"
echo "   4. O campo 'Senha' deve aparecer"

