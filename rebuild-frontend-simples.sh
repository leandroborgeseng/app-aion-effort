#!/bin/bash

echo "🔧 REBUILD SIMPLES DO FRONTEND"
echo "==============================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Fazendo rebuild do frontend..."
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRO: Build falhou!"
    exit 1
fi

echo ""
echo "2. Reiniciando o frontend..."
docker-compose up -d frontend

echo ""
echo "3. Aguardando 10 segundos..."
sleep 10

echo ""
echo "4. Verificando assets..."
ASSET_COUNT=$(docker-compose exec -T frontend sh -c "ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l" 2>/dev/null || echo "0")

if [ "$ASSET_COUNT" -gt "0" ]; then
    echo "   ✅ SUCESSO! $ASSET_COUNT arquivo(s) JS encontrado(s)"
    docker-compose exec -T frontend ls -1 /usr/share/nginx/html/assets/*.js | head -3
else
    echo "   ❌ Ainda nenhum arquivo JS encontrado"
    echo ""
    echo "   Verificando diretório:"
    docker-compose exec -T frontend ls -la /usr/share/nginx/html/assets/ 2>/dev/null || echo "   Diretório não existe"
fi

echo ""
echo "✅ Processo concluído!"

