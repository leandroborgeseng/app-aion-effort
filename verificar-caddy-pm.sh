#!/bin/bash

echo "🔍 VERIFICANDO CONFIGURAÇÃO DO CADDY PARA PM.AION.ENG.BR"
echo "========================================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando se o container agilepm-web está rodando..."
if docker ps | grep -q agilepm-web; then
    echo "   ✅ Container agilepm-web está rodando"
    AGILEPM_PORT=$(docker ps --filter "name=agilepm-web" --format "{{.Ports}}" | grep -oP '0.0.0.0:\K[0-9]+(?=->80)')
    echo "   Porta exposta no host: $AGILEPM_PORT"
else
    echo "   ❌ Container agilepm-web NÃO está rodando!"
    exit 1
fi
echo ""

echo "2. Verificando se o Caddy está rodando..."
if docker ps | grep -q aion-effort-caddy; then
    echo "   ✅ Container Caddy está rodando"
else
    echo "   ❌ Container Caddy NÃO está rodando!"
    exit 1
fi
echo ""

echo "3. Testando acesso do Caddy ao host.docker.internal:8080..."
docker exec aion-effort-caddy wget -O- -T 5 http://host.docker.internal:8080 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar host.docker.internal:8080"
else
    echo "   ❌ Caddy NÃO consegue acessar host.docker.internal:8080"
    echo "   Tentando descobrir o IP do host..."
    
    # Tentar obter o IP do host
    HOST_IP=$(ip route | grep default | awk '{print $3}' | head -1)
    echo "   IP do gateway (host): $HOST_IP"
    
    echo "   Testando acesso direto ao IP do host..."
    docker exec aion-effort-caddy wget -O- -T 5 http://$HOST_IP:8080 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Caddy consegue acessar via IP do host: $HOST_IP:8080"
        echo "   Você precisará atualizar o Caddyfile para usar $HOST_IP:8080"
    else
        echo "   ❌ Caddy também não consegue acessar via IP do host"
    fi
fi
echo ""

echo "4. Verificando configuração do Caddyfile..."
if grep -q "pm.aion.eng.br" Caddyfile; then
    echo "   ✅ Configuração de pm.aion.eng.br encontrada no Caddyfile"
    echo "   Configuração atual:"
    grep -A 10 "pm.aion.eng.br" Caddyfile | head -15
else
    echo "   ❌ Configuração de pm.aion.eng.br NÃO encontrada no Caddyfile!"
fi
echo ""

echo "5. Verificando logs do Caddy para erros..."
echo "   Últimas 20 linhas dos logs:"
docker-compose logs --tail=20 caddy | grep -i "pm.aion\|error\|warn" || echo "   Nenhum erro encontrado nos logs recentes"
echo ""

echo "6. Testando acesso HTTPS ao pm.aion.eng.br..."
curl -I -k https://pm.aion.eng.br 2>&1 | head -5
echo ""

echo "✅ VERIFICAÇÃO CONCLUÍDA!"
echo ""
echo "💡 Se não funcionar, tente:"
echo "   1. Recarregar configuração do Caddy: docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo "   2. Reiniciar Caddy: docker-compose restart caddy"
echo "   3. Ver logs completos: docker-compose logs -f caddy"

