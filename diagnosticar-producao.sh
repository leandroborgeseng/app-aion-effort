#!/bin/bash

# Script de diagnóstico completo para produção
# Verifica saúde de todos os serviços e identifica problemas

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 DIAGNÓSTICO COMPLETO DE PRODUÇÃO"
echo "===================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar containers Docker
echo -e "${BLUE}1. Verificando containers Docker...${NC}"
BACKEND_STATUS=$(docker ps --filter "name=aion-effort-backend" --format "{{.Status}}" 2>/dev/null || echo "NOT_FOUND")
FRONTEND_STATUS=$(docker ps --filter "name=aion-effort-frontend" --format "{{.Status}}" 2>/dev/null || echo "NOT_FOUND")
CADDY_STATUS=$(docker ps --filter "name=aion-effort-caddy" --format "{{.Status}}" 2>/dev/null || echo "NOT_FOUND")

if [ "$BACKEND_STATUS" != "NOT_FOUND" ] && echo "$BACKEND_STATUS" | grep -q "Up"; then
    echo -e "   ${GREEN}✅ Backend: $BACKEND_STATUS${NC}"
else
    echo -e "   ${RED}❌ Backend: $BACKEND_STATUS${NC}"
fi

if [ "$FRONTEND_STATUS" != "NOT_FOUND" ] && echo "$FRONTEND_STATUS" | grep -q "Up"; then
    echo -e "   ${GREEN}✅ Frontend: $FRONTEND_STATUS${NC}"
else
    echo -e "   ${RED}❌ Frontend: $FRONTEND_STATUS${NC}"
fi

if [ "$CADDY_STATUS" != "NOT_FOUND" ] && echo "$CADDY_STATUS" | grep -q "Up"; then
    echo -e "   ${GREEN}✅ Caddy: $CADDY_STATUS${NC}"
else
    echo -e "   ${RED}❌ Caddy: $CADDY_STATUS${NC}"
fi
echo ""

# 2. Verificar health checks
echo -e "${BLUE}2. Verificando health checks...${NC}"
BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-backend 2>/dev/null || echo "unknown")
FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-frontend 2>/dev/null || echo "unknown")
CADDY_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-caddy 2>/dev/null || echo "unknown")

if [ "$BACKEND_HEALTH" = "healthy" ]; then
    echo -e "   ${GREEN}✅ Backend: healthy${NC}"
elif [ "$BACKEND_HEALTH" = "starting" ]; then
    echo -e "   ${YELLOW}⏳ Backend: starting (aguardando inicialização)${NC}"
else
    echo -e "   ${RED}❌ Backend: $BACKEND_HEALTH${NC}"
    echo "   Logs recentes do backend:"
    docker logs --tail=10 aion-effort-backend 2>/dev/null | grep -E "(error|Error|ERROR|fatal|FATAL)" || echo "   Nenhum erro recente encontrado"
fi

if [ "$FRONTEND_HEALTH" = "healthy" ]; then
    echo -e "   ${GREEN}✅ Frontend: healthy${NC}"
elif [ "$FRONTEND_HEALTH" = "starting" ]; then
    echo -e "   ${YELLOW}⏳ Frontend: starting${NC}"
else
    echo -e "   ${RED}❌ Frontend: $FRONTEND_HEALTH${NC}"
fi

if [ "$CADDY_HEALTH" = "healthy" ]; then
    echo -e "   ${GREEN}✅ Caddy: healthy${NC}"
elif [ "$CADDY_HEALTH" = "starting" ]; then
    echo -e "   ${YELLOW}⏳ Caddy: starting${NC}"
else
    echo -e "   ${YELLOW}⚠️  Caddy: $CADDY_HEALTH${NC}"
fi
echo ""

# 3. Testar endpoints de health
echo -e "${BLUE}3. Testando endpoints de health...${NC}"

# Backend health check interno
BACKEND_HEALTH_RESPONSE=$(docker exec aion-effort-backend node -e "require('http').get('http://localhost:4000/health', (r) => {let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d))})" 2>/dev/null || echo "FAILED")

if [ "$BACKEND_HEALTH_RESPONSE" != "FAILED" ] && echo "$BACKEND_HEALTH_RESPONSE" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✅ Backend health endpoint: OK${NC}"
    echo "$BACKEND_HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$BACKEND_HEALTH_RESPONSE"
else
    echo -e "   ${RED}❌ Backend health endpoint: FALHOU${NC}"
    echo "   Resposta: $BACKEND_HEALTH_RESPONSE"
fi

# Frontend health check
FRONTEND_HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$FRONTEND_HEALTH_RESPONSE" = "200" ]; then
    echo -e "   ${GREEN}✅ Frontend health endpoint: OK (HTTP $FRONTEND_HEALTH_RESPONSE)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Frontend health endpoint: HTTP $FRONTEND_HEALTH_RESPONSE${NC}"
fi
echo ""

# 4. Verificar banco de dados
echo -e "${BLUE}4. Verificando banco de dados...${NC}"
if [ -f "prisma/dev.db" ]; then
    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
    DB_PERMISSIONS=$(ls -l prisma/dev.db | awk '{print $1, $3, $4}')
    echo -e "   ${GREEN}✅ Banco de dados existe${NC}"
    echo "   Tamanho: $DB_SIZE"
    echo "   Permissões: $DB_PERMISSIONS"
    
    # Verificar se o banco está acessível
    DB_TEST=$(docker exec aion-effort-backend node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$queryRaw\`SELECT 1\`.then(()=>console.log('OK')).catch(e=>console.log('ERROR:',e.message)).finally(()=>p.\$disconnect())" 2>/dev/null || echo "FAILED")
    
    if echo "$DB_TEST" | grep -q "OK"; then
        echo -e "   ${GREEN}✅ Banco de dados acessível${NC}"
    else
        echo -e "   ${RED}❌ Banco de dados não acessível${NC}"
        echo "   Teste: $DB_TEST"
    fi
else
    echo -e "   ${RED}❌ Banco de dados não encontrado${NC}"
fi
echo ""

# 5. Verificar conectividade de rede
echo -e "${BLUE}5. Verificando conectividade de rede...${NC}"

# Verificar se backend pode acessar frontend
BACKEND_NETWORK_TEST=$(docker exec aion-effort-backend ping -c 1 aion-effort-frontend 2>/dev/null && echo "OK" || echo "FAILED")
if [ "$BACKEND_NETWORK_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Backend pode acessar Frontend${NC}"
else
    echo -e "   ${RED}❌ Backend não pode acessar Frontend${NC}"
fi

# Verificar se Caddy pode acessar backend
CADDY_NETWORK_TEST=$(docker exec aion-effort-caddy wget -O- -T 2 http://aion-effort-backend:4000/health 2>/dev/null && echo "OK" || echo "FAILED")
if [ "$CADDY_NETWORK_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy pode acessar Backend${NC}"
else
    echo -e "   ${RED}❌ Caddy não pode acessar Backend${NC}"
fi
echo ""

# 6. Verificar logs de erros recentes
echo -e "${BLUE}6. Verificando erros recentes nos logs...${NC}"

BACKEND_ERRORS=$(docker logs --tail=50 aion-effort-backend 2>/dev/null | grep -iE "(error|erro|fatal|exception|failed)" | tail -5)
if [ -n "$BACKEND_ERRORS" ]; then
    echo -e "   ${YELLOW}⚠️  Erros recentes no backend:${NC}"
    echo "$BACKEND_ERRORS" | sed 's/^/   /'
else
    echo -e "   ${GREEN}✅ Nenhum erro recente no backend${NC}"
fi

CADDY_ERRORS=$(docker logs --tail=50 aion-effort-caddy 2>/dev/null | grep -iE "(error|erro|fatal|502|503|504)" | tail -5)
if [ -n "$CADDY_ERRORS" ]; then
    echo -e "   ${YELLOW}⚠️  Erros recentes no Caddy:${NC}"
    echo "$CADDY_ERRORS" | sed 's/^/   /'
else
    echo -e "   ${GREEN}✅ Nenhum erro recente no Caddy${NC}"
fi
echo ""

# 7. Verificar variáveis de ambiente críticas
echo -e "${BLUE}7. Verificando variáveis de ambiente críticas...${NC}"

ENV_CHECK=$(docker exec aion-effort-backend env 2>/dev/null | grep -E "(NODE_ENV|USE_MOCK|DATABASE_URL|JWT_SECRET|EFFORT_BASE_URL)" || echo "FAILED")

if [ "$ENV_CHECK" != "FAILED" ]; then
    echo "$ENV_CHECK" | while IFS= read -r line; do
        if echo "$line" | grep -q "JWT_SECRET"; then
            KEY=$(echo "$line" | cut -d'=' -f1)
            VALUE_LENGTH=$(echo "$line" | cut -d'=' -f2 | wc -c)
            echo "   $KEY=*** (${VALUE_LENGTH} caracteres)"
        elif echo "$line" | grep -q "EFFORT_API_KEY\|API_PBI"; then
            KEY=$(echo "$line" | cut -d'=' -f1)
            VALUE_LENGTH=$(echo "$line" | cut -d'=' -f2 | wc -c)
            echo "   $KEY=*** (${VALUE_LENGTH} caracteres)"
        else
            echo "   $line"
        fi
    done
else
    echo -e "   ${YELLOW}⚠️  Não foi possível verificar variáveis de ambiente${NC}"
fi
echo ""

# 8. Teste externo (se possível)
echo -e "${BLUE}8. Teste externo da aplicação...${NC}"
EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://av.aion.eng.br/api/health 2>/dev/null || echo "000")
if [ "$EXTERNAL_TEST" = "200" ]; then
    echo -e "   ${GREEN}✅ Aplicação acessível externamente (HTTP $EXTERNAL_TEST)${NC}"
elif [ "$EXTERNAL_TEST" = "503" ]; then
    echo -e "   ${YELLOW}⚠️  Aplicação retornando 503 (serviço indisponível)${NC}"
elif [ "$EXTERNAL_TEST" = "502" ]; then
    echo -e "   ${RED}❌ Gateway retornando 502 (bad gateway)${NC}"
    echo "   Provável problema de conectividade entre Caddy e Backend"
else
    echo -e "   ${YELLOW}⚠️  Status externo: HTTP $EXTERNAL_TEST${NC}"
fi
echo ""

# Resumo final
echo "===================================="
echo -e "${BLUE}📋 RESUMO${NC}"
echo "===================================="

ALL_OK=true

if [ "$BACKEND_HEALTH" != "healthy" ]; then
    ALL_OK=false
    echo -e "${RED}❌ Backend não está healthy${NC}"
fi

if [ "$FRONTEND_HEALTH" != "healthy" ]; then
    ALL_OK=false
    echo -e "${RED}❌ Frontend não está healthy${NC}"
fi

if [ "$EXTERNAL_TEST" != "200" ] && [ "$EXTERNAL_TEST" != "000" ]; then
    ALL_OK=false
    echo -e "${RED}❌ Aplicação não está acessível externamente${NC}"
fi

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✅ Todos os serviços estão funcionando corretamente!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Alguns problemas foram detectados. Verifique os detalhes acima.${NC}"
    exit 1
fi

