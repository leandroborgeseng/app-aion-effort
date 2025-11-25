#!/bin/bash

echo "🔧 RESOLVENDO CONFLITO NO CADDYFILE"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Fazendo backup das mudanças locais no Caddyfile..."
cp Caddyfile Caddyfile.backup.local.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup criado"
echo ""

echo "2. Descartando mudanças locais no Caddyfile..."
git checkout -- Caddyfile
echo "   ✅ Mudanças locais descartadas"
echo ""

echo "3. Fazendo pull do código atualizado..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao fazer pull"
    echo "   Restaurando backup..."
    cp Caddyfile.backup.local.* Caddyfile 2>/dev/null || true
    exit 1
fi

echo "   ✅ Código atualizado"
echo ""

echo "4. Verificando configuração do Caddyfile..."
grep -A 3 "pm.aion.eng.br" Caddyfile | grep "reverse_proxy"
echo ""

echo "5. Garantindo que está usando agilepm-web:80..."
if grep -q "agilepm-web:80" Caddyfile; then
    echo "   ✅ Já está configurado corretamente"
else
    echo "   Atualizando para usar agilepm-web:80..."
    sed -i 's/host.docker.internal:8080/agilepm-web:80/g' Caddyfile
    sed -i 's/[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:8080/agilepm-web:80/g' Caddyfile
    echo "   ✅ Atualizado"
fi
echo ""

echo "6. Verificando se Caddy está na rede do agilepm-web..."
AGILEPM_NETWORK=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{break}}{{end}}' 2>/dev/null)
CADDY_NETWORKS=$(docker inspect aion-effort-caddy --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)

if echo "$CADDY_NETWORKS" | grep -q "$AGILEPM_NETWORK"; then
    echo "   ✅ Caddy já está na rede $AGILEPM_NETWORK"
else
    echo "   Conectando Caddy à rede $AGILEPM_NETWORK..."
    docker network connect "$AGILEPM_NETWORK" aion-effort-caddy 2>/dev/null || echo "   (Já estava conectado ou erro ao conectar)"
    echo "   ✅ Caddy conectado"
fi
echo ""

echo "7. Reiniciando Caddy completamente..."
docker-compose stop caddy
sleep 2
docker-compose up -d caddy
sleep 8
echo ""

echo "8. Testando acesso..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pm.aion.eng.br)
echo "   HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo ""
    echo "✅ SUCESSO! pm.aion.eng.br está funcionando!"
else
    echo ""
    echo "   ⚠️  Ainda retornando: HTTP $HTTP_STATUS"
    echo "   Verifique os logs: docker-compose logs -f caddy"
fi

echo ""
echo "✅ CONFLITO RESOLVIDO E CONFIGURAÇÃO APLICADA!"

