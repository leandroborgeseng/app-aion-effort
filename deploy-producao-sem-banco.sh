#!/bin/bash

# Script de deploy para produção SEM atualizar o banco de dados
# Este script atualiza apenas o código da aplicação, mantendo o banco de dados intacto

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy de produção (SEM atualizar banco de dados)..."
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
echo -e "${YELLOW}📥 Atualizando código do Git...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Erro ao fazer git pull${NC}"
    exit 1
}
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

# 2. Parar containers
echo -e "${YELLOW}🛑 Parando containers...${NC}"
docker-compose down || {
    echo -e "${YELLOW}⚠️  Alguns containers podem não ter sido parados corretamente${NC}"
}
echo -e "${GREEN}✅ Containers parados${NC}"
echo ""

# 3. Remover containers órfãos e recursos não utilizados
echo -e "${YELLOW}🧹 Limpando recursos Docker...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true
docker system prune -f --volumes 2>/dev/null || true
echo -e "${GREEN}✅ Limpeza concluída${NC}"
echo ""

# 4. Rebuild dos containers (sem cache para garantir atualização)
echo -e "${YELLOW}🔨 Reconstruindo containers (frontend e backend)...${NC}"
docker-compose build --no-cache backend frontend || {
    echo -e "${RED}❌ Erro ao reconstruir containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers reconstruídos${NC}"
echo ""

# 5. Iniciar containers
echo -e "${YELLOW}🚀 Iniciando containers...${NC}"
docker-compose up -d || {
    echo -e "${RED}❌ Erro ao iniciar containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers iniciados${NC}"
echo ""

# 6. Aguardar containers ficarem saudáveis
echo -e "${YELLOW}⏳ Aguardando containers ficarem prontos...${NC}"
sleep 10

# 7. Verificar status dos containers
echo -e "${YELLOW}📊 Verificando status dos containers...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📋 Resumo:"
echo "  ✅ Código atualizado do Git"
echo "  ✅ Containers reconstruídos"
echo "  ✅ Aplicação reiniciada"
echo "  ⚠️  Banco de dados NÃO foi alterado (mantido como estava)"
echo ""
echo "💡 Para verificar os logs:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
echo ""
echo "🌐 A aplicação deve estar disponível em:"
echo "  Frontend: http://seu-servidor:3000"
echo "  Backend:  http://seu-servidor:4000"

