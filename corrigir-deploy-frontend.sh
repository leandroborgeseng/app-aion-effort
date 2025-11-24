#!/bin/bash

# Script para corrigir erro de ContainerConfig no frontend

set -e

echo "🔧 CORRIGINDO ERRO DE CONTAINER CORROMPIDO"
echo "==========================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.yml não encontrado!${NC}"
    exit 1
fi

# 1. Parar todos os containers
echo -e "${YELLOW}🛑 1. Parando todos os containers...${NC}"
docker-compose stop frontend backend || true
echo -e "${GREEN}✅ Containers parados${NC}"
echo ""

# 2. Remover container corrompido do frontend
echo -e "${YELLOW}🗑️  2. Removendo container corrompido do frontend...${NC}"
docker ps -a | grep frontend | awk '{print $1}' | xargs -r docker rm -f || true
docker ps -a | grep aion-effort-frontend | awk '{print $1}' | xargs -r docker rm -f || true
echo -e "${GREEN}✅ Containers corrompidos removidos${NC}"
echo ""

# 3. Remover imagem do frontend (forçar rebuild)
echo -e "${YELLOW}🗑️  3. Removendo imagem do frontend...${NC}"
docker-compose rm -f frontend || true
docker rmi app-aion-effort_frontend 2>/dev/null || true
docker rmi $(docker images | grep frontend | awk '{print $3}') 2>/dev/null || true
echo -e "${GREEN}✅ Imagens antigas removidas${NC}"
echo ""

# 4. Limpar volumes órfãos (se houver)
echo -e "${YELLOW}🧹 4. Limpando recursos órfãos...${NC}"
docker-compose down --remove-orphans || true
echo -e "${GREEN}✅ Limpeza concluída${NC}"
echo ""

# 5. Rebuild do frontend
echo -e "${YELLOW}🔨 5. Reconstruindo frontend...${NC}"
docker-compose build --no-cache frontend || {
    echo -e "${RED}❌ Erro ao construir frontend${NC}"
    exit 1
}
echo -e "${GREEN}✅ Frontend reconstruído${NC}"
echo ""

# 6. Iniciar containers
echo -e "${YELLOW}🚀 6. Iniciando containers...${NC}"
docker-compose up -d frontend backend || {
    echo -e "${RED}❌ Erro ao iniciar containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers iniciados${NC}"
echo ""

# 7. Aguardar containers ficarem saudáveis
echo -e "${YELLOW}⏳ 7. Aguardando containers ficarem saudáveis...${NC}"
sleep 15

# Verificar status
echo -e "${YELLOW}📊 8. Verificando status dos containers...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Correção concluída!${NC}"
echo ""
echo "🔍 Para verificar logs:"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f backend"

