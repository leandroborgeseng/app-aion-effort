#!/bin/bash

# Script de Deploy FORÇADO - Remove tudo e reconstrói do zero
# Use este script se o deploy normal não funcionou

set -e  # Parar em caso de erro

echo "🚀 DEPLOY FORÇADO - Removendo tudo e reconstruindo do zero"
echo "=========================================================="
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

# 1. Atualizar código FORÇADO
echo -e "${YELLOW}📥 1. Atualizando código (forçado)...${NC}"
git fetch origin
git reset --hard origin/main
git pull origin main
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

# Verificar último commit
LAST_COMMIT=$(git log -1 --oneline)
echo -e "${GREEN}📝 Último commit: $LAST_COMMIT${NC}"
echo ""

# 2. Parar e remover TUDO
echo -e "${YELLOW}🛑 2. Parando e removendo containers e volumes...${NC}"
docker-compose down --remove-orphans -v || true
echo -e "${GREEN}✅ Containers removidos${NC}"
echo ""

# 3. Remover imagens antigas
echo -e "${YELLOW}🗑️  3. Removendo imagens antigas...${NC}"
docker rmi app-aion-effort_backend app-aion-effort_frontend 2>/dev/null || echo "Imagens não encontradas (ok)"
docker system prune -f
echo -e "${GREEN}✅ Imagens antigas removidas${NC}"
echo ""

# 4. Rebuild COMPLETO SEM CACHE
echo -e "${YELLOW}🔨 4. Rebuild completo SEM CACHE (isso pode levar vários minutos)...${NC}"
echo "   Isso garante que todas as mudanças sejam aplicadas."
docker-compose build --no-cache --pull backend frontend || {
    echo -e "${RED}❌ Erro ao construir containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers reconstruídos${NC}"
echo ""

# 5. Subir containers
echo -e "${YELLOW}⬆️  5. Subindo containers...${NC}"
docker-compose up -d || {
    echo -e "${RED}❌ Erro ao subir containers${NC}"
    exit 1
}
echo -e "${GREEN}✅ Containers iniciados${NC}"
echo ""

# 6. Aguardar containers ficarem saudáveis
echo -e "${YELLOW}⏳ 6. Aguardando containers ficarem saudáveis (30 segundos)...${NC}"
sleep 30

# 7. Verificar status
echo -e "${YELLOW}📊 7. Status dos containers:${NC}"
docker-compose ps
echo ""

# 8. Verificar se o código está correto no container
echo -e "${YELLOW}🔍 8. Verificando código no container...${NC}"
if docker-compose exec -T backend grep -q "PRIMEIRO" /app/src/web/routes/InvestmentsPage.tsx 2>/dev/null; then
    echo -e "${GREEN}✅ Código atualizado no container backend${NC}"
else
    echo -e "${RED}⚠️  Código pode não estar atualizado no container${NC}"
fi

# 9. Verificar API
echo -e "${YELLOW}🌐 9. Verificando API...${NC}"
sleep 5
if curl -s http://localhost:4000/health > /dev/null; then
    echo -e "${GREEN}✅ API respondendo${NC}"
    SECTORS_COUNT=$(curl -s http://localhost:4000/api/ecm/investments/sectors/list 2>/dev/null | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo -e "${GREEN}   Setores disponíveis: $SECTORS_COUNT${NC}"
else
    echo -e "${RED}⚠️  API não está respondendo ainda${NC}"
fi
echo ""

# 10. Mostrar logs recentes
echo -e "${YELLOW}📋 10. Últimas linhas dos logs do backend:${NC}"
docker-compose logs --tail=15 backend
echo ""

echo -e "${GREEN}✅ Deploy forçado concluído!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "  1. Acesse a aplicação: http://seu-servidor:3000"
echo "  2. Limpe o cache do navegador (Ctrl+Shift+R)"
echo "  3. Verifique se os setores aparecem nos dropdowns"
echo ""
echo "🔍 Para ver logs em tempo real:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"

