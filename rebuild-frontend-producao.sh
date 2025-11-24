#!/bin/bash

echo "🔨 REBUILD DO FRONTEND EM PRODUÇÃO"
echo "==================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Atualizando código do GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao atualizar código"
    exit 1
fi

echo "   ✅ Código atualizado"
echo ""

echo "2. Parando o container frontend..."
docker-compose stop frontend
echo ""

echo "3. Rebuildando o frontend (isso pode demorar alguns minutos)..."
echo "   Aguarde..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao rebuildar frontend"
    exit 1
fi

echo "   ✅ Frontend rebuildado"
echo ""

echo "4. Iniciando o container frontend..."
docker-compose up -d frontend

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao iniciar frontend"
    exit 1
fi

echo "   ✅ Frontend iniciado"
echo ""

echo "5. Aguardando frontend inicializar..."
sleep 10
echo ""

echo "6. Verificando se o frontend está funcionando..."
FRONTEND_STATUS=$(docker-compose ps frontend | grep -q "Up" && echo "OK" || echo "FALHOU")

if [ "$FRONTEND_STATUS" != "OK" ]; then
    echo "   ❌ Frontend não está funcionando"
    echo "   Verifique os logs: docker-compose logs frontend"
    exit 1
fi

echo "   ✅ Frontend está funcionando"
echo ""

echo "7. Verificando se os assets foram gerados..."
ASSET_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" 2>/dev/null || echo "0")

if [ "$ASSET_COUNT" -gt "0" ]; then
    echo "   ✅ $ASSET_COUNT arquivo(s) JS encontrado(s)"
    echo "   Assets gerados corretamente"
else
    echo "   ⚠️  Nenhum asset JS encontrado"
    echo "   Isso pode indicar um problema no build"
fi
echo ""

echo "✅ REBUILD COMPLETO!"
echo ""
echo "💡 Teste a aplicação:"
echo "   1. Acesse: https://av.aion.eng.br"
echo "   2. Vá na página de Usuários"
echo "   3. Clique em 'Novo Usuário'"
echo "   4. Verifique se o campo 'Senha' aparece no formulário"
echo ""
echo "📋 Se o campo não aparecer:"
echo "   - Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)"
echo "   - Tente em modo anônimo/privado"
echo "   - Verifique logs: docker-compose logs frontend"

