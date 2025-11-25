#!/bin/bash

echo "🔧 RESOLVENDO ERRO 502 NO PM.AION.ENG.BR"
echo "========================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

echo "1. Verificando configuração atual do Caddyfile..."
grep -A 10 "pm.aion.eng.br" Caddyfile | head -15
echo ""

echo "2. Descobrindo informações do container agilepm-web..."
AGILEPM_NAME=$(docker ps --filter "name=agilepm" --filter "status=running" --format "{{.Names}}" | grep -i web | head -1)
if [ -z "$AGILEPM_NAME" ]; then
    AGILEPM_NAME="agilepm-web"
fi

echo "   Nome do container: $AGILEPM_NAME"
AGILEPM_IP=$(docker inspect $AGILEPM_NAME --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
echo "   IP do container: $AGILEPM_IP"

AGILEPM_NETWORKS=$(docker inspect $AGILEPM_NAME --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)
echo "   Redes: $AGILEPM_NETWORKS"
echo ""

echo "3. Verificando redes do Caddy..."
CADDY_NETWORKS=$(docker inspect aion-effort-caddy --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)
echo "   Redes do Caddy: $CADDY_NETWORKS"
echo ""

echo "4. Verificando se Caddy está na mesma rede do agilepm-web..."
PRIMARY_AGILEPM_NETWORK=$(echo $AGILEPM_NETWORKS | awk '{print $1}')
if echo "$CADDY_NETWORKS" | grep -q "$PRIMARY_AGILEPM_NETWORK"; then
    echo "   ✅ Caddy está na mesma rede: $PRIMARY_AGILEPM_NETWORK"
else
    echo "   ❌ Caddy NÃO está na rede $PRIMARY_AGILEPM_NETWORK"
    echo "   Conectando Caddy à rede..."
    docker network connect "$PRIMARY_AGILEPM_NETWORK" aion-effort-caddy 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Caddy conectado à rede $PRIMARY_AGILEPM_NETWORK"
        sleep 2
    else
        echo "   ⚠️  Erro ao conectar ou já estava conectado"
    fi
fi
echo ""

echo "5. Testando acesso do Caddy ao agilepm-web (múltiplas formas)..."
echo ""

# Teste 1: Nome do container
echo "   Teste 1: Nome do container ($AGILEPM_NAME:80)"
docker exec aion-effort-caddy wget -O- -T 3 http://$AGILEPM_NAME:80 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Funcionou! Usando: $AGILEPM_NAME:80"
    TARGET="$AGILEPM_NAME:80"
else
    echo "   ❌ Não funcionou"
    
    # Teste 2: IP do container
    if [ -n "$AGILEPM_IP" ]; then
        echo "   Teste 2: IP direto ($AGILEPM_IP:80)"
        docker exec aion-effort-caddy wget -O- -T 3 http://$AGILEPM_IP:80 > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "   ✅ Funcionou! Usando: $AGILEPM_IP:80"
            TARGET="$AGILEPM_IP:80"
        else
            echo "   ❌ Não funcionou"
            
            # Teste 3: Gateway Docker
            echo "   Teste 3: Gateway Docker (172.17.0.1:8080)"
            docker exec aion-effort-caddy wget -O- -T 3 http://172.17.0.1:8080 > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                echo "   ✅ Funcionou! Usando: 172.17.0.1:8080"
                TARGET="172.17.0.1:8080"
            else
                echo "   ❌ Não funcionou"
                
                # Teste 4: Descobrir gateway real
                GATEWAY=$(docker inspect aion-effort-caddy --format='{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' 2>/dev/null | head -1)
                if [ -n "$GATEWAY" ]; then
                    echo "   Teste 4: Gateway real ($GATEWAY:8080)"
                    docker exec aion-effort-caddy wget -O- -T 3 http://$GATEWAY:8080 > /dev/null 2>&1
                    if [ $? -eq 0 ]; then
                        echo "   ✅ Funcionou! Usando: $GATEWAY:8080"
                        TARGET="$GATEWAY:8080"
                    else
                        echo "   ❌ Não funcionou"
                        echo ""
                        echo "   ❌ Nenhum método funcionou. Verifique manualmente."
                        exit 1
                    fi
                fi
            fi
        fi
    fi
fi

if [ -z "$TARGET" ]; then
    echo "   ❌ Nenhum método de acesso funcionou!"
    echo "   Verificando se o agilepm-web está realmente respondendo..."
    curl -I http://localhost:8080 2>/dev/null | head -3
    exit 1
fi

echo ""
echo "6. Atualizando Caddyfile para usar: $TARGET"
# Encontrar a linha com reverse_proxy e substituir
sed -i "/pm.aion.eng.br {/,/}/ {
    s/reverse_proxy [^[:space:]]*/reverse_proxy $TARGET/
}" Caddyfile

echo "   ✅ Caddyfile atualizado"
echo ""
echo "   Verificando configuração:"
grep -A 3 "pm.aion.eng.br" Caddyfile | grep "reverse_proxy"
echo ""

echo "7. Recarregando configuração do Caddy..."
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile 2>&1
if [ $? -ne 0 ]; then
    echo "   ⚠️  Erro ao recarregar. Reiniciando Caddy..."
    docker-compose restart caddy
    sleep 5
fi
echo ""

echo "8. Aguardando Caddy reinicializar..."
sleep 5
echo ""

echo "9. Testando acesso final..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pm.aion.eng.br)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "   ✅ SUCESSO! HTTP Status: $HTTP_STATUS"
    echo ""
    echo "✅ CONFIGURAÇÃO FUNCIONANDO!"
else
    echo "   ⚠️  Ainda retornando: HTTP $HTTP_STATUS"
    echo ""
    echo "   Verificando logs do Caddy..."
    docker-compose logs --tail=10 caddy | grep -i "pm.aion\|error"
fi

echo ""
echo "💡 Teste manualmente:"
echo "   curl -I https://pm.aion.eng.br"
echo ""
echo "📋 Ver logs:"
echo "   docker-compose logs -f caddy"

