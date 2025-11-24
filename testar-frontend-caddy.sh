#!/bin/bash

echo "🔍 TESTANDO FRONTEND COM CADDY"
echo "==============================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando containers..."
docker-compose ps | grep -E "frontend|caddy"
echo ""

echo "2. Testando acesso ao frontend internamente..."
echo "   HTML:"
docker-compose exec -T frontend wget -qO- http://localhost/ | grep -o "<script[^>]*src=\"[^\"]*\"[^>]*>" | head -3
echo ""

echo "3. Listando assets no frontend..."
ASSET_FILES=$(docker-compose exec -T frontend ls /usr/share/nginx/html/assets/*.js 2>/dev/null | head -3)
if [ -n "$ASSET_FILES" ]; then
    echo "   ✅ Assets encontrados:"
    echo "$ASSET_FILES" | while read file; do
        echo "      $(basename "$file")"
    done
else
    echo "   ❌ Nenhum asset JS encontrado!"
    echo "   Listando diretório:"
    docker-compose exec -T frontend ls -la /usr/share/nginx/html/ 2>/dev/null | head -10
fi
echo ""

echo "4. Testando acesso via Caddy (simulado)..."
docker-compose exec -T caddy wget -qO- http://frontend/ 2>/dev/null | grep -o "src=\"[^\"]*\.js" | head -3
echo ""

echo "5. Verificando se o arquivo JS específico existe..."
JS_FILE=$(docker-compose exec -T frontend ls /usr/share/nginx/html/assets/index-*.js 2>/dev/null | head -1)
if [ -n "$JS_FILE" ]; then
    JS_BASENAME=$(basename "$JS_FILE")
    echo "   ✅ Arquivo encontrado: $JS_BASENAME"
    echo "   Tamanho: $(docker-compose exec -T frontend stat -c%s "$JS_FILE" 2>/dev/null) bytes"
    
    echo ""
    echo "   Testando acesso via nginx interno..."
    HTTP_CODE=$(docker-compose exec -T frontend wget --spider --server-response "http://localhost/assets/$JS_BASENAME" 2>&1 | grep "HTTP/" | awk '{print $2}')
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Asset acessível internamente (HTTP $HTTP_CODE)"
    else
        echo "   ❌ Asset NÃO acessível (HTTP $HTTP_CODE)"
    fi
else
    echo "   ❌ Arquivo index-*.js não encontrado!"
fi
echo ""

echo "6. Verificando logs recentes do frontend..."
docker-compose logs --tail=10 frontend | grep -i "error\|warn" || echo "   Nenhum erro encontrado nos logs"
echo ""

echo "✅ Teste completo!"
echo ""
echo "💡 Se os assets não foram encontrados, execute:"
echo "   docker-compose build frontend"
echo "   docker-compose up -d frontend"

