#!/bin/bash

echo "🔧 APLICANDO CORREÇÃO FINAL NO PM.AION.ENG.BR"
echo "=============================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Atualizando código..."
git pull origin main
echo ""

echo "2. Verificando se Caddy está na rede do agilepm-web..."
AGILEPM_NETWORK=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{break}}{{end}}')
CADDY_NETWORKS=$(docker inspect aion-effort-caddy --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}')

if echo "$CADDY_NETWORKS" | grep -q "$AGILEPM_NETWORK"; then
    echo "   ✅ Caddy já está na rede $AGILEPM_NETWORK"
else
    echo "   Conectando Caddy à rede $AGILEPM_NETWORK..."
    docker network connect "$AGILEPM_NETWORK" aion-effort-caddy
    echo "   ✅ Caddy conectado"
fi
echo ""

echo "3. Verificando Caddyfile..."
if grep -q "agilepm-web:80" Caddyfile; then
    echo "   ✅ Caddyfile já está configurado corretamente"
else
    echo "   Atualizando Caddyfile..."
    sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile
    echo "   ✅ Caddyfile atualizado"
fi
echo ""

echo "4. Verificando configuração final do Caddyfile..."
grep -A 3 "pm.aion.eng.br" Caddyfile | grep "reverse_proxy"
echo ""

echo "5. Parando Caddy completamente..."
docker-compose stop caddy
sleep 2
echo ""

echo "6. Iniciando Caddy novamente (para carregar nova configuração)..."
docker-compose up -d caddy
sleep 8
echo ""

echo "7. Verificando se Caddy iniciou corretamente..."
docker-compose ps caddy
echo ""

echo "8. Testando acesso do Caddy ao agilepm-web..."
docker exec aion-effort-caddy wget -O- -T 5 http://agilepm-web:80 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar agilepm-web:80"
else
    echo "   ❌ Caddy não consegue acessar"
    echo "   Tentando descobrir IP direto do container..."
    AGILEPM_IP=$(docker inspect agilepm-web --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
    if [ -n "$AGILEPM_IP" ]; then
        echo "   IP do agilepm-web: $AGILEPM_IP"
        docker exec aion-effort-caddy wget -O- -T 5 http://$AGILEPM_IP:80 > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "   ✅ Funciona via IP. Atualizando Caddyfile..."
            sed -i "s/agilepm-web:80/$AGILEPM_IP:80/g" Caddyfile
            docker-compose restart caddy
            sleep 5
        fi
    fi
fi
echo ""

echo "9. Testando acesso HTTPS..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pm.aion.eng.br)
echo "   HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo ""
    echo "✅ SUCESSO! pm.aion.eng.br está funcionando!"
else
    echo ""
    echo "   ⚠️  Ainda retornando: HTTP $HTTP_STATUS"
    echo ""
    echo "   Últimos logs do Caddy:"
    docker-compose logs --tail=10 caddy | grep -i "pm.aion\|error\|502" | tail -5
fi
echo ""

echo "💡 Para ver logs em tempo real:"
echo "   docker-compose logs -f caddy"

