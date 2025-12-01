#!/bin/bash

# Script rápido para resolver problema de 404 no Caddy

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔧 RESOLVENDO ERRO 404 DO CADDY"
echo "================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar se Caddy pode resolver os nomes dos serviços
echo -e "${BLUE}1. Testando resolução de nomes...${NC}"

# Testar se backend responde pelo nome do serviço
BACKEND_SERVICE_TEST=$(docker exec aion-effort-caddy wget -qO- -T 3 http://backend:4000/health 2>/dev/null | grep -q '"ok":true' && echo "OK" || echo "FAILED")
BACKEND_CONTAINER_TEST=$(docker exec aion-effort-caddy wget -qO- -T 3 http://aion-effort-backend:4000/health 2>/dev/null | grep -q '"ok":true' && echo "OK" || echo "FAILED")

if [ "$BACKEND_SERVICE_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Nome 'backend' funciona${NC}"
    USE_NAME="backend"
elif [ "$BACKEND_CONTAINER_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Nome 'aion-effort-backend' funciona${NC}"
    USE_NAME="aion-effort-backend"
    UPDATE_NEEDED=true
else
    echo -e "   ${RED}❌ Nenhum nome funciona. Verificando rede...${NC}"
    UPDATE_NEEDED=false
fi

# Testar frontend
FRONTEND_SERVICE_TEST=$(docker exec aion-effort-caddy wget -qO- -T 3 http://frontend:80/ 2>/dev/null && echo "OK" || echo "FAILED")
FRONTEND_CONTAINER_TEST=$(docker exec aion-effort-caddy wget -qO- -T 3 http://aion-effort-frontend:80/ 2>/dev/null && echo "OK" || echo "FAILED")

if [ "$FRONTEND_SERVICE_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Nome 'frontend' funciona${NC}"
    USE_FRONTEND_NAME="frontend"
elif [ "$FRONTEND_CONTAINER_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Nome 'aion-effort-frontend' funciona${NC}"
    USE_FRONTEND_NAME="aion-effort-frontend"
    UPDATE_NEEDED=true
else
    echo -e "   ${YELLOW}⚠️  Frontend não responde (pode ser normal)${NC}"
    USE_FRONTEND_NAME="frontend"
fi
echo ""

# 2. Verificar Caddyfile atual
echo -e "${BLUE}2. Verificando Caddyfile...${NC}"
if grep -q "reverse_proxy backend:4000" Caddyfile; then
    echo -e "   ${GREEN}✅ Caddyfile usa 'backend:4000'${NC}"
    if [ "$BACKEND_SERVICE_TEST" != "OK" ] && [ "$BACKEND_CONTAINER_TEST" = "OK" ]; then
        UPDATE_NEEDED=true
    fi
fi
echo ""

# 3. Atualizar Caddyfile se necessário
if [ "$UPDATE_NEEDED" = "true" ]; then
    echo -e "${BLUE}3. Atualizando Caddyfile...${NC}"
    
    # Backup
    cp Caddyfile Caddyfile.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "   ${GREEN}✅ Backup criado${NC}"
    
    # Atualizar backend se necessário
    if [ "$BACKEND_SERVICE_TEST" != "OK" ] && [ "$BACKEND_CONTAINER_TEST" = "OK" ]; then
        sed -i 's/reverse_proxy backend:4000/reverse_proxy aion-effort-backend:4000/g' Caddyfile
        echo -e "   ${GREEN}✅ Atualizado para usar 'aion-effort-backend:4000'${NC}"
    fi
    
    # Atualizar frontend se necessário
    if [ "$FRONTEND_SERVICE_TEST" != "OK" ] && [ "$FRONTEND_CONTAINER_TEST" = "OK" ]; then
        sed -i 's/reverse_proxy frontend:80/reverse_proxy aion-effort-frontend:80/g' Caddyfile
        echo -e "   ${GREEN}✅ Atualizado para usar 'aion-effort-frontend:80'${NC}"
    fi
    
    # Validar Caddyfile
    if docker exec aion-effort-caddy caddy validate --config /etc/caddy/Caddyfile 2>&1 | grep -q "Valid configuration"; then
        echo -e "   ${GREEN}✅ Caddyfile válido${NC}"
    else
        echo -e "   ${RED}❌ Caddyfile inválido, restaurando backup...${NC}"
        mv Caddyfile.backup.* Caddyfile 2>/dev/null || true
        exit 1
    fi
else
    echo -e "${BLUE}3. Caddyfile não precisa ser atualizado${NC}"
fi
echo ""

# 4. Reiniciar Caddy para aplicar mudanças
if [ "$UPDATE_NEEDED" = "true" ]; then
    echo -e "${BLUE}4. Reiniciando Caddy...${NC}"
    docker-compose restart caddy
    echo -e "   ${GREEN}✅ Caddy reiniciado${NC}"
    sleep 5
else
    echo -e "${BLUE}4. Verificando se Caddy precisa ser reiniciado...${NC}"
    
    # Verificar se Caddy está healthy
    CADDY_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-caddy 2>/dev/null || echo "unknown")
    if [ "$CADDY_HEALTH" != "healthy" ]; then
        echo -e "   ${YELLOW}⚠️  Caddy não está healthy, reiniciando...${NC}"
        docker-compose restart caddy
        sleep 5
    else
        echo -e "   ${GREEN}✅ Caddy está healthy${NC}"
    fi
fi
echo ""

# 5. Teste final
echo -e "${BLUE}5. Testando acesso externo...${NC}"
sleep 5

EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/api/health 2>/dev/null || echo "000")

if [ "$EXTERNAL_TEST" = "200" ]; then
    echo -e "   ${GREEN}✅ Aplicação acessível externamente (HTTP 200)${NC}"
    
    # Mostrar resposta completa
    echo -e "   ${BLUE}Resposta do health check:${NC}"
    curl -s -k https://av.aion.eng.br/api/health | jq '.' 2>/dev/null || curl -s -k https://av.aion.eng.br/api/health
    exit 0
elif [ "$EXTERNAL_TEST" = "404" ]; then
    echo -e "   ${RED}❌ Ainda retornando 404${NC}"
    echo -e "   ${YELLOW}Verificando logs do Caddy...${NC}"
    docker logs --tail=20 aion-effort-caddy | grep -E "(error|404|backend)" | tail -5 || echo "   Nenhum erro específico"
    exit 1
elif [ "$EXTERNAL_TEST" = "502" ]; then
    echo -e "   ${YELLOW}⚠️  Retornando 502 (Bad Gateway)${NC}"
    echo -e "   ${YELLOW}O Caddy não consegue conectar ao backend${NC}"
    echo -e "   ${BLUE}Verificando logs...${NC}"
    docker logs --tail=20 aion-effort-caddy | grep -E "(error|502|dial|connection)" | tail -5 || echo "   Nenhum erro específico"
    exit 1
else
    echo -e "   ${YELLOW}⚠️  Status: HTTP $EXTERNAL_TEST${NC}"
    exit 1
fi

