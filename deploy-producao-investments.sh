#!/bin/bash

# Script para atualizar a aplicação na produção
# Atualiza investimentos com filtros de setores da API Effort

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy para produção..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
docker-compose down || {
    echo -e "${YELLOW}⚠️  Alguns containers podem não estar rodando${NC}"
}
echo -e "${GREEN}✅ Containers parados${NC}"
echo ""

# 3. Rebuild dos containers (sem cache para garantir atualização)
echo -e "${YELLOW}🔨 3. Reconstruindo containers (isso pode levar alguns minutos)...${NC}"
docker-compose build --no-cache backend frontend || {
    echo -e "${RED}❌ Erro ao construir containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers reconstruídos${NC}"
echo ""

# 4. Subir containers
echo -e "${YELLOW}⬆️  4. Subindo containers...${NC}"
docker-compose up -d || {
    echo -e "${RED}❌ Erro ao subir containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers iniciados${NC}"
echo ""

# 5. Aguardar containers ficarem saudáveis
echo -e "${YELLOW}⏳ 5. Aguardando containers ficarem saudáveis...${NC}"
sleep 10

# Verificar status
echo -e "${YELLOW}📊 Status dos containers:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📋 Mudanças aplicadas:"
echo "  - Setores agora vêm diretamente da API Effort"
echo "  - Filtro do gráfico aplicado na tabela"
echo "  - Seção 'Setores Disponíveis' removida"
echo ""
echo "🔍 Verifique os logs com:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"

