#!/bin/bash

# Script para deploy do gráfico de custo por setor no inventário

set -e

echo "🚀 DEPLOY - Gráfico de Custo por Setor no Inventário"
echo "====================================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.yml não encontrado!${NC}"
    echo "Execute este script no diretório raiz do projeto."
    exit 1
fi

# 1. Atualizar código do Git
echo -e "${YELLOW}📥 1. Atualizando código do Git...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Erro ao fazer git pull${NC}"
    exit 1
}
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

# 2. Parar containers
echo -e "${YELLOW}🛑 2. Parando containers...${NC}"
docker-compose stop frontend backend || true
echo -e "${GREEN}✅ Containers parados${NC}"
echo ""

# 2.1. Remover containers corrompidos (se houver)
echo -e "${YELLOW}🗑️  2.1. Removendo containers corrompidos...${NC}"
docker ps -a | grep frontend | awk '{print $1}' | xargs -r docker rm -f || true
docker ps -a | grep aion-effort-frontend | awk '{print $1}' | xargs -r docker rm -f || true
docker-compose rm -f frontend || true
docker-compose down --remove-orphans || true
echo -e "${GREEN}✅ Limpeza concluída${NC}"
echo ""

# 3. Rebuild do frontend (onde está o gráfico)
echo -e "${YELLOW}🔨 3. Reconstruindo frontend...${NC}"
docker-compose build --no-cache frontend || {
    echo -e "${RED}❌ Erro ao construir frontend${NC}"
    exit 1
}
echo -e "${GREEN}✅ Frontend reconstruído${NC}"
echo ""

# 4. Iniciar containers
echo -e "${YELLOW}🚀 4. Iniciando containers...${NC}"
docker-compose up -d frontend backend || {
    echo -e "${RED}❌ Erro ao iniciar containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers iniciados${NC}"
echo ""

# 5. Aguardar containers ficarem saudáveis
echo -e "${YELLOW}⏳ 5. Aguardando containers ficarem saudáveis...${NC}"
sleep 10

# Verificar status
echo -e "${YELLOW}📊 6. Verificando status dos containers...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "  1. Acesse a aplicação: http://seu-servidor:3000"
echo "  2. Navegue até a página de Inventário"
echo "  3. Verifique o novo gráfico 'Top 10 Setores por Custo de Substituição'"
echo ""
echo "🔍 Para verificar logs:"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f backend"

