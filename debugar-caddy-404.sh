#!/bin/bash

# Script para debugar problema de 404 no Caddy

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 DEBUGANDO ERRO 404 DO CADDY"
echo "================================"
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Testar acesso direto ao backend
echo -e "${BLUE}1. Testando acesso direto ao backend...${NC}"

# Pelo nome do serviço
BACKEND_DIRECT=$(docker exec aion-effort-caddy wget -qO- -T 3 http://backend:4000/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "FAILED")
if [ "$BACKEND_DIRECT" = "true" ]; then
    echo -e "   ${GREEN}✅ Backend acessível via 'backend:4000'${NC}"
elif [ "$BACKEND_DIRECT" = "false" ]; then
    echo -e "   ${YELLOW}⚠️  Backend responde mas retorna ok=false${NC}"
else
    echo -e "   ${RED}❌ Backend NÃO acessível via 'backend:4000'${NC}"
    
    # Tentar nome completo
    BACKEND_DIRECT_FULL=$(docker exec aion-effort-caddy wget -qO- -T 3 http://aion-effort-backend:4000/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "FAILED")
    if [ "$BACKEND_DIRECT_FULL" = "true" ]; then
        echo -e "   ${GREEN}✅ Backend acessível via 'aion-effort-backend:4000'${NC}"
        BACKEND_WORKS_WITH="aion-effort-backend"
    else
        echo -e "   ${RED}❌ Backend NÃO acessível via 'aion-effort-backend:4000'${NC}"
        BACKEND_WORKS_WITH=""
    fi
fi

# Ver resposta completa
echo -e "   ${BLUE}Resposta completa do backend:${NC}"
docker exec aion-effort-caddy wget -qO- -T 3 http://backend:4000/health 2>/dev/null || docker exec aion-effort-caddy wget -qO- -T 3 http://aion-effort-backend:4000/health 2>/dev/null
echo ""
echo ""

# 2. Verificar Caddyfile atual
echo -e "${BLUE}2. Verificando configuração do Caddyfile...${NC}"
echo -e "   ${BLUE}Configuração atual do handle /api/*:${NC}"
grep -A 5 "handle /api" Caddyfile | head -6
echo ""

# 3. Testar acesso externo passo a passo
echo -e "${BLUE}3. Testando acesso externo passo a passo...${NC}"

# Testar raiz
ROOT_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/ 2>/dev/null || echo "000")
echo -e "   Raiz (/): HTTP $ROOT_TEST"

# Testar /api/health
API_HEALTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/api/health 2>/dev/null || echo "000")
echo -e "   /api/health: HTTP $API_HEALTH_TEST"

# Testar /health (direto, sem /api)
HEALTH_DIRECT_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/health 2>/dev/null || echo "000")
echo -e "   /health: HTTP $HEALTH_DIRECT_TEST"
echo ""

# 4. Ver logs do Caddy para requisições recentes
echo -e "${BLUE}4. Verificando logs recentes do Caddy...${NC}"
echo -e "   ${BLUE}Últimas 10 linhas de access.log:${NC}"
if [ -f "logs/caddy/access.log" ]; then
    tail -10 logs/caddy/access.log | jq -r '.request.uri + " -> " + (.status|tostring)' 2>/dev/null || tail -10 logs/caddy/access.log
else
    echo -e "   ${YELLOW}⚠️  Arquivo de log não encontrado${NC}"
fi
echo ""

# 5. Testar proxy direto do Caddy
echo -e "${BLUE}5. Testando proxy do Caddy internamente...${NC}"

# Fazer uma requisição HTTP diretamente no container do Caddy
CADDY_INTERNAL_TEST=$(docker exec aion-effort-caddy wget -qO- -T 3 --header="Host: av.aion.eng.br" http://localhost/api/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "FAILED")
if [ "$CADDY_INTERNAL_TEST" = "true" ]; then
    echo -e "   ${GREEN}✅ Caddy consegue fazer proxy internamente${NC}"
else
    echo -e "   ${RED}❌ Caddy NÃO consegue fazer proxy internamente${NC}"
    echo -e "   Resposta: $CADDY_INTERNAL_TEST"
fi
echo ""

# 6. Verificar se o problema está na configuração do handle
echo -e "${BLUE}6. Verificando ordem dos handles no Caddyfile...${NC}"
HANDLE_ORDER=$(grep -n "handle" Caddyfile)
echo "$HANDLE_ORDER"
echo ""

# 7. Verificar se frontend está respondendo
echo -e "${BLUE}7. Testando acesso ao frontend...${NC}"
FRONTEND_TEST=$(docker exec aion-effort-caddy wget -qO- -T 3 http://frontend:80/ 2>/dev/null | head -20 || echo "FAILED")
if echo "$FRONTEND_TEST" | grep -q "html\|HTML"; then
    echo -e "   ${GREEN}✅ Frontend está respondendo HTML${NC}"
else
    echo -e "   ${YELLOW}⚠️  Frontend pode não estar respondendo corretamente${NC}"
    echo -e "   Primeiras 100 caracteres da resposta:"
    echo "$FRONTEND_TEST" | head -c 100
    echo ""
fi
echo ""

# 8. Análise e recomendação
echo "===================================="
echo -e "${BLUE}📋 ANÁLISE${NC}"
echo "===================================="

if [ "$API_HEALTH_TEST" = "200" ]; then
    echo -e "${GREEN}✅ /api/health está funcionando!${NC}"
    exit 0
elif [ "$API_HEALTH_TEST" = "404" ]; then
    echo -e "${RED}❌ Problema: Rota /api/* não está sendo capturada${NC}"
    echo ""
    echo -e "${YELLOW}Possíveis causas:${NC}"
    echo "   1. Handle /api/* não está funcionando corretamente"
    echo "   2. Ordem dos handles no Caddyfile está incorreta"
    echo "   3. Frontend está capturando todas as rotas e retornando 404"
    echo ""
    echo -e "${BLUE}💡 Solução sugerida:${NC}"
    echo "   Vamos verificar e corrigir a ordem dos handles no Caddyfile"
    
    # Verificar se handle /api vem antes do handle genérico
    API_HANDLE_LINE=$(grep -n "handle /api" Caddyfile | cut -d: -f1)
    GENERIC_HANDLE_LINE=$(grep -n "^    handle {" Caddyfile | head -1 | cut -d: -f1)
    
    if [ -n "$API_HANDLE_LINE" ] && [ -n "$GENERIC_HANDLE_LINE" ]; then
        if [ "$API_HANDLE_LINE" -lt "$GENERIC_HANDLE_LINE" ]; then
            echo -e "   ${GREEN}✅ Ordem dos handles está correta (API antes do genérico)${NC}"
        else
            echo -e "   ${RED}❌ Problema: Handle genérico está ANTES do handle /api/*${NC}"
            echo -e "   ${YELLOW}Isso faz com que todas as rotas sejam capturadas pelo frontend${NC}"
        fi
    fi
elif [ "$API_HEALTH_TEST" = "502" ]; then
    echo -e "${RED}❌ Problema: Bad Gateway - Caddy não consegue conectar ao backend${NC}"
    echo -e "${YELLOW}Isso indica problema de conectividade de rede${NC}"
else
    echo -e "${YELLOW}⚠️  Status HTTP $API_HEALTH_TEST - problema desconhecido${NC}"
fi

