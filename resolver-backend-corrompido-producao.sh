#!/bin/bash

# Script para resolver problema de container backend corrompido em produção

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 RESOLVENDO BACKEND CORROMPIDO"
echo "================================="
echo ""

cd /opt/apps/app-aion-effort || exit 1

# 1. Verificar estado atual do container
echo -e "${BLUE}1. Verificando estado do container backend...${NC}"
BACKEND_CONTAINER=$(docker ps -a --filter "name=aion-effort-backend" --format "{{.ID}}" 2>/dev/null || echo "")

if [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "   ${YELLOW}⚠️  Container backend não encontrado${NC}"
else
    echo -e "   Container encontrado: $BACKEND_CONTAINER"
    BACKEND_STATUS=$(docker inspect --format='{{.State.Status}}' "$BACKEND_CONTAINER" 2>/dev/null || echo "unknown")
    echo -e "   Status: $BACKEND_STATUS"
fi
echo ""

# 2. Parar container se estiver rodando
echo -e "${BLUE}2. Parando container backend...${NC}"
docker-compose stop backend 2>/dev/null || docker stop aion-effort-backend 2>/dev/null
echo -e "   ${GREEN}✅ Container parado${NC}"
echo ""

# 3. Remover container corrompido
echo -e "${BLUE}3. Removendo container corrompido...${NC}"
if [ -n "$BACKEND_CONTAINER" ]; then
    docker rm -f "$BACKEND_CONTAINER" 2>/dev/null || true
    echo -e "   ${GREEN}✅ Container removido${NC}"
else
    echo -e "   ${YELLOW}⚠️  Nenhum container para remover${NC}"
fi
echo ""

# 4. Verificar e limpar imagem se necessário
echo -e "${BLUE}4. Verificando imagem do backend...${NC}"
BACKEND_IMAGE=$(docker images --filter "reference=app-aion-effort_backend" --format "{{.ID}}" 2>/dev/null | head -1)

if [ -n "$BACKEND_IMAGE" ]; then
    echo -e "   Imagem encontrada: $BACKEND_IMAGE"
    echo -e "   ${YELLOW}⚠️  Rebuild será necessário${NC}"
else
    echo -e "   ${YELLOW}⚠️  Imagem não encontrada, será criada no rebuild${NC}"
fi
echo ""

# 5. Verificar banco de dados
echo -e "${BLUE}5. Verificando banco de dados...${NC}"
if [ -f "prisma/dev.db" ]; then
    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
    DB_PERMS=$(stat -c "%a" prisma/dev.db 2>/dev/null || stat -f "%OLp" prisma/dev.db 2>/dev/null || echo "unknown")
    echo -e "   ${GREEN}✅ Banco de dados existe (${DB_SIZE})${NC}"
    echo -e "   Permissões: $DB_PERMS"
    
    # Corrigir permissões se necessário
    if [ "$DB_PERMS" != "644" ] && [ "$DB_PERMS" != "664" ] && [ "$DB_PERMS" != "666" ]; then
        echo -e "   ${YELLOW}⚠️  Corrigindo permissões do banco...${NC}"
        chmod 644 prisma/dev.db 2>/dev/null || chmod 666 prisma/dev.db 2>/dev/null
        echo -e "   ${GREEN}✅ Permissões corrigidas${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Banco de dados não encontrado${NC}"
    echo -e "   Será criado na primeira inicialização"
fi
echo ""

# 6. Rebuild da imagem
echo -e "${BLUE}6. Rebuildando imagem do backend...${NC}"
echo -e "   ${YELLOW}⏳ Isso pode levar alguns minutos...${NC}"

docker-compose build --no-cache backend

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Imagem rebuildada com sucesso${NC}"
else
    echo -e "   ${RED}❌ Erro ao rebuildar imagem${NC}"
    echo -e "   Tentando rebuild sem --no-cache..."
    docker-compose build backend
    
    if [ $? -ne 0 ]; then
        echo -e "   ${RED}❌ Erro crítico no build${NC}"
        exit 1
    fi
fi
echo ""

# 7. Criar e iniciar container
echo -e "${BLUE}7. Criando e iniciando container backend...${NC}"
docker-compose up -d backend

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Container criado e iniciado${NC}"
else
    echo -e "   ${RED}❌ Erro ao criar container${NC}"
    exit 1
fi
echo ""

# 8. Aguardar inicialização
echo -e "${BLUE}8. Aguardando inicialização (60 segundos)...${NC}"
sleep 10

for i in {1..10}; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-backend 2>/dev/null || echo "unknown")
    STATUS=$(docker inspect --format='{{.State.Status}}' aion-effort-backend 2>/dev/null || echo "unknown")
    
    echo -e "   Tentativa $i/10: Status=$STATUS, Health=$HEALTH"
    
    if [ "$STATUS" = "running" ] && [ "$HEALTH" = "healthy" ]; then
        echo -e "   ${GREEN}✅ Backend está healthy!${NC}"
        break
    fi
    
    if [ "$STATUS" != "running" ]; then
        echo -e "   ${RED}❌ Container não está rodando!${NC}"
        echo -e "   Verificando logs..."
        docker logs --tail=20 aion-effort-backend
        exit 1
    fi
    
    sleep 5
done
echo ""

# 9. Verificar logs
echo -e "${BLUE}9. Verificando logs recentes...${NC}"
docker logs --tail=20 aion-effort-backend | grep -E "(error|Error|ERROR|listening|started|API up)" || echo "   Nenhum log relevante"
echo ""

# 10. Testar health check
echo -e "${BLUE}10. Testando health check...${NC}"
sleep 5

HEALTH_RESPONSE=$(docker exec aion-effort-backend node -e "require('http').get('http://localhost:4000/health', (r) => {let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d))})" 2>/dev/null || echo "FAILED")

if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
    echo -e "   ${GREEN}✅ Health check OK${NC}"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "   ${YELLOW}⚠️  Health check retornou:${NC}"
    echo "$HEALTH_RESPONSE"
fi
echo ""

# 11. Verificar conectividade do Caddy
echo -e "${BLUE}11. Testando conectividade do Caddy ao Backend...${NC}"
CADDY_TEST=$(docker exec aion-effort-caddy wget -O- -T 3 http://aion-effort-backend:4000/health 2>/dev/null && echo "OK" || echo "FAILED")

if [ "$CADDY_TEST" = "OK" ]; then
    echo -e "   ${GREEN}✅ Caddy pode acessar Backend${NC}"
else
    echo -e "   ${YELLOW}⚠️  Caddy não conseguiu acessar Backend${NC}"
    echo -e "   Tentando reiniciar Caddy..."
    docker-compose restart caddy
    sleep 5
fi
echo ""

echo "================================="
echo -e "${BLUE}📋 RESUMO${NC}"
echo "================================="

FINAL_STATUS=$(docker inspect --format='{{.State.Status}}' aion-effort-backend 2>/dev/null || echo "unknown")
FINAL_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' aion-effort-backend 2>/dev/null || echo "unknown")

if [ "$FINAL_STATUS" = "running" ]; then
    echo -e "${GREEN}✅ Backend está rodando${NC}"
else
    echo -e "${RED}❌ Backend não está rodando (Status: $FINAL_STATUS)${NC}"
fi

if [ "$FINAL_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}✅ Backend está healthy${NC}"
elif [ "$FINAL_HEALTH" = "starting" ]; then
    echo -e "${YELLOW}⏳ Backend está inicializando...${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health: $FINAL_HEALTH${NC}"
fi

echo ""
echo -e "${BLUE}💡 Próximos passos:${NC}"
echo "   1. Verificar logs: docker-compose logs -f backend"
echo "   2. Executar diagnóstico: ./diagnosticar-producao.sh"
echo "   3. Testar externamente: curl -k https://av.aion.eng.br/api/health"

