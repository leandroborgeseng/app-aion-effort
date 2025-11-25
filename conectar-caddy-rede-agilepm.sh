#!/bin/bash

echo "🔗 CONECTANDO CADDY À REDE DO AGILEPM-WEB"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Descobrindo em qual rede está o agilepm-web..."
AGILEPM_NETWORKS=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)

if [ -z "$AGILEPM_NETWORKS" ]; then
    echo "   ❌ Não foi possível descobrir as redes do agilepm-web"
    exit 1
fi

echo "   Redes do agilepm-web: $AGILEPM_NETWORKS"
echo ""

# Pegar a primeira rede (geralmente há apenas uma)
PRIMARY_NETWORK=$(echo $AGILEPM_NETWORKS | awk '{print $1}')
echo "   Rede principal: $PRIMARY_NETWORK"
echo ""

echo "2. Verificando se o Caddy já está na rede $PRIMARY_NETWORK..."
CADDY_NETWORKS=$(docker inspect aion-effort-caddy --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)

if echo "$CADDY_NETWORKS" | grep -q "$PRIMARY_NETWORK"; then
    echo "   ✅ Caddy já está conectado à rede $PRIMARY_NETWORK"
else
    echo "   ⚠️  Caddy NÃO está na rede $PRIMARY_NETWORK"
    echo "   Conectando..."
    
    docker network connect "$PRIMARY_NETWORK" aion-effort-caddy 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Caddy conectado à rede $PRIMARY_NETWORK"
    else
        echo "   ❌ Erro ao conectar Caddy à rede"
        exit 1
    fi
fi
echo ""

echo "3. Verificando nome do container agilepm-web..."
AGILEPM_NAME=$(docker ps --filter "name=agilepm" --filter "status=running" --format "{{.Names}}" | grep -i web | head -1)
if [ -z "$AGILEPM_NAME" ]; then
    AGILEPM_NAME="agilepm-web"
    echo "   Usando nome padrão: $AGILEPM_NAME"
else
    echo "   Nome encontrado: $AGILEPM_NAME"
fi
echo ""

echo "4. Verificando porta interna do agilepm-web..."
AGILEPM_INTERNAL_PORT=$(docker inspect $AGILEPM_NAME --format='{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' 2>/dev/null)
AGILEPM_CONTAINER_PORT=80

echo "   Porta interna do container: $AGILEPM_CONTAINER_PORT"
echo "   Porta exposta no host: ${AGILEPM_INTERNAL_PORT:-8080}"
echo ""

echo "5. Testando se o Caddy consegue acessar o agilepm-web..."
docker exec aion-effort-caddy ping -c 1 $AGILEPM_NAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue alcançar $AGILEPM_NAME via rede Docker"
else
    echo "   ⚠️  Ping falhou (pode ser normal se o container não responde ping)"
fi

echo "   Testando acesso HTTP..."
docker exec aion-effort-caddy wget -O- -T 5 http://$AGILEPM_NAME:$AGILEPM_CONTAINER_PORT > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar http://$AGILEPM_NAME:$AGILEPM_CONTAINER_PORT"
else
    echo "   ❌ Caddy NÃO consegue acessar http://$AGILEPM_NAME:$AGILEPM_CONTAINER_PORT"
    echo "   Tentando via IP do container..."
    
    AGILEPM_IP=$(docker inspect $AGILEPM_NAME --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
    if [ -n "$AGILEPM_IP" ]; then
        echo "   IP do container: $AGILEPM_IP"
        docker exec aion-effort-caddy wget -O- -T 5 http://$AGILEPM_IP:$AGILEPM_CONTAINER_PORT > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "   ✅ Caddy consegue acessar via IP: $AGILEPM_IP:$AGILEPM_CONTAINER_PORT"
        fi
    fi
fi
echo ""

echo "6. Atualizando Caddyfile para usar o nome do container..."
if grep -q "host.docker.internal:8080" Caddyfile; then
    echo "   Atualizando de host.docker.internal:8080 para $AGILEPM_NAME:$AGILEPM_CONTAINER_PORT"
    sed -i "s/host.docker.internal:8080/$AGILEPM_NAME:$AGILEPM_CONTAINER_PORT/g" Caddyfile
    echo "   ✅ Caddyfile atualizado"
else
    echo "   ⚠️  Caddyfile já não usa host.docker.internal:8080"
fi
echo ""

echo "7. Recarregando configuração do Caddy..."
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Configuração recarregada"
else
    echo "   ⚠️  Erro ao recarregar, tentando reiniciar..."
    docker-compose restart caddy
    sleep 5
fi
echo ""

echo "8. Verificando logs do Caddy..."
echo "   Aguardando alguns segundos..."
sleep 3
docker-compose logs --tail=10 caddy | grep -i "pm.aion\|error\|warn" || echo "   Nenhum erro encontrado"
echo ""

echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "💡 Teste agora:"
echo "   curl -I https://pm.aion.eng.br"
echo ""
echo "📋 Se ainda não funcionar:"
echo "   - Ver logs: docker-compose logs -f caddy"
echo "   - Verificar rede: docker network inspect $PRIMARY_NETWORK"
echo "   - Testar acesso: docker exec aion-effort-caddy wget -O- http://$AGILEPM_NAME:$AGILEPM_CONTAINER_PORT"

