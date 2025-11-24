#!/bin/bash

echo "🔍 DIAGNÓSTICO: Frontend não carrega"
echo "======================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando status dos containers..."
docker-compose ps
echo ""

echo "2. Verificando se o frontend está acessível internamente..."
docker-compose exec -T frontend wget -qO- http://localhost/ | head -20
echo ""

echo "3. Verificando se os assets existem no container frontend..."
docker-compose exec -T frontend ls -la /usr/share/nginx/html/assets/ 2>/dev/null | head -10
echo ""

echo "4. Verificando se o Caddy consegue acessar o frontend..."
docker-compose exec -T caddy wget -qO- http://frontend/ | head -20
echo ""

echo "5. Verificando logs do frontend..."
docker-compose logs --tail=20 frontend
echo ""

echo "6. Verificando logs do Caddy..."
docker-compose logs --tail=30 caddy | grep -E "reverse_proxy|frontend|error|warn" | tail -10
echo ""

echo "7. Testando acesso direto ao asset JS (exemplo)..."
ASSET_FILE=$(docker-compose exec -T frontend ls /usr/share/nginx/html/assets/*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null)
if [ -n "$ASSET_FILE" ]; then
    echo "   Asset encontrado: $ASSET_FILE"
    docker-compose exec -T frontend wget -qO- "http://localhost/assets/$ASSET_FILE" | head -5
else
    echo "   ⚠️  Nenhum arquivo JS encontrado em /assets/"
fi
echo ""

echo "8. Verificando configuração do nginx no frontend..."
docker-compose exec -T frontend cat /etc/nginx/conf.d/default.conf
echo ""

echo "✅ Diagnóstico completo!"
echo ""
echo "💡 Próximos passos:"
echo "   - Verifique se o frontend foi buildado corretamente"
echo "   - Verifique se os assets estão no diretório correto"
echo "   - Teste acesso direto: curl http://localhost:3000/assets/index-*.js"

