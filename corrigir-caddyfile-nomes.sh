#!/bin/bash

# Script para corrigir nomes no Caddyfile se necessário

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔧 CORRIGINDO NOMES NO CADDYFILE"
echo "================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# Testar qual nome funciona
echo -e "${BLUE}1. Testando qual nome o Caddy consegue resolver...${NC}"

# Testar backend
BACKEND_SHORT=$(docker exec aion-effort-caddy wget -qO- -T 3 http://backend:4000/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "")
BACKEND_FULL=$(docker exec aion-effort-caddy wget -qO- -T 3 http://aion-effort-backend:4000/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "")

BACKEND_NAME=""
if [ "$BACKEND_SHORT" = "true" ]; then
    echo -e "   ${GREEN}✅ 'backend' funciona${NC}"
    BACKEND_NAME="backend"
elif [ "$BACKEND_FULL" = "true" ]; then
    echo -e "   ${GREEN}✅ 'aion-effort-backend' funciona${NC}"
    BACKEND_NAME="aion-effort-backend"
else
    echo -e "   ${RED}❌ Nenhum nome funciona!${NC}"
    echo -e "   Verificando redes..."
    docker network inspect app-aion-effort_aion-network | grep -A 5 "aion-effort-backend" || echo "   Container não encontrado na rede"
    exit 1
fi

# Testar frontend
FRONTEND_SHORT=$(docker exec aion-effort-caddy wget -qO- -T 3 http://frontend:80/ 2>/dev/null | head -c 10 || echo "")
FRONTEND_FULL=$(docker exec aion-effort-caddy wget -qO- -T 3 http://aion-effort-frontend:80/ 2>/dev/null | head -c 10 || echo "")

FRONTEND_NAME=""
if [ -n "$FRONTEND_SHORT" ] && [ "$FRONTEND_SHORT" != "" ]; then
    echo -e "   ${GREEN}✅ 'frontend' funciona${NC}"
    FRONTEND_NAME="frontend"
elif [ -n "$FRONTEND_FULL" ] && [ "$FRONTEND_FULL" != "" ]; then
    echo -e "   ${GREEN}✅ 'aion-effort-frontend' funciona${NC}"
    FRONTEND_NAME="aion-effort-frontend"
else
    echo -e "   ${YELLOW}⚠️  Frontend não responde (pode ser normal)${NC}"
    FRONTEND_NAME="frontend"
fi
echo ""

# Verificar Caddyfile atual
echo -e "${BLUE}2. Verificando Caddyfile atual...${NC}"
CURRENT_BACKEND=$(grep "reverse_proxy backend:4000" Caddyfile | wc -l)
CURRENT_BACKEND_FULL=$(grep "reverse_proxy aion-effort-backend:4000" Caddyfile | wc -l)

if [ "$CURRENT_BACKEND" -gt 0 ]; then
    echo -e "   Caddyfile usa: backend:4000"
    NEED_UPDATE_BACKEND=false
    if [ "$BACKEND_NAME" = "aion-effort-backend" ]; then
        NEED_UPDATE_BACKEND=true
        echo -e "   ${YELLOW}⚠️  Precisa atualizar para: aion-effort-backend:4000${NC}"
    fi
elif [ "$CURRENT_BACKEND_FULL" -gt 0 ]; then
    echo -e "   Caddyfile usa: aion-effort-backend:4000"
    NEED_UPDATE_BACKEND=false
    if [ "$BACKEND_NAME" = "backend" ]; then
        NEED_UPDATE_BACKEND=true
        echo -e "   ${YELLOW}⚠️  Precisa atualizar para: backend:4000${NC}"
    fi
else
    echo -e "   ${RED}❌ Configuração não encontrada no Caddyfile${NC}"
    exit 1
fi
echo ""

# Atualizar se necessário
if [ "$NEED_UPDATE_BACKEND" = "true" ]; then
    echo -e "${BLUE}3. Atualizando Caddyfile...${NC}"
    
    # Backup
    cp Caddyfile Caddyfile.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "   ${GREEN}✅ Backup criado${NC}"
    
    # Substituir backend
    sed -i "s/reverse_proxy backend:4000/reverse_proxy ${BACKEND_NAME}:4000/g" Caddyfile
    sed -i "s/reverse_proxy frontend:80/reverse_proxy ${FRONTEND_NAME}:80/g" Caddyfile
    
    echo -e "   ${GREEN}✅ Caddyfile atualizado${NC}"
    
    # Validar
    if docker exec aion-effort-caddy caddy validate --config /etc/caddy/Caddyfile 2>&1 | grep -q "Valid configuration"; then
        echo -e "   ${GREEN}✅ Caddyfile válido${NC}"
    else
        echo -e "   ${RED}❌ Caddyfile inválido!${NC}"
        mv Caddyfile.backup.* Caddyfile 2>/dev/null || true
        exit 1
    fi
    
    # Reiniciar Caddy
    echo -e "${BLUE}4. Reiniciando Caddy...${NC}"
    docker-compose restart caddy
    sleep 8
else
    echo -e "${BLUE}3. Caddyfile já está correto${NC}"
    echo -e "${BLUE}4. Recarregando Caddy...${NC}"
    docker exec aion-effort-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1 || docker-compose restart caddy
    sleep 5
fi
echo ""

# Teste final
echo -e "${BLUE}5. Testando acesso externo...${NC}"
sleep 3

EXTERNAL_TEST=$(curl -s -k https://av.aion.eng.br/api/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "")
EXTERNAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/api/health 2>/dev/null || echo "000")

if [ "$EXTERNAL_TEST" = "true" ]; then
    echo -e "   ${GREEN}✅ Aplicação funcionando! (HTTP 200)${NC}"
    echo -e "   ${BLUE}Resposta:${NC}"
    curl -s -k https://av.aion.eng.br/api/health | jq '.'
    exit 0
elif [ "$EXTERNAL_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✅ Aplicação respondendo (HTTP 200)${NC}"
    curl -s -k https://av.aion.eng.br/api/health
    exit 0
else
    echo -e "   ${YELLOW}⚠️  Ainda retornando HTTP $EXTERNAL_STATUS${NC}"
    
    # Verificar logs
    echo -e "   ${BLUE}Últimas linhas de erro do Caddy:${NC}"
    docker logs --tail=20 aion-effort-caddy 2>&1 | grep -E "(error|404|502|backend)" | tail -5 || echo "   Nenhum erro específico"
    
    exit 1
fi

