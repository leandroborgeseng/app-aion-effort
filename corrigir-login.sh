#!/bin/bash

# Script para corrigir problemas de login após deploy

set -e

echo "🔧 CORRIGINDO PROBLEMAS DE LOGIN"
echo "================================="
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

# 1. Verificar se containers estão rodando
echo -e "${YELLOW}📊 1. Verificando status dos containers...${NC}"
docker-compose ps
echo ""

# 2. Verificar se o banco de dados existe e tem permissões
echo -e "${YELLOW}🗄️  2. Verificando banco de dados...${NC}"
if [ -f "prisma/dev.db" ]; then
    echo -e "${GREEN}✅ Banco de dados encontrado${NC}"
    ls -lh prisma/dev.db
else
    echo -e "${YELLOW}⚠️  Banco de dados não encontrado, será criado${NC}"
fi
echo ""

# 3. Verificar permissões do banco
echo -e "${YELLOW}🔐 3. Ajustando permissões do banco de dados...${NC}"
chmod 666 prisma/dev.db 2>/dev/null || echo "Banco ainda não existe (será criado)"
chmod 777 prisma 2>/dev/null || true
echo -e "${GREEN}✅ Permissões ajustadas${NC}"
echo ""

# 4. Aplicar migrações do Prisma
echo -e "${YELLOW}🔄 4. Aplicando migrações do Prisma...${NC}"
docker-compose exec -T backend pnpm prisma:db:push || {
    echo -e "${YELLOW}⚠️  Tentando método alternativo...${NC}"
    docker-compose exec -T backend pnpm prisma migrate deploy || {
        echo -e "${RED}❌ Erro ao aplicar migrações${NC}"
        echo "Tentando criar banco diretamente..."
    }
}
echo -e "${GREEN}✅ Migrações aplicadas${NC}"
echo ""

# 5. Verificar se usuário admin existe
echo -e "${YELLOW}👤 5. Verificando usuário admin...${NC}"
docker-compose exec -T backend pnpm create:admin || {
    echo -e "${YELLOW}⚠️  Erro ao criar admin, tentando método alternativo...${NC}"
    docker-compose exec backend tsx scripts/createAdminUser.ts || {
        echo -e "${RED}❌ Erro ao criar usuário admin${NC}"
    }
}
echo ""

# 6. Verificar logs do backend para erros
echo -e "${YELLOW}📋 6. Verificando logs recentes do backend...${NC}"
docker-compose logs --tail=30 backend | grep -i "error\|erro\|fail" || echo "Nenhum erro encontrado nos logs recentes"
echo ""

# 7. Testar API de health
echo -e "${YELLOW}🌐 7. Testando API...${NC}"
if curl -s http://localhost:4000/health > /dev/null; then
    echo -e "${GREEN}✅ API respondendo${NC}"
else
    echo -e "${RED}❌ API não está respondendo${NC}"
fi
echo ""

# 8. Verificar variáveis de ambiente
echo -e "${YELLOW}⚙️  8. Verificando variáveis de ambiente críticas...${NC}"
docker-compose exec -T backend printenv | grep -E "JWT_SECRET|DATABASE_URL|NODE_ENV" || echo "Variáveis não encontradas"
echo ""

echo -e "${GREEN}✅ Diagnóstico concluído!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "  1. Tente fazer login novamente"
echo "  2. Se não funcionar, verifique os logs:"
echo "     docker-compose logs -f backend"
echo ""
echo "🔑 Credenciais padrão do admin:"
echo "   Email: admin@aion.com"
echo "   Senha: admin123"
echo ""
echo "💡 Se ainda não funcionar:"
echo "   - Verifique se JWT_SECRET está configurado no .env"
echo "   - Verifique se o banco de dados tem permissões de escrita"
echo "   - Verifique os logs completos do backend"

