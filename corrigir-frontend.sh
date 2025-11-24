#!/bin/bash

echo "🔧 CORRIGINDO FRONTEND - REBUILD COMPLETO"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Parando containers..."
docker-compose stop frontend
echo ""

echo "2. Removendo imagem antiga do frontend..."
docker-compose rm -f frontend
docker rmi aion-effort-frontend 2>/dev/null || true
echo ""

echo "3. Fazendo rebuild completo do frontend (isso pode demorar 3-5 minutos)..."
echo "   Por favor, aguarde..."
echo ""
docker-compose build --no-cache --progress=plain frontend

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRO: Build falhou!"
    echo "Verifique os logs acima para mais detalhes."
    exit 1
fi

echo ""
echo "✅ Build concluído!"
echo ""

echo "4. Iniciando o frontend..."
docker-compose up -d frontend
echo ""

echo "5. Aguardando inicialização..."
sleep 10
echo ""

echo "6. Verificando assets..."
ASSET_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" 2>/dev/null || echo "0")

if [ "$ASSET_COUNT" -gt "0" ]; then
    echo "   ✅ SUCESSO! Encontrados $ASSET_COUNT arquivo(s) JS:"
    docker-compose exec -T frontend ls -1 /usr/share/nginx/html/assets/*.js | head -5
    echo ""
    echo "   ✅ Frontend corrigido! A página deve funcionar agora."
else
    echo "   ❌ PROBLEMA: Ainda nenhum arquivo JS encontrado!"
    echo ""
    echo "   Diagnosticando..."
    echo "   - Verificando se o diretório dist foi gerado:"
    docker-compose exec -T frontend ls -la /usr/share/nginx/html/ | head -10
    echo ""
    echo "   - Verificando se o index.html foi atualizado:"
    docker-compose exec -T frontend cat /usr/share/nginx/html/index.html | grep -o "src=\"[^\"]*\.js" | head -3
    echo ""
    echo "   ⚠️  O build pode ter falhado. Verifique os logs:"
    echo "   docker-compose logs frontend"
fi
echo ""

echo "✅ Processo concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Acesse: https://av.aion.eng.br"
echo "   2. Abra o console do navegador (F12) e verifique se há erros"
echo "   3. Se ainda não funcionar, execute: docker-compose logs frontend"

