#!/bin/bash

# Script para remover Caddy e expor serviços diretamente

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔧 REMOVENDO CADDY E EXpondo SERVIÇOS DIRETAMENTE"
echo "=================================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Parar e remover Caddy
echo -e "${BLUE}1. Parando e removendo container Caddy...${NC}"

if docker ps -a | grep -q "aion-effort-caddy"; then
    docker-compose stop caddy 2>/dev/null || docker stop aion-effort-caddy 2>/dev/null
    docker-compose rm -f caddy 2>/dev/null || docker rm -f aion-effort-caddy 2>/dev/null
    echo -e "   ${GREEN}✅ Container Caddy removido${NC}"
else
    echo -e "   ${YELLOW}⚠️  Container Caddy não encontrado${NC}"
fi
echo ""

# 2. Atualizar docker-compose.yml
echo -e "${BLUE}2. Verificando docker-compose.yml...${NC}"

if grep -q "caddy:" docker-compose.yml; then
    echo -e "   ${YELLOW}⚠️  Caddy ainda está no docker-compose.yml${NC}"
    echo -e "   ${BLUE}Execute: git pull origin main${NC}"
else
    echo -e "   ${GREEN}✅ docker-compose.yml já está atualizado${NC}"
fi
echo ""

# 3. Verificar se backend está expondo porta
echo -e "${BLUE}3. Verificando exposição de portas...${NC}"

if grep -q '4000:4000' docker-compose.yml; then
    echo -e "   ${GREEN}✅ Backend expondo porta 4000${NC}"
else
    echo -e "   ${YELLOW}⚠️  Backend pode não estar expondo porta${NC}"
fi

if grep -q '3000:80' docker-compose.yml; then
    echo -e "   ${GREEN}✅ Frontend expondo porta 3000${NC}"
else
    echo -e "   ${YELLOW}⚠️  Frontend pode não estar expondo porta${NC}"
fi
echo ""

# 4. Reiniciar serviços
echo -e "${BLUE}4. Reiniciando serviços...${NC}"

docker-compose up -d backend frontend

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Serviços reiniciados${NC}"
else
    echo -e "   ${RED}❌ Erro ao reiniciar serviços${NC}"
    exit 1
fi
echo ""

# 5. Aguardar inicialização
echo -e "${BLUE}5. Aguardando inicialização (10 segundos)...${NC}"
sleep 10
echo ""

# 6. Testar acesso
echo -e "${BLUE}6. Testando acesso direto...${NC}"

BACKEND_TEST=$(curl -s http://localhost:4000/health 2>/dev/null | jq -r '.ok' 2>/dev/null || echo "")
if [ "$BACKEND_TEST" = "true" ]; then
    echo -e "   ${GREEN}✅ Backend acessível em http://localhost:4000${NC}"
else
    echo -e "   ${YELLOW}⚠️  Backend pode não estar respondendo${NC}"
    echo -e "   Status: $BACKEND_TEST"
fi

FRONTEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$FRONTEND_TEST" = "200" ] || [ "$FRONTEND_TEST" = "304" ]; then
    echo -e "   ${GREEN}✅ Frontend acessível em http://localhost:3000${NC}"
else
    echo -e "   ${YELLOW}⚠️  Frontend retornou HTTP $FRONTEND_TEST${NC}"
fi
echo ""

echo "=================================================="
echo -e "${BLUE}📋 RESUMO${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}✅ Caddy removido${NC}"
echo -e "${GREEN}✅ Backend exposto na porta 4000${NC}"
echo -e "${GREEN}✅ Frontend exposto na porta 3000${NC}"
echo ""
echo -e "${BLUE}💡 Próximos passos:${NC}"
echo "   1. Configurar nginx externo para fazer proxy reverso"
echo "   2. Backend: http://localhost:4000"
echo "   3. Frontend: http://localhost:3000"
echo ""
echo -e "${BLUE}📝 Testar:${NC}"
echo "   curl http://localhost:4000/health"
echo "   curl http://localhost:3000/"

