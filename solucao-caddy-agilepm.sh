#!/bin/bash

echo "🔧 SOLUÇÃO DEFINITIVA: CADDY + AGILEPM-WEB"
echo "=========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "OPÇÃO 1: Conectar Caddy à rede do agilepm-web"
echo "----------------------------------------------"
echo ""

echo "1. Descobrindo a rede do agilepm-web..."
AGILEPM_NETWORK=$(docker inspect agilepm-web --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{break}}{{end}}' 2>/dev/null)

if [ -z "$AGILEPM_NETWORK" ] || [ "$AGILEPM_NETWORK" = "null" ]; then
    echo "   ⚠️  Não foi possível descobrir a rede. Tentando rede padrão 'bridge'..."
    AGILEPM_NETWORK="bridge"
fi

echo "   Rede encontrada: $AGILEPM_NETWORK"
echo ""

echo "2. Conectando Caddy à rede $AGILEPM_NETWORK..."
docker network connect "$AGILEPM_NETWORK" aion-effort-caddy 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy conectado à rede $AGILEPM_NETWORK"
else
    # Verificar se já está conectado
    if docker inspect aion-effort-caddy --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null | grep -q "$AGILEPM_NETWORK"; then
        echo "   ✅ Caddy já estava conectado à rede $AGILEPM_NETWORK"
    else
        echo "   ⚠️  Não foi possível conectar. Continuando com próxima opção..."
    fi
fi
echo ""

echo "3. Descobrindo nome exato do container agilepm-web..."
AGILEPM_NAME=$(docker ps --filter "name=agilepm" --filter "status=running" --format "{{.Names}}" | grep -i web | head -1)
if [ -z "$AGILEPM_NAME" ]; then
    AGILEPM_NAME="agilepm-web"
fi
echo "   Nome do container: $AGILEPM_NAME"
echo ""

echo "4. Atualizando Caddyfile para usar o nome do container..."
if grep -q "host.docker.internal:8080" Caddyfile; then
    sed -i "s/host.docker.internal:8080/${AGILEPM_NAME}:80/g" Caddyfile
    echo "   ✅ Caddyfile atualizado para usar: ${AGILEPM_NAME}:80"
elif grep -q "${AGILEPM_NAME}:80" Caddyfile; then
    echo "   ✅ Caddyfile já está configurado para usar: ${AGILEPM_NAME}:80"
else
    echo "   ⚠️  Caddyfile não tem a configuração esperada"
    echo "   Verificando configuração atual:"
    grep -A 5 "pm.aion.eng.br" Caddyfile | grep "reverse_proxy"
fi
echo ""

echo "5. Recarregando configuração do Caddy..."
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile 2>&1
sleep 3
echo ""

echo "6. Testando acesso..."
docker exec aion-effort-caddy wget -O- -T 5 http://${AGILEPM_NAME}:80 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Caddy consegue acessar ${AGILEPM_NAME}:80"
    echo ""
    echo "✅ CONFIGURAÇÃO FUNCIONANDO!"
else
    echo "   ❌ Caddy ainda não consegue acessar ${AGILEPM_NAME}:80"
    echo ""
    echo "OPÇÃO 2: Usar gateway Docker (172.17.0.1:8080)"
    echo "----------------------------------------------"
    echo ""
    echo "   Tentando usar o IP do gateway Docker..."
    GATEWAY_IP=$(docker inspect aion-effort-caddy --format='{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' 2>/dev/null | head -1)
    if [ -z "$GATEWAY_IP" ]; then
        GATEWAY_IP="172.17.0.1"
    fi
    echo "   Gateway IP: $GATEWAY_IP"
    echo ""
    
    # Testar gateway
    docker exec aion-effort-caddy wget -O- -T 5 http://${GATEWAY_IP}:8080 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Caddy consegue acessar via gateway: ${GATEWAY_IP}:8080"
        echo "   Atualizando Caddyfile..."
        sed -i "s/${AGILEPM_NAME}:80/${GATEWAY_IP}:8080/g" Caddyfile
        docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
        echo "   ✅ Caddyfile atualizado para usar gateway"
    else
        echo "   ❌ Gateway também não funcionou"
        echo ""
        echo "OPÇÃO 3: Verificar IP direto do container agilepm-web"
        echo "----------------------------------------------"
        echo ""
        AGILEPM_IP=$(docker inspect ${AGILEPM_NAME} --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
        if [ -n "$AGILEPM_IP" ]; then
            echo "   IP do agilepm-web: $AGILEPM_IP"
            docker exec aion-effort-caddy wget -O- -T 5 http://${AGILEPM_IP}:80 > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                echo "   ✅ Caddy consegue acessar via IP: ${AGILEPM_IP}:80"
                sed -i "s/.*reverse_proxy.*/${AGILEPM_IP}:80/g" Caddyfile
                # Precisa ser mais específico na substituição
                echo "   ⚠️  Atualize manualmente o Caddyfile para usar: ${AGILEPM_IP}:80"
            else
                echo "   ❌ IP direto também não funcionou"
            fi
        fi
    fi
fi

echo ""
echo "📋 Verificando configuração final..."
grep -A 5 "pm.aion.eng.br" Caddyfile | grep "reverse_proxy"
echo ""

echo "💡 Teste agora:"
echo "   curl -I https://pm.aion.eng.br"
echo ""
echo "📋 Ver logs:"
echo "   docker-compose logs -f caddy | grep -i pm.aion"

