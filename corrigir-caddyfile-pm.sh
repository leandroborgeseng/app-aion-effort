#!/bin/bash

echo "🔧 CORRIGINDO CADDYFILE E FORÇANDO RELOAD"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando Caddyfile atual..."
grep -A 5 "pm.aion.eng.br" Caddyfile | head -10
echo ""

echo "2. Garantindo que o Caddyfile usa agilepm-web:80..."
# Remover qualquer referência a host.docker.internal:8080 e garantir que está usando agilepm-web:80
sed -i '/pm.aion.eng.br {/,/^}/ {
    s/reverse_proxy host\.docker\.internal:8080/reverse_proxy agilepm-web:80/g
    s/reverse_proxy [0-9.]*:8080/reverse_proxy agilepm-web:80/g
}' Caddyfile

echo "   ✅ Caddyfile corrigido"
echo ""
echo "3. Verificando configuração final..."
grep -A 10 "pm.aion.eng.br" Caddyfile | head -15
echo ""

echo "4. Validando Caddyfile..."
docker-compose exec caddy caddy validate --config /etc/caddy/Caddyfile 2>&1
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro na validação, mas continuando..."
fi
echo ""

echo "5. Parando e reiniciando o Caddy para garantir que pegue a nova configuração..."
docker-compose stop caddy
sleep 2
docker-compose up -d caddy
sleep 5
echo ""

echo "6. Verificando se o Caddy está rodando..."
docker-compose ps caddy
echo ""

echo "7. Testando acesso do Caddy ao agilepm-web..."
docker exec aion-effort-caddy wget -O- -T 5 http://agilepm-web:80 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar agilepm-web:80"
else
    echo "   ❌ Caddy ainda não consegue acessar"
    echo "   Tentando via IP direto..."
    AGILEPM_IP=$(docker inspect agilepm-web --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
    if [ -n "$AGILEPM_IP" ]; then
        docker exec aion-effort-caddy wget -O- -T 5 http://$AGILEPM_IP:80 > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "   ✅ Caddy consegue acessar via IP: $AGILEPM_IP:80"
            echo "   Atualizando Caddyfile para usar IP..."
            sed -i "/pm.aion.eng.br {/,/^}/ {
                s/reverse_proxy agilepm-web:80/reverse_proxy $AGILEPM_IP:80/g
            }" Caddyfile
            docker-compose restart caddy
            sleep 5
        fi
    fi
fi
echo ""

echo "8. Verificando logs mais recentes..."
docker-compose logs --tail=5 caddy | grep -i "pm.aion\|error\|502" || echo "   Nenhum erro recente"
echo ""

echo "9. Testando acesso HTTPS..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pm.aion.eng.br)
echo "   HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "   ✅ SUCESSO!"
else
    echo "   ⚠️  Ainda retornando: HTTP $HTTP_STATUS"
    echo ""
    echo "   Logs detalhados:"
    docker-compose logs --tail=10 caddy | grep -i "pm.aion\|502\|error"
fi
echo ""

echo "✅ PROCESSO CONCLUÍDO!"
echo ""
echo "💡 Se ainda não funcionar, verifique:"
echo "   - docker-compose logs -f caddy"
echo "   - docker exec aion-effort-caddy wget -O- http://agilepm-web:80"
echo "   - docker network inspect agilepm_agilepm-network | grep -A 5 agilepm-web"

