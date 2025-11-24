#!/bin/bash

echo "🔍 VERIFICAÇÃO RÁPIDA DO FRONTEND"
echo "=================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o frontend está rodando..."
if docker-compose ps | grep -q "frontend.*Up"; then
    echo "   ✅ Frontend está rodando"
else
    echo "   ❌ Frontend não está rodando!"
    exit 1
fi
echo ""

echo "2. Verificando se o HTML está sendo servido..."
HTML=$(docker-compose exec -T frontend wget -qO- http://localhost/ 2>/dev/null)
if echo "$HTML" | grep -q "Aion View"; then
    echo "   ✅ HTML está sendo servido"
else
    echo "   ❌ HTML não está sendo servido corretamente"
    echo "   Conteúdo recebido:"
    echo "$HTML" | head -5
fi
echo ""

echo "3. Verificando se os assets JS existem..."
ASSETS=$(docker-compose exec -T frontend ls /usr/share/nginx/html/assets/*.js 2>/dev/null | wc -l)
if [ "$ASSETS" -gt "0" ]; then
    echo "   ✅ Encontrados $ASSETS arquivo(s) JS"
    echo "   Arquivos encontrados:"
    docker-compose exec -T frontend ls /usr/share/nginx/html/assets/*.js 2>/dev/null | head -3
else
    echo "   ❌ Nenhum arquivo JS encontrado!"
    echo "   Listando conteúdo do diretório assets:"
    docker-compose exec -T frontend ls -la /usr/share/nginx/html/assets/ 2>/dev/null || echo "   Diretório não existe!"
fi
echo ""

echo "4. Testando acesso a um asset JS..."
FIRST_JS=$(docker-compose exec -T frontend ls /usr/share/nginx/html/assets/*.js 2>/dev/null | head -1 | xargs -n1 basename 2>/dev/null)
if [ -n "$FIRST_JS" ]; then
    echo "   Testando: /assets/$FIRST_JS"
    HTTP_CODE=$(docker-compose exec -T frontend wget --spider --server-response http://localhost/assets/$FIRST_JS 2>&1 | grep "HTTP/" | awk '{print $2}')
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Asset JS acessível (HTTP $HTTP_CODE)"
    else
        echo "   ❌ Asset JS não acessível (HTTP $HTTP_CODE)"
    fi
else
    echo "   ⚠️  Não foi possível encontrar arquivo JS para testar"
fi
echo ""

echo "5. Verificando se o Caddy consegue acessar o frontend..."
CADDY_TEST=$(docker-compose exec -T caddy wget -qO- http://frontend/ 2>/dev/null | head -1)
if [ -n "$CADDY_TEST" ]; then
    echo "   ✅ Caddy consegue acessar o frontend"
else
    echo "   ❌ Caddy não consegue acessar o frontend"
    echo "   Verificando conectividade..."
    docker-compose exec -T caddy ping -c 1 frontend 2>/dev/null && echo "   ✅ Ping funciona" || echo "   ❌ Ping falhou"
fi
echo ""

echo "✅ Verificação completa!"
echo ""
echo "💡 Se os assets não foram encontrados, pode ser necessário rebuildar o frontend:"
echo "   docker-compose build frontend"
echo "   docker-compose up -d frontend"

