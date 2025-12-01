#!/bin/bash

# Script para diagnosticar erro 503 nas ordens de serviço

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 DIAGNOSTICANDO ERRO 503 - ORDENS DE SERVIÇO"
echo "=============================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar se backend está rodando
echo -e "${BLUE}1. Verificando status do backend...${NC}"
BACKEND_STATUS=$(docker ps --filter "name=aion-effort-backend" --format "{{.Status}}" 2>/dev/null || echo "NOT_FOUND")
if echo "$BACKEND_STATUS" | grep -q "Up"; then
    echo -e "   ${GREEN}✅ Backend está rodando${NC}"
else
    echo -e "   ${RED}❌ Backend não está rodando${NC}"
    exit 1
fi
echo ""

# 2. Testar health check
echo -e "${BLUE}2. Testando health check...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:5000/health 2>/dev/null || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✅ Health check OK${NC}"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "   ${RED}❌ Health check falhou${NC}"
    echo "   Resposta: $HEALTH_RESPONSE"
fi
echo ""

# 3. Testar endpoint de OS diretamente
echo -e "${BLUE}3. Testando endpoint de OS...${NC}"
OS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:5000/api/ecm/os/equipamentos-com-os-abertas 2>/dev/null || echo "FAILED")
HTTP_STATUS=$(echo "$OS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$OS_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✅ Endpoint retornou HTTP 200${NC}"
    echo "$RESPONSE_BODY" | jq '.totalEquipamentos, .totalOSAbertas' 2>/dev/null || echo "   (Resposta não é JSON válido)"
elif [ "$HTTP_STATUS" = "503" ]; then
    echo -e "   ${RED}❌ Endpoint retornou HTTP 503${NC}"
    echo -e "   ${YELLOW}Resposta:${NC}"
    echo "$RESPONSE_BODY" | head -20
else
    echo -e "   ${YELLOW}⚠️  Endpoint retornou HTTP ${HTTP_STATUS}${NC}"
    echo "$RESPONSE_BODY" | head -20
fi
echo ""

# 4. Verificar logs recentes do backend
echo -e "${BLUE}4. Verificando logs recentes do backend...${NC}"
echo -e "   ${BLUE}Últimas 30 linhas relacionadas a OS:${NC}"
docker logs --tail=100 aion-effort-backend 2>/dev/null | grep -iE "(os|503|error|erro|unavailable|timeout)" | tail -20 || echo "   Nenhum log relevante encontrado"
echo ""

# 5. Verificar se API Effort está acessível
echo -e "${BLUE}5. Verificando conectividade com API Effort...${NC}"
EFFORT_BASE_URL=$(docker exec aion-effort-backend env | grep EFFORT_BASE_URL | cut -d= -f2)
if [ -n "$EFFORT_BASE_URL" ]; then
    echo -e "   Base URL: $EFFORT_BASE_URL"
    
    # Testar conectividade básica
    EFFORT_TEST=$(docker exec aion-effort-backend wget -O- -T 5 "$EFFORT_BASE_URL" 2>&1 | head -5 || echo "FAILED")
    if echo "$EFFORT_TEST" | grep -qE "(200|301|302|connected)"; then
        echo -e "   ${GREEN}✅ API Effort parece estar acessível${NC}"
    else
        echo -e "   ${RED}❌ API Effort pode estar indisponível${NC}"
        echo "$EFFORT_TEST" | head -3
    fi
else
    echo -e "   ${YELLOW}⚠️  EFFORT_BASE_URL não encontrada nas variáveis de ambiente${NC}"
fi
echo ""

# 6. Verificar variáveis de ambiente críticas
echo -e "${BLUE}6. Verificando variáveis de ambiente...${NC}"
docker exec aion-effort-backend env 2>/dev/null | grep -E "(USE_MOCK|EFFORT_BASE_URL|DATABASE_URL)" | while IFS= read -r line; do
    if echo "$line" | grep -q "EFFORT_API_KEY\|API_PBI"; then
        KEY=$(echo "$line" | cut -d= -f1)
        VALUE_LENGTH=$(echo "$line" | cut -d= -f2 | wc -c)
        echo "   $KEY=*** (${VALUE_LENGTH} caracteres)"
    else
        echo "   $line"
    fi
done
echo ""

# 7. Testar banco de dados
echo -e "${BLUE}7. Verificando banco de dados...${NC}"
DB_TEST=$(docker exec aion-effort-backend node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$queryRaw\`SELECT 1\`.then(()=>console.log('OK')).catch(e=>console.log('ERROR:',e.message)).finally(()=>p.\$disconnect())" 2>/dev/null || echo "FAILED")
if echo "$DB_TEST" | grep -q "OK"; then
    echo -e "   ${GREEN}✅ Banco de dados acessível${NC}"
else
    echo -e "   ${RED}❌ Banco de dados não acessível${NC}"
    echo "   Erro: $DB_TEST"
fi
echo ""

echo "=============================================="
echo -e "${BLUE}📋 RESUMO${NC}"
echo "=============================================="

if [ "$HTTP_STATUS" = "503" ]; then
    echo -e "${RED}❌ Problema confirmado: Endpoint retornando 503${NC}"
    echo ""
    echo -e "${YELLOW}Possíveis causas:${NC}"
    echo "   1. API Effort está indisponível ou lenta"
    echo "   2. Timeout na requisição para API Effort"
    echo "   3. Erro interno no backend ao processar OS"
    echo "   4. Banco de dados com problemas"
    echo ""
    echo -e "${BLUE}💡 Próximos passos:${NC}"
    echo "   1. Verificar logs completos: docker logs -f aion-effort-backend"
    echo "   2. Verificar se API Effort está acessível: curl -I $EFFORT_BASE_URL"
    echo "   3. Tentar requisição direta: curl http://localhost:5000/api/ecm/os/"
    exit 1
elif [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint está funcionando corretamente${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Status HTTP: ${HTTP_STATUS}${NC}"
    exit 1
fi

